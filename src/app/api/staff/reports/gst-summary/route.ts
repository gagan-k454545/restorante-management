import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { bills, billTaxLines, restaurants } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { formatErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER']);

    const [restaurant] = await db
      .select({
        gstin: restaurants.gstin,
        legalName: restaurants.legalName,
        taxScheme: restaurants.taxScheme,
      })
      .from(restaurants)
      .where(eq(restaurants.id, auth.restaurantId))
      .limit(1);

    const taxSummary = await db
      .select({
        taxRateBp: billTaxLines.taxRateBp,
        taxableValue: sql<number>`coalesce(sum(${billTaxLines.taxableValue}), 0)`,
        cgst: sql<number>`coalesce(sum(${billTaxLines.cgst}), 0)`,
        sgst: sql<number>`coalesce(sum(${billTaxLines.sgst}), 0)`,
      })
      .from(billTaxLines)
      .innerJoin(bills, eq(billTaxLines.billId, bills.id))
      .where(and(eq(bills.restaurantId, auth.restaurantId), eq(bills.status, 'PAID')))
      .groupBy(billTaxLines.taxRateBp);

    const response = NextResponse.json({
      data: {
        gstin: restaurant?.gstin || 'Unregistered',
        legalName: restaurant?.legalName,
        taxScheme: restaurant?.taxScheme,
        rates: taxSummary.map((t) => ({
          taxRatePercent: (t.taxRateBp / 100).toFixed(1) + '%',
          taxRateBp: t.taxRateBp,
          taxableValuePaise: Number(t.taxableValue),
          cgstPaise: Number(t.cgst),
          sgstPaise: Number(t.sgst),
          totalTaxPaise: Number(t.cgst) + Number(t.sgst),
        })),
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
