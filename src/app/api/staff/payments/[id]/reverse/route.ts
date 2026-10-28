import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { bills, payments, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reverseSchema = z.object({
  reason: z.string().min(1, 'Reason required for reversal'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paymentId } = await params;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER']);
    const body = await request.json();
    const { reason } = reverseSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      // 1. Load original payment
      const [origPayment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (!origPayment || origPayment.kind !== 'PAYMENT') {
        throw new AppError('INVALID_PAYMENT', 'Only primary payment entries can be reversed', 400);
      }

      // Check if already reversed
      const [existingReversal] = await tx
        .select()
        .from(payments)
        .where(eq(payments.reversesPaymentId, origPayment.id))
        .limit(1);

      if (existingReversal) {
        throw new AppError('ALREADY_REVERSED', 'This payment has already been reversed', 409);
      }

      const [bill] = await tx.select().from(bills).where(eq(bills.id, origPayment.billId)).for('update');
      if (!bill) throw new AppError('BILL_NOT_FOUND', 'Bill not found', 404);

      // 2. Insert append-only reversal payment row
      const [reversalRow] = await tx
        .insert(payments)
        .values({
          billId: bill.id,
          method: origPayment.method,
          kind: 'REVERSAL',
          amount: origPayment.amount,
          reference: `Reversal of ${origPayment.id}: ${reason}`,
          reversesPaymentId: origPayment.id,
          takenBy: auth.userId,
        })
        .returning();

      // 3. Decrement bill paidTotal
      const updatedPaidTotal = Math.max(0, bill.paidTotal - origPayment.amount);
      await tx
        .update(bills)
        .set({ paidTotal: updatedPaidTotal })
        .where(eq(bills.id, bill.id));

      // 4. Audit log
      await tx.insert(auditLogs).values({
        restaurantId: auth.restaurantId,
        actorId: auth.userId,
        action: 'REVERSE_PAYMENT',
        entity: 'payments',
        entityId: reversalRow.id,
        before: { paymentId: origPayment.id, amount: origPayment.amount },
        after: { reversalId: reversalRow.id, reason },
      });

      return {
        reversalId: reversalRow.id,
        reversedAmount: origPayment.amount,
        remainingPaidTotal: updatedPaidTotal,
      };
    });

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
