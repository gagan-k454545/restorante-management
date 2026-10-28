import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireGuestContext } from '@/modules/auth/guest-guard';
import { db } from '@/db/client';
import { tableSessions, calls, events } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { checkRateLimit, waiterCallLimiter, billRequestLimiter } from '@/lib/rate-limit';
import { bus } from '@/modules/realtime/bus';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const callSchema = z.object({
  type: z.enum(['WAITER', 'BILL']),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const guest = await requireGuestContext();
    const body = await request.json();
    const { type } = callSchema.parse(body);

    // Rate limits: 1 per 2 minutes per session/device for WAITER and BILL separately
    const limiter = type === 'WAITER' ? waiterCallLimiter : billRequestLimiter;
    const rateLimitKey = `${guest.tableId}:${type}`;
    await checkRateLimit(limiter, rateLimitKey, `Please wait 2 minutes before requesting ${type.toLowerCase()} again.`);

    const callResult = await db.transaction(async (tx) => {
      // Find or create session
      let [session] = await tx
        .select()
        .from(tableSessions)
        .where(
          and(
            eq(tableSessions.tableId, guest.tableId),
            sql`${tableSessions.status} IN ('OPEN', 'BILL_REQUESTED', 'BILLING')`
          )
        )
        .limit(1);

      if (!session) {
        const [newSession] = await tx
          .insert(tableSessions)
          .values({
            restaurantId: guest.restaurantId,
            tableId: guest.tableId,
            status: 'OPEN',
            openedBy: 'CUSTOMER',
          })
          .returning();
        session = newSession;
      }

      if (type === 'BILL' && session.status === 'OPEN') {
        await tx
          .update(tableSessions)
          .set({ status: 'BILL_REQUESTED', billRequestedAt: new Date() })
          .where(eq(tableSessions.id, session.id));
      }

      const [callRow] = await tx
        .insert(calls)
        .values({
          restaurantId: guest.restaurantId,
          sessionId: session.id,
          type,
          status: 'OPEN',
        })
        .returning();

      // Write event
      await tx.insert(events).values({
        restaurantId: guest.restaurantId,
        channel: 'front',
        type: 'call.created',
        sessionId: session.id,
        payload: {
          callId: callRow.id,
          type,
          tableLabel: guest.tableLabel,
          sessionId: session.id,
        },
      });

      return {
        id: callRow.id,
        type: callRow.type,
        status: callRow.status,
        tableLabel: guest.tableLabel,
      };
    });

    bus.wake();

    const response = NextResponse.json({ data: callResult });
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
