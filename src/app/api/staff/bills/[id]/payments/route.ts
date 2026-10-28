import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import {
  tables,
  tableSessions,
  bills,
  payments,
  events,
  counters,
  restaurantSettings,
} from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getBusinessDate, getFinancialYear, formatInvoiceNumber } from '@/lib/business-date';
import { bus } from '@/modules/realtime/bus';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const paymentSchema = z.object({
  amount: z.number().int().positive('Payment amount must be greater than 0'),
  method: z.enum(['CASH', 'UPI', 'CARD', 'OTHER']),
  reference: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: billId } = await params;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER', 'CASHIER']);

    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey) {
      throw new AppError('VALIDATION_ERROR', 'Idempotency-Key header is required', 400);
    }

    const body = await request.json();
    const { amount, method, reference } = paymentSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      // 1. Lock bill & session
      const [bill] = await tx
        .select()
        .from(bills)
        .where(and(eq(bills.id, billId), eq(bills.restaurantId, auth.restaurantId)))
        .for('update');

      if (!bill) {
        throw new AppError('BILL_NOT_FOUND', 'Bill not found', 404);
      }

      if (bill.status !== 'DRAFT') {
        throw new AppError('BILL_NOT_DRAFT', `Bill is in ${bill.status} state, cannot accept payments`, 409);
      }

      const amountDue = bill.total - bill.paidTotal;
      if (amount > amountDue) {
        throw new AppError(
          'PAYMENT_EXCEEDS_DUE',
          `Payment of ₹${(amount / 100).toFixed(2)} exceeds remaining due ₹${(amountDue / 100).toFixed(2)}`,
          422
        );
      }

      // 2. Insert Payment row
      const [payment] = await tx
        .insert(payments)
        .values({
          billId: bill.id,
          method,
          kind: 'PAYMENT',
          amount,
          reference: reference || null,
          takenBy: auth.userId,
        })
        .returning();

      const newPaidTotal = bill.paidTotal + amount;
      const isFullyPaid = newPaidTotal >= bill.total;

      let invoiceNumber: string | undefined;
      let invoiceFy: string | undefined;

      if (isFullyPaid) {
        // Load restaurant settings for invoice prefix
        const [settings] = await tx
          .select({ invoicePrefix: restaurantSettings.invoicePrefix })
          .from(restaurantSettings)
          .where(eq(restaurantSettings.restaurantId, auth.restaurantId))
          .limit(1);

        const prefix = settings?.invoicePrefix || 'INV';
        const businessDate = getBusinessDate(new Date());
        invoiceFy = getFinancialYear(businessDate);
        const counterKey = `invoice:${invoiceFy}`;

        // Atomic sequential gapless invoice number
        const [counterRow] = await tx
          .insert(counters)
          .values({ restaurantId: auth.restaurantId, key: counterKey, value: 1 })
          .onConflictDoUpdate({
            target: [counters.restaurantId, counters.key],
            set: { value: sql`${counters.value} + 1` },
          })
          .returning();

        invoiceNumber = formatInvoiceNumber(prefix, invoiceFy, counterRow.value);

        // Update Bill to PAID with invoice number
        await tx
          .update(bills)
          .set({
            paidTotal: newPaidTotal,
            status: 'PAID',
            invoiceNumber,
            invoiceFy,
            issuedAt: new Date(),
          })
          .where(eq(bills.id, bill.id));

        // Close session as PAID
        await tx
          .update(tableSessions)
          .set({
            status: 'CLOSED',
            closedReason: 'PAID',
            closedAt: new Date(),
            closedBy: auth.userId,
          })
          .where(eq(tableSessions.id, bill.sessionId));

        // Write events
        await tx.insert(events).values({
          restaurantId: auth.restaurantId,
          channel: 'front',
          type: 'session.updated',
          sessionId: bill.sessionId,
          payload: {
            sessionId: bill.sessionId,
            status: 'CLOSED',
            closedReason: 'PAID',
            invoiceNumber,
          },
        });
      } else {
        // Partial payment
        await tx
          .update(bills)
          .set({ paidTotal: newPaidTotal })
          .where(eq(bills.id, bill.id));
      }

      return {
        paymentId: payment.id,
        amountPaid: amount,
        paidTotal: newPaidTotal,
        amountDue: bill.total - newPaidTotal,
        isFullyPaid,
        invoiceNumber,
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
