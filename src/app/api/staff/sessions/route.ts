import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { tables, tableSessions, events, restaurantSettings } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { bus } from '@/modules/realtime/bus';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const seatTableSchema = z.object({
  tableId: z.string().uuid(),
  guestName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER', 'WAITER']);
    const body = await request.json();
    const { tableId, guestName } = seatTableSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      // 1. Lock table row
      const [table] = await tx
        .select()
        .from(tables)
        .where(and(eq(tables.id, tableId), eq(tables.restaurantId, auth.restaurantId)))
        .for('update');

      if (!table || !table.isEnabled || table.deletedAt) {
        throw new AppError('TABLE_DISABLED', 'Table is disabled or does not exist', 400);
      }

      // 2. Check for active session
      const [existingSession] = await tx
        .select()
        .from(tableSessions)
        .where(
          and(
            eq(tableSessions.tableId, tableId),
            sql`${tableSessions.status} IN ('OPEN', 'BILL_REQUESTED', 'BILLING')`
          )
        )
        .limit(1);

      if (existingSession) {
        throw new AppError('TABLE_OCCUPIED', 'Table already has an active session', 409);
      }

      // 3. Generate 4-digit code if TABLE_CODE mode
      const [settings] = await tx
        .select()
        .from(restaurantSettings)
        .where(eq(restaurantSettings.restaurantId, auth.restaurantId))
        .limit(1);

      let tableCode: string | undefined;
      let tableCodeHash: string | undefined;

      if (settings?.orderGuardMode === 'TABLE_CODE') {
        tableCode = Math.floor(1000 + Math.random() * 9000).toString();
        tableCodeHash = crypto.createHash('sha256').update(tableCode).digest('hex');
      }

      // 4. Create session
      const [session] = await tx
        .insert(tableSessions)
        .values({
          restaurantId: auth.restaurantId,
          tableId,
          status: 'OPEN',
          openedBy: auth.userId,
          tableCodeHash,
          guestName,
        })
        .returning();

      // 5. Write event
      await tx.insert(events).values({
        restaurantId: auth.restaurantId,
        channel: 'front',
        type: 'session.updated',
        sessionId: session.id,
        payload: {
          sessionId: session.id,
          status: 'OPEN',
          tableLabel: table.label,
        },
      });

      return {
        sessionId: session.id,
        tableLabel: table.label,
        status: session.status,
        tableCode,
      };
    });

    bus.wake();

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
