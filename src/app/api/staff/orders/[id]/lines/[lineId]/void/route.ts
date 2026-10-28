import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { orders, orderLines, orderHistory, events, menuItems } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { bus } from '@/modules/realtime/bus';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const voidLineSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  markItemSoldOut: z.boolean().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const { id: orderId, lineId } = await params;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER', 'KITCHEN']);
    const body = await request.json();
    const { reason, markItemSoldOut } = voidLineSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      // 1. Lock order row
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.restaurantId, auth.restaurantId)))
        .for('update');

      if (!order) {
        throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
      }

      // 2. Load line
      const [line] = await tx
        .select()
        .from(orderLines)
        .where(and(eq(orderLines.id, lineId), eq(orderLines.orderId, order.id)))
        .limit(1);

      if (!line || line.status === 'VOID') {
        throw new AppError('LINE_ALREADY_VOID', 'Order line not found or already void', 400);
      }

      // 3. Mark line VOID
      await tx
        .update(orderLines)
        .set({
          status: 'VOID',
          voidReason: reason,
        })
        .where(eq(orderLines.id, line.id));

      // 4. Mark item as SOLD_OUT_TODAY if requested
      if (markItemSoldOut) {
        await tx
          .update(menuItems)
          .set({ availability: 'SOLD_OUT_TODAY' })
          .where(eq(menuItems.id, line.itemId));

        await tx.insert(events).values({
          restaurantId: auth.restaurantId,
          channel: 'menu',
          type: 'menu.updated',
          payload: { itemId: line.itemId, availability: 'SOLD_OUT_TODAY' },
        });
      }

      // 5. Check remaining active lines in this order
      const remainingActiveLines = await tx
        .select()
        .from(orderLines)
        .where(and(eq(orderLines.orderId, order.id), eq(orderLines.status, 'ACTIVE')));

      const newSubtotal = remainingActiveLines.reduce((acc, l) => acc + l.lineTotal, 0);

      let newStatus = order.status;
      if (remainingActiveLines.length === 0) {
        newStatus = 'REJECTED';
      }

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          subtotal: newSubtotal,
          status: newStatus,
          rejectionReason: remainingActiveLines.length === 0 ? `All lines voided: ${reason}` : order.rejectionReason,
          version: order.version + 1,
        })
        .where(eq(orders.id, order.id))
        .returning();

      // Write history
      await tx.insert(orderHistory).values({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: newStatus,
        actorType: 'STAFF',
        actorId: auth.userId,
        reason: `Line voided (${line.name}): ${reason}`,
      });

      // Write event
      await tx.insert(events).values({
        restaurantId: auth.restaurantId,
        channel: 'kitchen',
        type: 'order.updated',
        sessionId: order.sessionId,
        payload: {
          orderId: order.id,
          status: newStatus,
          version: updatedOrder.version,
          tableLabel: order.tableLabelAtOrder,
        },
      });

      await tx.insert(events).values({
        restaurantId: auth.restaurantId,
        channel: 'front',
        type: 'order.updated',
        sessionId: order.sessionId,
        payload: {
          orderId: order.id,
          status: newStatus,
          version: updatedOrder.version,
          tableLabel: order.tableLabelAtOrder,
        },
      });

      return {
        orderId: updatedOrder.id,
        status: newStatus,
        subtotal: newSubtotal,
        version: updatedOrder.version,
      };
    });

    bus.wake();

    const response = NextResponse.json({ data: result });
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
