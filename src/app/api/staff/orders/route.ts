import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { orders, orderLines } from '@/db/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { formatErrorResponse } from '@/lib/errors';
import { formatOrderNumber } from '@/lib/business-date';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER', 'KITCHEN', 'WAITER', 'CASHIER']);

    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get('status');
    const changedSince = searchParams.get('changedSince');

    let query = db
      .select()
      .from(orders)
      .where(eq(orders.restaurantId, auth.restaurantId))
      .orderBy(desc(orders.placedAt))
      .$dynamic();

    if (statusParam) {
      const statuses = statusParam.split(',');
      query = query.where(and(eq(orders.restaurantId, auth.restaurantId), inArray(orders.status, statuses)));
    }

    const orderRows = await query.limit(100);
    const orderIds = orderRows.map((o) => o.id);

    const lines = orderIds.length > 0
      ? await db.select().from(orderLines).where(inArray(orderLines.orderId, orderIds))
      : [];

    const linesByOrder = new Map<string, typeof lines>();
    for (const line of lines) {
      const list = linesByOrder.get(line.orderId) || [];
      list.push(line);
      linesByOrder.set(line.orderId, list);
    }

    const payload = orderRows.map((o) => ({
      id: o.id,
      sessionId: o.sessionId,
      orderNumber: o.orderNumber,
      displayNumber: formatOrderNumber(o.orderNumber),
      tableLabel: o.tableLabelAtOrder,
      status: o.status,
      roundNo: o.roundNo,
      version: o.version,
      subtotal: o.subtotal,
      note: o.note,
      placedAt: o.placedAt,
      acceptedAt: o.acceptedAt,
      readyAt: o.readyAt,
      servedAt: o.servedAt,
      etaMinutes: o.etaMinutes,
      lines: (linesByOrder.get(o.id) || []).map((l) => ({
        id: l.id,
        name: l.name,
        variantName: l.variantName,
        modifiers: l.modifiers,
        unitPrice: l.unitPrice,
        qty: l.qty,
        lineTotal: l.lineTotal,
        note: l.note,
        isAllergyNote: l.isAllergyNote,
        status: l.status,
        voidReason: l.voidReason,
      })),
    }));

    const response = NextResponse.json({ data: payload });
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
