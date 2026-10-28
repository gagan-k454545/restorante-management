import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { tableSessions, events, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { bus } from '@/modules/realtime/bus';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const writeOffSchema = z.object({
  reason: z.string().min(1, 'Reason required for write-off'),
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
    const { reason } = writeOffSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(tableSessions)
        .where(and(eq(tableSessions.id, sessionId), eq(tableSessions.restaurantId, auth.restaurantId)))
        .for('update');

      if (!session || session.status === 'CLOSED') {
        throw new AppError('SESSION_CLOSED', 'Session is already closed or not found', 400);
      }

      await tx
        .update(tableSessions)
        .set({
          status: 'CLOSED',
          closedReason: 'WRITTEN_OFF',
          closedAt: new Date(),
          closedBy: auth.userId,
        })
        .where(eq(tableSessions.id, session.id));

      await tx.insert(auditLogs).values({
        restaurantId: auth.restaurantId,
        actorId: auth.userId,
        action: 'WRITE_OFF_SESSION',
        entity: 'table_sessions',
        entityId: session.id,
        before: { status: session.status },
        after: { status: 'CLOSED', closedReason: 'WRITTEN_OFF', reason },
      });

      await tx.insert(events).values({
        restaurantId: auth.restaurantId,
        channel: 'front',
        type: 'session.updated',
        sessionId: session.id,
        payload: {
          sessionId: session.id,
          status: 'CLOSED',
          closedReason: 'WRITTEN_OFF',
        },
      });

      return { sessionId: session.id, status: 'CLOSED', closedReason: 'WRITTEN_OFF' };
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
