import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { tableSessions, bills, events, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { bus } from '@/modules/realtime/bus';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reopenSchema = z.object({
  reason: z.string().min(1, 'Reason is required to reopen billing session'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER']);
    const body = await request.json();
    const { reason } = reopenSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      // 1. Lock session
      const [session] = await tx
        .select()
        .from(tableSessions)
        .where(and(eq(tableSessions.id, sessionId), eq(tableSessions.restaurantId, auth.restaurantId)))
        .for('update');

      if (!session || session.status !== 'BILLING') {
        throw new AppError('INVALID_STATE', 'Only sessions in BILLING state can be reopened', 409);
      }

      // 2. Void DRAFT bill
      await tx
        .update(bills)
        .set({ status: 'VOID' })
        .where(and(eq(bills.sessionId, session.id), eq(bills.status, 'DRAFT')));

      // 3. Reopen session
      await tx
        .update(tableSessions)
        .set({ status: 'OPEN', lastActivityAt: new Date() })
        .where(eq(tableSessions.id, session.id));

      // 4. Write audit log
      await tx.insert(auditLogs).values({
        restaurantId: auth.restaurantId,
        actorId: auth.userId,
        action: 'REOPEN_SESSION',
        entity: 'table_sessions',
        entityId: session.id,
        before: { status: 'BILLING' },
        after: { status: 'OPEN', reason },
      });

      // 5. Emit event
      await tx.insert(events).values({
        restaurantId: auth.restaurantId,
        channel: 'front',
        type: 'session.updated',
        sessionId: session.id,
        payload: { sessionId: session.id, status: 'OPEN', reason },
      });

      return { sessionId: session.id, status: 'OPEN' };
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
