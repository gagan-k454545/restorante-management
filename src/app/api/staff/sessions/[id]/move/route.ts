import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { tables, tableSessions, events, auditLogs } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { bus } from '@/modules/realtime/bus';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const moveSchema = z.object({
  toTableId: z.string().uuid(),
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
    const { toTableId } = moveSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      // 1. Lock destination table row
      const [destTable] = await tx
        .select()
        .from(tables)
        .where(and(eq(tables.id, toTableId), eq(tables.restaurantId, auth.restaurantId)))
        .for('update');

      if (!destTable || !destTable.isEnabled || destTable.deletedAt) {
        throw new AppError('TABLE_DISABLED', 'Target table is disabled or does not exist', 400);
      }

      // Check if target table is occupied
      const [activeDestSession] = await tx
        .select()
        .from(tableSessions)
        .where(
          and(
            eq(tableSessions.tableId, toTableId),
            sql`${tableSessions.status} IN ('OPEN', 'BILL_REQUESTED', 'BILLING')`
          )
        )
        .limit(1);

      if (activeDestSession) {
        throw new AppError('TABLE_OCCUPIED', `Target table ${destTable.label} is already occupied`, 409);
      }

      // 2. Load active session to move
      const [session] = await tx
        .select()
        .from(tableSessions)
        .where(and(eq(tableSessions.id, sessionId), eq(tableSessions.restaurantId, auth.restaurantId)))
        .for('update');

      if (!session || session.status === 'CLOSED') {
        throw new AppError('SESSION_INVALID', 'Session is closed or not found', 404);
      }

      const [originTable] = await tx.select().from(tables).where(eq(tables.id, session.tableId)).limit(1);

      // 3. Move session
      await tx
        .update(tableSessions)
        .set({ tableId: toTableId, lastActivityAt: new Date() })
        .where(eq(tableSessions.id, session.id));

      // 4. Write audit log
      await tx.insert(auditLogs).values({
        restaurantId: auth.restaurantId,
        actorId: auth.userId,
        action: 'MOVE_SESSION',
        entity: 'table_sessions',
        entityId: session.id,
        before: { tableId: session.tableId, tableLabel: originTable?.label },
        after: { tableId: toTableId, tableLabel: destTable.label },
      });

      // 5. Emit events (front and kitchen)
      await tx.insert(events).values({
        restaurantId: auth.restaurantId,
        channel: 'front',
        type: 'session.updated',
        sessionId: session.id,
        payload: {
          sessionId: session.id,
          status: session.status,
          tableLabel: destTable.label,
          oldTableLabel: originTable?.label,
        },
      });

      await tx.insert(events).values({
        restaurantId: auth.restaurantId,
        channel: 'kitchen',
        type: 'session.updated',
        sessionId: session.id,
        payload: {
          sessionId: session.id,
          tableLabel: destTable.label,
        },
      });

      return {
        sessionId: session.id,
        oldTableLabel: originTable?.label,
        newTableLabel: destTable.label,
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
