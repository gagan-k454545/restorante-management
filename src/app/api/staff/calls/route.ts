import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { calls, tableSessions, tables } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { formatErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER', 'WAITER', 'CASHIER']);

    const callRows = await db
      .select({
        id: calls.id,
        sessionId: calls.sessionId,
        type: calls.type,
        status: calls.status,
        createdAt: calls.createdAt,
        tableLabel: tables.label,
      })
      .from(calls)
      .innerJoin(tableSessions, eq(calls.sessionId, tableSessions.id))
      .innerJoin(tables, eq(tableSessions.tableId, tables.id))
      .where(and(eq(calls.restaurantId, auth.restaurantId), eq(calls.status, 'OPEN')))
      .orderBy(desc(calls.createdAt));

    const response = NextResponse.json({ data: callRows });
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
