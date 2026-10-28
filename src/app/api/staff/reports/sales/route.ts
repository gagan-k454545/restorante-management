import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { bills, payments, creditNotes, tableSessions } from '@/db/schema';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { getBusinessDate } from '@/lib/business-date';
import { formatErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER', 'CASHIER']);

    // Cashier sees only own payments today
    if (auth.role === 'CASHIER') {
      const today = getBusinessDate(new Date());
      const ownPayments = await db
        .select({
          totalAmount: sql<number>`coalesce(sum(${payments.amount}), 0)`,
          paymentCount: sql<number>`count(*)`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.takenBy, auth.userId),
            eq(payments.kind, 'PAYMENT')
          )
        );

      const response = NextResponse.json({
        data: {
          role: 'CASHIER',
          businessDate: today,
          myCollectionPaise: Number(ownPayments[0]?.totalAmount || 0),
          paymentCount: Number(ownPayments[0]?.paymentCount || 0),
        },
      });
      response.headers.set('X-Request-Id', requestId);
      response.headers.set('X-Server-Time', serverNow.toString());
      return response;
    }

    // Manager / Owner full report
    // 1. Paid Bills
    const paidBills = await db
      .select({
        taxableTotal: sql<number>`coalesce(sum(${bills.taxableTotal}), 0)`,
        cgstTotal: sql<number>`coalesce(sum(${bills.cgstTotal}), 0)`,
        sgstTotal: sql<number>`coalesce(sum(${bills.sgstTotal}), 0)`,
        serviceChargeTotal: sql<number>`coalesce(sum(${bills.serviceCharge}), 0)`,
        invoiceCount: sql<number>`count(*)`,
      })
      .from(bills)
      .where(and(eq(bills.restaurantId, auth.restaurantId), eq(bills.status, 'PAID')));

    // 2. Credit Notes
    const cNotes = await db
      .select({
        taxableTotal: sql<number>`coalesce(sum(${creditNotes.taxableValue}), 0)`,
        cgstTotal: sql<number>`coalesce(sum(${creditNotes.cgst}), 0)`,
        sgstTotal: sql<number>`coalesce(sum(${creditNotes.sgst}), 0)`,
        creditNoteCount: sql<number>`count(*)`,
      })
      .from(creditNotes)
      .where(eq(creditNotes.restaurantId, auth.restaurantId));

    // 3. Gross Collections (Payments minus Refunds & Reversals)
    const paymentRows = await db
      .select({
        kind: payments.kind,
        total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .innerJoin(bills, eq(payments.billId, bills.id))
      .where(eq(bills.restaurantId, auth.restaurantId))
      .groupBy(payments.kind);

    let paymentSum = 0;
    let refundSum = 0;
    let reversalSum = 0;

    for (const p of paymentRows) {
      if (p.kind === 'PAYMENT') paymentSum = Number(p.total);
      if (p.kind === 'REFUND') refundSum = Number(p.total);
      if (p.kind === 'REVERSAL') reversalSum = Number(p.total);
    }

    const grossCollection = paymentSum - refundSum - reversalSum;

    // 4. Write-offs
    const writeOffRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(tableSessions)
      .where(
        and(
          eq(tableSessions.restaurantId, auth.restaurantId),
          eq(tableSessions.status, 'CLOSED'),
          eq(tableSessions.closedReason, 'WRITTEN_OFF')
        )
      );

    const paidTaxable = Number(paidBills[0]?.taxableTotal || 0);
    const cnTaxable = Number(cNotes[0]?.taxableTotal || 0);
    const netSales = paidTaxable - cnTaxable;

    const paidCgst = Number(paidBills[0]?.cgstTotal || 0);
    const paidSgst = Number(paidBills[0]?.sgstTotal || 0);
    const cnCgst = Number(cNotes[0]?.cgstTotal || 0);
    const cnSgst = Number(cNotes[0]?.sgstTotal || 0);

    const totalTaxCollected = (paidCgst + paidSgst) - (cnCgst + cnSgst);
    const serviceChargeCollected = Number(paidBills[0]?.serviceChargeTotal || 0);

    const response = NextResponse.json({
      data: {
        netSalesPaise: netSales,
        totalTaxCollectedPaise: totalTaxCollected,
        cgstCollectedPaise: paidCgst - cnCgst,
        sgstCollectedPaise: paidSgst - cnSgst,
        grossCollectionPaise: grossCollection,
        serviceChargePaise: serviceChargeCollected,
        writeOffCount: Number(writeOffRows[0]?.count || 0),
        invoicesIssued: Number(paidBills[0]?.invoiceCount || 0),
        creditNotesIssued: Number(cNotes[0]?.creditNoteCount || 0),
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
