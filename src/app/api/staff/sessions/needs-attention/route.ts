import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { tableSessions, orders, tables, restaurantSettings } from '@/db/schema';
import { eq, and, sql, lt, inArray } from 'drizzle-orm';
import { formatErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER', 'WAITER']);

    const [settings] = await db
      .select({ ackWarnSeconds: restaurantSettings.ackWarnSeconds })
      .from(restaurantSettings)
      .where(eq(restaurantSettings.restaurantId, auth.restaurantId))
      .limit(1);

    const ackWarnSeconds = settings?.ackWarnSeconds || 90;

    // 1. Unacknowledged orders: PLACED > ackWarnSeconds ago
    const unacknowledgedCutoff = new Date(Date.now() - ackWarnSeconds * 1000);
    const unacknowledgedOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        tableLabel: orders.tableLabelAtOrder,
        placedAt: orders.placedAt,
        status: orders.status,
      })
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, auth.restaurantId),
          eq(orders.status, 'PLACED'),
          lt(orders.placedAt, unacknowledgedCutoff)
        )
      );

    // 2. Held orders waiting confirmation (PENDING_CONFIRMATION)
    const heldOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        tableLabel: orders.tableLabelAtOrder,
        placedAt: orders.placedAt,
        status: orders.status,
      })
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, auth.restaurantId),
          eq(orders.status, 'PENDING_CONFIRMATION')
        )
      );

    // 3. Potential walk-outs: Sessions active & idle for > 90 minutes
    const walkoutCutoff = new Date(Date.now() - 90 * 60 * 1000);
    const idleSessions = await db
      .select({
        id: tableSessions.id,
        tableLabel: tables.label,
        status: tableSessions.status,
        lastActivityAt: tableSessions.lastActivityAt,
      })
      .from(tableSessions)
      .innerJoin(tables, eq(tableSessions.tableId, tables.id))
      .where(
        and(
          eq(tableSessions.restaurantId, auth.restaurantId),
          sql`${tableSessions.status} IN ('OPEN', 'BILL_REQUESTED')`,
          lt(tableSessions.lastActivityAt, walkoutCutoff)
        )
      );

    const response = NextResponse.json({
      data: {
        unacknowledgedOrders,
        heldOrders,
        idleSessions,
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
