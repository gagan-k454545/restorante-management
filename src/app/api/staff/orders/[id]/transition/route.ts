import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { orders, orderHistory, events, sessionDevices, tables } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { canTransitionOrder, OrderStatus } from '@/lib/state-machine';
import { bus } from '@/modules/realtime/bus';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const transitionSchema = z.object({
  to: z.enum([
    'PENDING_CONFIRMATION',
    'PLACED',
    'ACCEPTED',
    'PREPARING',
    'READY',
    'SERVED',
    'REJECTED',
    'CANCELLED',
  ]),
  reason: z.string().optional(),
  version: z.number().int().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER', 'KITCHEN', 'WAITER']);
    const body = await request.json();
    const { to, reason, version } = transitionSchema.parse(body);

    const updatedOrder = await db.transaction(async (tx) => {
      // 1. Lock order row for update
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.restaurantId, auth.restaurantId)))
        .for('update');

      if (!order) {
        throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
      }

      // 2. Version check (optimistic concurrency)
      if (order.version !== version) {
        throw new AppError(
          'CONFLICT',
          'Order was updated by someone else. Please refresh.',
          409,
          { currentVersion: order.version }
        );
      }

      // 3. Validate state machine transition
      const validation = canTransitionOrder(order.status as OrderStatus, to as OrderStatus, {
        actorType: 'STAFF',
        role: auth.role,
        reason,
      });

      if (!validation.allowed) {
        throw new AppError(
          validation.errorCode || 'INVALID_TRANSITION',
          validation.errorMessage || 'Invalid status transition',
          409
        );
      }

      // If transition from PENDING_CONFIRMATION to PLACED, verify device on session
      if (order.status === 'PENDING_CONFIRMATION' && to === 'PLACED') {
        await tx
          .update(sessionDevices)
          .set({
            verifiedAt: new Date(),
            verifiedBy: auth.userId,
          })
          .where(
            and(
              eq(sessionDevices.sessionId, order.sessionId),
              eq(sessionDevices.deviceId, order.deviceId)
            )
          );
      }

      const updateFields: Record<string, unknown> = {
        status: to,
        version: order.version + 1,
      };

      if (to === 'ACCEPTED' && !order.acceptedAt) updateFields.acceptedAt = new Date();
      if (to === 'READY' && !order.readyAt) updateFields.readyAt = new Date();
      if (to === 'SERVED' && !order.servedAt) updateFields.servedAt = new Date();
      if (to === 'REJECTED') updateFields.rejectionReason = reason;

      const [saved] = await tx
        .update(orders)
        .set(updateFields)
        .where(eq(orders.id, order.id))
        .returning();

      // Write order history row
      await tx.insert(orderHistory).values({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: to,
        actorType: 'STAFF',
        actorId: auth.userId,
        reason: reason || null,
      });

      // Write event rows
      // Kitchen channel: receives order.created when first placed, order.updated on subsequent
      const eventType = order.status === 'PENDING_CONFIRMATION' && to === 'PLACED' ? 'order.created' : 'order.updated';

      await tx.insert(events).values({
        restaurantId: auth.restaurantId,
        channel: 'kitchen',
        type: eventType,
        sessionId: order.sessionId,
        payload: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: to,
          version: saved.version,
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
          orderNumber: order.orderNumber,
          status: to,
          version: saved.version,
          tableLabel: order.tableLabelAtOrder,
        },
      });

      return saved;
    });

    // Wake realtime poller after commit
    bus.wake();

    const response = NextResponse.json({
      data: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        version: updatedOrder.version,
      },
    });

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
