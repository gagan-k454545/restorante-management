import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { calls, events } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { bus } from '@/modules/realtime/bus';
import { formatErrorResponse, AppError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: callId } = await params;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER', 'WAITER', 'CASHIER']);

    const [updatedCall] = await db
      .update(calls)
      .set({
        status: 'DONE',
        handledBy: auth.userId,
        handledAt: new Date(),
      })
      .where(and(eq(calls.id, callId), eq(calls.restaurantId, auth.restaurantId)))
      .returning();

    if (!updatedCall) {
      throw new AppError('CALL_NOT_FOUND', 'Call not found', 404);
    }

    await db.insert(events).values({
      restaurantId: auth.restaurantId,
      channel: 'front',
      type: 'call.updated',
      sessionId: updatedCall.sessionId,
      payload: { callId: updatedCall.id, status: 'DONE' },
    });

    bus.wake();

    const response = NextResponse.json({ data: updatedCall });
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
