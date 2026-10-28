import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import {
  tables,
  tableSessions,
  restaurants,
  orders,
  orderLines,
  bills,
  billLines,
  billTaxLines,
  events,
  auditLogs,
  restaurantSettings,
} from '@/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { calculatePricing, PricingLineItem, PricingSettings } from '@/lib/pricing';
import { bus } from '@/modules/realtime/bus';
import { formatErrorResponse, AppError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER', 'CASHIER']);

    const preparedBill = await db.transaction(async (tx) => {
      // 1. Load session and lock table row
      const [session] = await tx
        .select()
        .from(tableSessions)
        .where(and(eq(tableSessions.id, sessionId), eq(tableSessions.restaurantId, auth.restaurantId)))
        .limit(1);

      if (!session) {
        throw new AppError('SESSION_NOT_FOUND', 'Session not found', 404);
      }

      if (session.status !== 'OPEN' && session.status !== 'BILL_REQUESTED') {
        throw new AppError('INVALID_STATE', `Session is in ${session.status} state, cannot prepare bill`, 409);
      }

      // Lock table row
      await tx
        .select()
        .from(tables)
        .where(eq(tables.id, session.tableId))
        .for('update');

      // 2. Check for any PENDING_CONFIRMATION orders
      const pendingOrders = await tx
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.sessionId, session.id),
            eq(orders.status, 'PENDING_CONFIRMATION')
          )
        );

      if (pendingOrders.length > 0) {
        throw new AppError(
          'PENDING_ORDERS',
          'All pending orders must be confirmed or rejected before preparing bill',
          409
        );
      }

      // 3. Load restaurant settings
      const [settings] = await tx
        .select({
          taxScheme: restaurants.taxScheme,
          priceMode: restaurantSettings.priceMode,
          defaultTaxRateBp: restaurantSettings.defaultTaxRateBp,
          serviceChargeBp: restaurantSettings.serviceChargeBp,
          serviceChargeTaxable: restaurantSettings.serviceChargeTaxable,
          roundOffEnabled: restaurantSettings.roundOffEnabled,
        })
        .from(restaurantSettings)
        .innerJoin(restaurants, eq(restaurantSettings.restaurantId, restaurants.id))
        .where(eq(restaurantSettings.restaurantId, auth.restaurantId))
        .limit(1);

      if (!settings) throw new AppError('CONFIG_ERROR', 'Settings not found', 500);

      // 4. Collect all billable lines
      const sessionOrders = await tx
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.sessionId, session.id),
            inArray(orders.status, ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'])
          )
        );

      const sessionOrderIds = sessionOrders.map((o) => o.id);
      const activeLines = sessionOrderIds.length > 0
        ? await tx
            .select()
            .from(orderLines)
            .where(
              and(
                inArray(orderLines.orderId, sessionOrderIds),
                eq(orderLines.status, 'ACTIVE')
              )
            )
        : [];

      const pricingLines: PricingLineItem[] = activeLines.map((l) => ({
        lineTotal: l.lineTotal,
        taxRateBp: l.taxRateBp,
      }));

      const pricingSettings: PricingSettings = {
        taxScheme: settings.taxScheme as 'REGULAR' | 'COMPOSITION',
        priceMode: settings.priceMode as 'EXCLUSIVE' | 'INCLUSIVE',
        serviceChargeBp: settings.serviceChargeBp,
        serviceChargeTaxable: settings.serviceChargeTaxable,
        roundOffEnabled: settings.roundOffEnabled,
      };

      const calculated = calculatePricing(pricingLines, pricingSettings);

      // 5. Insert Bill as DRAFT
      const [bill] = await tx
        .insert(bills)
        .values({
          restaurantId: auth.restaurantId,
          sessionId: session.id,
          status: 'DRAFT',
          subtotal: calculated.subtotal,
          discount: calculated.discount,
          serviceCharge: calculated.serviceCharge,
          taxableTotal: calculated.taxableTotal,
          cgstTotal: calculated.cgstTotal,
          sgstTotal: calculated.sgstTotal,
          roundOff: calculated.roundOff,
          total: calculated.total,
          paidTotal: 0,
          priceMode: settings.priceMode,
          taxScheme: settings.taxScheme,
        })
        .returning();

      // Insert bill lines
      for (const line of activeLines) {
        await tx.insert(billLines).values({
          billId: bill.id,
          orderLineId: line.id,
          name: line.name,
          qty: line.qty,
          lineTotal: line.lineTotal,
          taxRateBp: line.taxRateBp,
          sacCode: line.sacCode,
        });
      }

      // Insert tax lines
      for (const tLine of calculated.taxLines) {
        await tx.insert(billTaxLines).values({
          billId: bill.id,
          taxRateBp: tLine.taxRateBp,
          taxableValue: tLine.taxableValue,
          cgst: tLine.cgst,
          sgst: tLine.sgst,
        });
      }

      // 6. Transition session status to BILLING
      await tx
        .update(tableSessions)
        .set({ status: 'BILLING' })
        .where(eq(tableSessions.id, session.id));

      // 7. Write audit log
      await tx.insert(auditLogs).values({
        restaurantId: auth.restaurantId,
        actorId: auth.userId,
        action: 'PREPARE_BILL',
        entity: 'bills',
        entityId: bill.id,
        after: { total: calculated.total, subtotal: calculated.subtotal },
      });

      // 8. Write event row
      await tx.insert(events).values({
        restaurantId: auth.restaurantId,
        channel: 'front',
        type: 'session.updated',
        sessionId: session.id,
        payload: {
          sessionId: session.id,
          status: 'BILLING',
          billId: bill.id,
          total: calculated.total,
        },
      });

      return {
        id: bill.id,
        sessionId: session.id,
        status: bill.status,
        subtotal: calculated.subtotal,
        serviceCharge: calculated.serviceCharge,
        taxableTotal: calculated.taxableTotal,
        cgstTotal: calculated.cgstTotal,
        sgstTotal: calculated.sgstTotal,
        roundOff: calculated.roundOff,
        total: calculated.total,
      };
    });

    bus.wake();

    const response = NextResponse.json({ data: preparedBill });
    response.headers.set('X-Request-Id', requestId);
    response.headers.set('X-Server-Time', serverNow.toString());
    return response;
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    const response = NextResponse.json(body, { status });
    response.headers.set('X-Request-Id', requestId);
    response.headers.set('X-Server-Time', serverNow.toString());
    return response;
  }
}
