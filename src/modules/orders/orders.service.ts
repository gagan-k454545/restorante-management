import { db } from '@/db/client';
import {
  tables,
  tableSessions,
  sessionDevices,
  orders,
  orderLines,
  orderHistory,
  events,
  idempotencyKeys,
  counters,
  menuItems,
  menuItemVariants,
  modifierOptions,
  categories,
  restaurantSettings,
} from '@/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { PlaceOrderInput } from './orders.schema';
import { calculatePricing, PricingLineItem, PricingSettings } from '@/lib/pricing';
import { getBusinessDate, formatOrderNumber } from '@/lib/business-date';
import { calculateEtaMinutes } from '@/lib/eta';
import { bus } from '@/modules/realtime/bus';
import { AppError } from '@/lib/errors';
import { hashRequestBody } from '@/lib/idempotency';

export interface PlaceOrderContext {
  deviceId: string;
  tableId: string;
  restaurantId: string;
  idempotencyKey: string;
  source?: 'CUSTOMER' | 'STAFF';
  staffUserId?: string;
}

export async function placeOrder(input: PlaceOrderInput, ctx: PlaceOrderContext) {
  const requestHash = hashRequestBody(input);

  // Run all operations inside one database transaction with table lock
  return await db.transaction(async (tx) => {
    // 1. Lock table row: SELECT ... FROM tables WHERE id = $1 FOR UPDATE
    const [table] = await tx
      .select()
      .from(tables)
      .where(and(eq(tables.id, ctx.tableId), eq(tables.restaurantId, ctx.restaurantId)))
      .for('update');

    if (!table || !table.isEnabled || table.deletedAt) {
      throw new AppError('TABLE_DISABLED', 'Table is disabled or does not exist', 400);
    }

    // 2. Load restaurant settings
    const [settings] = await tx
      .select()
      .from(restaurantSettings)
      .where(eq(restaurantSettings.restaurantId, ctx.restaurantId))
      .limit(1);

    if (!settings) {
      throw new AppError('CONFIG_ERROR', 'Restaurant settings not found', 500);
    }

    if (settings.orderingPausedUntil && new Date() < new Date(settings.orderingPausedUntil)) {
      throw new AppError('ORDERING_PAUSED', settings.pauseMessage || 'Ordering is paused', 400);
    }

    // 3. Check idempotency key for this device/user
    const scopeType = ctx.source === 'STAFF' ? 'USER' : 'DEVICE';
    const scopeId = ctx.source === 'STAFF' ? (ctx.staffUserId || 'staff') : ctx.deviceId;

    const [existingIdem] = await tx
      .select()
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.scopeType, scopeType),
          eq(idempotencyKeys.scopeId, scopeId),
          eq(idempotencyKeys.key, ctx.idempotencyKey)
        )
      )
      .limit(1);

    if (existingIdem) {
      if (existingIdem.requestHash === requestHash) {
        return {
          ...(existingIdem.response as Record<string, unknown>),
          _isIdempotentReplay: true,
        };
      } else {
        throw new AppError('IDEMPOTENCY_KEY_REUSED', 'Idempotency key reused with different request payload', 422);
      }
    }

    // 4. Find or create live table session
    let [session] = await tx
      .select()
      .from(tableSessions)
      .where(
        and(
          eq(tableSessions.tableId, ctx.tableId),
          sql`${tableSessions.status} IN ('OPEN', 'BILL_REQUESTED', 'BILLING')`
        )
      )
      .limit(1);

    if (session) {
      if (session.status === 'BILLING') {
        throw new AppError(
          'SESSION_LOCKED',
          'Your bill is being prepared. Please ask staff to add more items.',
          409
        );
      }
    } else {
      if (settings.orderGuardMode === 'TABLE_CODE' && ctx.source !== 'STAFF') {
        throw new AppError('TABLE_NOT_OPEN', 'Table must be seated by staff first.', 400);
      }

      const [newSession] = await tx
        .insert(tableSessions)
        .values({
          restaurantId: ctx.restaurantId,
          tableId: ctx.tableId,
          status: 'OPEN',
          openedBy: ctx.source === 'STAFF' ? (ctx.staffUserId || 'STAFF') : 'CUSTOMER',
          guestName: input.guestName,
        })
        .returning();
      session = newSession;
    }

    // 5. Register or load session device
    let isDeviceVerified = false;
    let [sDevice] = await tx
      .select()
      .from(sessionDevices)
      .where(and(eq(sessionDevices.sessionId, session.id), eq(sessionDevices.deviceId, ctx.deviceId)))
      .limit(1);

    if (sDevice) {
      if (sDevice.blockedAt) {
        throw new AppError('DEVICE_BLOCKED', 'This device has been blocked by staff.', 403);
      }
      isDeviceVerified = !!sDevice.verifiedAt;
    } else {
      // First order of device
      if (settings.orderGuardMode === 'OPEN' || ctx.source === 'STAFF') {
        isDeviceVerified = true;
      }

      const [insertedDev] = await tx
        .insert(sessionDevices)
        .values({
          sessionId: session.id,
          deviceId: ctx.deviceId,
          label: 'Guest',
          verifiedAt: isDeviceVerified ? new Date() : null,
        })
        .returning();
      sDevice = insertedDev;
    }

    // Determine initial order status
    let initialStatus: 'PENDING_CONFIRMATION' | 'PLACED' | 'ACCEPTED' = 'PLACED';
    if (settings.orderGuardMode === 'CONFIRM_NEW_DEVICE' && !isDeviceVerified && ctx.source !== 'STAFF') {
      initialStatus = 'PENDING_CONFIRMATION';
    }

    // 6. Validate items, variants, modifiers & availability
    const itemIds = input.items.map((it) => it.itemId);
    const dbItems = await tx
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.restaurantId, ctx.restaurantId), inArray(menuItems.id, itemIds)));

    const itemMap = new Map(dbItems.map((i) => [i.id, i]));

    const pricingLines: PricingLineItem[] = [];
    const prepTimes: number[] = [];
    const resolvedOrderLines = [];

    let calculatedSubtotal = 0;

    for (const itemInput of input.items) {
      const dbItem = itemMap.get(itemInput.itemId);
      if (!dbItem || dbItem.deletedAt) {
        throw new AppError('ITEM_UNAVAILABLE', `Item not found`, 400);
      }
      if (dbItem.availability === 'OFF' || dbItem.availability === 'SOLD_OUT_TODAY') {
        throw new AppError('ITEM_UNAVAILABLE', `Item ${dbItem.name} is unavailable`, 400);
      }

      let unitPrice = dbItem.basePrice;
      let variantName: string | undefined;

      if (itemInput.variantId) {
        const [variant] = await tx
          .select()
          .from(menuItemVariants)
          .where(and(eq(menuItemVariants.id, itemInput.variantId), eq(menuItemVariants.itemId, dbItem.id)))
          .limit(1);
        if (!variant || !variant.isAvailable) {
          throw new AppError('ITEM_UNAVAILABLE', `Selected variant for ${dbItem.name} is unavailable`, 400);
        }
        unitPrice = variant.price;
        variantName = variant.name;
      }

      // Modifiers
      const modifierSnapshots: { name: string; price_delta: number }[] = [];
      if (itemInput.modifierOptionIds.length > 0) {
        const options = await tx
          .select()
          .from(modifierOptions)
          .where(inArray(modifierOptions.id, itemInput.modifierOptionIds));
        for (const opt of options) {
          if (!opt.isAvailable) {
            throw new AppError('ITEM_UNAVAILABLE', `Option ${opt.name} is unavailable`, 400);
          }
          unitPrice += opt.priceDelta;
          modifierSnapshots.push({ name: opt.name, price_delta: opt.priceDelta });
        }
      }

      const lineTotal = unitPrice * itemInput.qty;
      calculatedSubtotal += lineTotal;
      prepTimes.push(dbItem.prepTimeMinutes);

      pricingLines.push({
        lineTotal,
        taxRateBp: dbItem.taxRateBp ?? settings.defaultTaxRateBp,
      });

      resolvedOrderLines.push({
        itemId: dbItem.id,
        name: dbItem.name,
        variantName,
        modifiers: modifierSnapshots,
        unitPrice,
        qty: itemInput.qty,
        lineTotal,
        taxRateBp: dbItem.taxRateBp ?? settings.defaultTaxRateBp,
        sacCode: dbItem.sacCode,
        note: itemInput.note,
        isAllergyNote: itemInput.isAllergyNote,
      });
    }

    // 7. Verify expectedSubtotal if sent
    if (input.expectedSubtotal !== undefined && input.expectedSubtotal !== calculatedSubtotal) {
      throw new AppError(
        'PRICE_CHANGED',
        'Prices have updated since your cart was quoted. Please confirm the new total.',
        409,
        { calculatedSubtotal }
      );
    }

    // 8. Atomic daily limit update
    for (const itemInput of input.items) {
      const dbItem = itemMap.get(itemInput.itemId);
      if (dbItem?.dailyLimit !== null && dbItem?.dailyLimit !== undefined) {
        const updateRes = await tx
          .update(menuItems)
          .set({ soldToday: sql`${menuItems.soldToday} + ${itemInput.qty}` })
          .where(
            and(
              eq(menuItems.id, itemInput.itemId),
              sql`(${menuItems.dailyLimit} IS NULL OR ${menuItems.soldToday} + ${itemInput.qty} <= ${menuItems.dailyLimit})`
            )
          );

        if (updateRes.count === 0) {
          throw new AppError('LIMIT_REACHED', `Item ${dbItem.name} has reached its daily limit`, 409);
        }
      }
    }

    // 9. Sequential order number from counters
    const businessDate = getBusinessDate(new Date(), settings.openingHours ? 'Asia/Kolkata' : 'Asia/Kolkata');
    const counterKey = `order:${businessDate}`;

    const [counterRow] = await tx
      .insert(counters)
      .values({ restaurantId: ctx.restaurantId, key: counterKey, value: 1 })
      .onConflictDoUpdate({
        target: [counters.restaurantId, counters.key],
        set: { value: sql`${counters.value} + 1` },
      })
      .returning();

    const orderNumber = counterRow.value;

    // Count session round number
    const existingOrdersCount = await tx
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.sessionId, session.id));
    const roundNo = Number(existingOrdersCount[0]?.count || 0) + 1;

    // 10. Compute ETA
    const activeTicketsCount = await tx
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, ctx.restaurantId),
          sql`${orders.status} IN ('PLACED', 'ACCEPTED', 'PREPARING')`
        )
      );

    const etaMinutes = calculateEtaMinutes({
      linePrepTimes: prepTimes,
      activeTickets: Number(activeTicketsCount[0]?.count || 0),
      kitchenCapacityTickets: settings.kitchenCapacityTickets,
      minutesPerExtraTicket: settings.minutesPerExtraTicket,
      extraDelayMinutes: settings.extraDelayMinutes,
    });

    // 11. Insert Order
    const [insertedOrder] = await tx
      .insert(orders)
      .values({
        restaurantId: ctx.restaurantId,
        sessionId: session.id,
        deviceId: ctx.deviceId,
        tableId: ctx.tableId,
        tableLabelAtOrder: table.label,
        businessDate,
        orderNumber,
        roundNo,
        status: initialStatus,
        version: 1,
        source: ctx.source || 'CUSTOMER',
        placedByUserId: ctx.staffUserId,
        note: input.orderNote,
        subtotal: calculatedSubtotal,
        etaMinutes,
      })
      .returning();

    // Insert order lines
    for (const rLine of resolvedOrderLines) {
      await tx.insert(orderLines).values({
        orderId: insertedOrder.id,
        itemId: rLine.itemId,
        name: rLine.name,
        variantName: rLine.variantName,
        modifiers: rLine.modifiers,
        unitPrice: rLine.unitPrice,
        qty: rLine.qty,
        lineTotal: rLine.lineTotal,
        taxRateBp: rLine.taxRateBp,
        sacCode: rLine.sacCode,
        note: rLine.note,
        isAllergyNote: rLine.isAllergyNote,
      });
    }

    // Insert order history
    await tx.insert(orderHistory).values({
      orderId: insertedOrder.id,
      fromStatus: 'NONE',
      toStatus: initialStatus,
      actorType: ctx.source === 'STAFF' ? 'STAFF' : 'CUSTOMER',
      actorId: ctx.source === 'STAFF' ? ctx.staffUserId : ctx.deviceId,
      reason: 'Order placed',
    });

    // Update session last activity
    await tx
      .update(tableSessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(tableSessions.id, session.id));

    // 12. Write Event rows (Outbox pattern)
    // Channel front receives immediately
    await tx.insert(events).values({
      restaurantId: ctx.restaurantId,
      channel: 'front',
      type: 'order.created',
      sessionId: session.id,
      payload: {
        orderId: insertedOrder.id,
        orderNumber,
        status: initialStatus,
        sessionId: session.id,
        tableLabel: table.label,
      },
    });

    // If order is PLACED directly, kitchen also receives
    if (initialStatus === 'PLACED') {
      await tx.insert(events).values({
        restaurantId: ctx.restaurantId,
        channel: 'kitchen',
        type: 'order.created',
        sessionId: session.id,
        payload: {
          orderId: insertedOrder.id,
          orderNumber,
          status: initialStatus,
          tableLabel: table.label,
        },
      });
    }

    // Prepare response payload
    const responsePayload = {
      id: insertedOrder.id,
      orderNumber,
      displayNumber: formatOrderNumber(orderNumber),
      roundNo,
      status: initialStatus,
      etaMinutes,
      subtotal: calculatedSubtotal,
      version: 1,
      deviceVerified: isDeviceVerified,
    };

    // Store idempotency key response
    await tx.insert(idempotencyKeys).values({
      scopeType,
      scopeId,
      key: ctx.idempotencyKey,
      requestHash,
      response: responsePayload,
    });

    return responsePayload;
  }).then((res) => {
    // 13. Call bus.wake() strictly AFTER transaction commit
    bus.wake();
    return res;
  });
}
