import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { bills, creditNotes, payments, counters, auditLogs, restaurantSettings, restaurants } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getBusinessDate, getFinancialYear, formatCreditNoteNumber } from '@/lib/business-date';
import { rhu } from '@/lib/pricing';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const creditNoteSchema = z.object({
  refundAmount: z.number().int().positive('Refund amount must be positive paise'),
  reason: z.string().min(1, 'Reason required for credit note'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: billId } = await params;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER']);
    const body = await request.json();
    const { refundAmount, reason } = creditNoteSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      // 1. Load bill
      const [bill] = await tx
        .select()
        .from(bills)
        .where(and(eq(bills.id, billId), eq(bills.restaurantId, auth.restaurantId)))
        .for('update');

      if (!bill || bill.status !== 'PAID') {
        throw new AppError('BILL_NOT_PAID', 'Credit notes can only be issued against PAID bills', 409);
      }

      if (refundAmount > bill.total) {
        throw new AppError('EXCEEDS_TOTAL', 'Refund amount cannot exceed bill total', 422);
      }

      // 2. Compute tax breakdown for the credit note
      const businessDate = getBusinessDate(new Date());
      const fy = getFinancialYear(businessDate);
      const counterKey = `credit_note:${fy}`;

      // Sequential counter
      const [counterRow] = await tx
        .insert(counters)
        .values({ restaurantId: auth.restaurantId, key: counterKey, value: 1 })
        .onConflictDoUpdate({
          target: [counters.restaurantId, counters.key],
          set: { value: sql`${counters.value} + 1` },
        })
        .returning();

      const noteNumber = formatCreditNoteNumber(fy, counterRow.value);

      // Load tax rate
      const [settings] = await tx
        .select({ defaultTaxRateBp: restaurantSettings.defaultTaxRateBp })
        .from(restaurantSettings)
        .where(eq(restaurantSettings.restaurantId, auth.restaurantId))
        .limit(1);

      const rateBp = settings?.defaultTaxRateBp || 500;
      // Taxable = rhu(refundAmount * 10000, 10000 + rateBp)
      const taxableValue = rhu(refundAmount * 10000, 10000 + rateBp);
      const halfTax = rhu((refundAmount - taxableValue), 2);

      // 3. Insert append-only Credit Note
      const [cn] = await tx
        .insert(creditNotes)
        .values({
          restaurantId: auth.restaurantId,
          billId: bill.id,
          noteNumber,
          fy,
          reason,
          taxableValue,
          cgst: halfTax,
          sgst: halfTax,
          total: refundAmount,
          createdBy: auth.userId,
        })
        .returning();

      // 4. Insert refund payment record
      await tx.insert(payments).values({
        billId: bill.id,
        method: 'OTHER',
        kind: 'REFUND',
        amount: refundAmount,
        reference: `Refund for Credit Note ${noteNumber}`,
        takenBy: auth.userId,
      });

      // 5. Audit log (Never edit paid bill)
      await tx.insert(auditLogs).values({
        restaurantId: auth.restaurantId,
        actorId: auth.userId,
        action: 'ISSUE_CREDIT_NOTE',
        entity: 'credit_notes',
        entityId: cn.id,
        after: { noteNumber, total: refundAmount, reason, billId: bill.id },
      });

      return {
        id: cn.id,
        noteNumber: cn.noteNumber,
        refundAmount: cn.total,
        taxableValue: cn.taxableValue,
        cgst: cn.cgst,
        sgst: cn.sgst,
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
