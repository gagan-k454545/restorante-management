import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { placeOrderSchema } from '@/modules/orders/orders.schema';
import { placeOrder } from '@/modules/orders/orders.service';
import { db } from '@/db/client';
import { tableSessions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const staffOrderSchema = placeOrderSchema.extend({
  sessionId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER', 'WAITER']);
    const idempotencyKey = request.headers.get('idempotency-key') || crypto.randomUUID();

    const body = await request.json();
    const { sessionId, ...orderInput } = staffOrderSchema.parse(body);

    const [session] = await db
      .select()
      .from(tableSessions)
      .where(and(eq(tableSessions.id, sessionId), eq(tableSessions.restaurantId, auth.restaurantId)))
      .limit(1);

    if (!session || session.status === 'CLOSED') {
      throw new AppError('SESSION_INVALID', 'Session not found or already closed', 400);
    }

    const result = await placeOrder(orderInput, {
      deviceId: `staff-${auth.userId}`,
      tableId: session.tableId,
      restaurantId: auth.restaurantId,
      idempotencyKey,
      source: 'STAFF',
      staffUserId: auth.userId,
    });

    const response = NextResponse.json({ data: result }, { status: 201 });
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
