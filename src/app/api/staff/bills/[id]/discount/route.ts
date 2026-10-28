import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { bills, billLines, billTaxLines, tableSessions, auditLogs, events, restaurantSettings, restaurants } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { calculatePricing, PricingSettings } from '@/lib/pricing';
import { verifyApprovalToken } from '@/modules/auth/approvals';
import { bus } from '@/modules/realtime/bus';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const discountSchema = z.object({
  type: z.enum(['FLAT', 'PERCENT']),
  value: z.number().int().positive(),
  reason: z.string().min(1, 'Reason required for discount'),
  approvalToken: z.string().optional(),
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
    const body = await request.json();
    const { type, value, reason, approvalToken } = discountSchema.parse(body);

    let approverId = auth.userId;
    if (auth.role === 'CASHIER') {
      if (!approvalToken) {
        throw new AppError('APPROVAL_REQUIRED', 'Cashier requires manager PIN approval token for discount', 403);
      }
      const verifiedApprover = await verifyApprovalToken(approvalToken, auth.restaurantId);
      if (!verifiedApprover) {
        throw new AppError('INVALID_APPROVAL', 'Approval token invalid or expired (120s limit)', 401);
      }
      approverId = verifiedApprover;
    }

    const result = await db.transaction(async (tx) => {
      const [bill] = await tx
        .select()
        .from(bills)
        .where(and(eq(bills.id, billId), eq(bills.restaurantId, auth.restaurantId)))
        .for('update');

      if (!bill || bill.status !== 'DRAFT') {
        throw new AppError('BILL_NOT_DRAFT', 'Discounts can only be applied to DRAFT bills', 409);
      }

      if (type === 'FLAT' && value > bill.subtotal) {
        throw new AppError('INVALID_DISCOUNT', 'Flat discount cannot exceed subtotal', 422);
      }
      if (type === 'PERCENT' && value > 100) {
        throw new AppError('INVALID_DISCOUNT', 'Percent discount cannot exceed 100%', 422);
      }

      // Load settings
      const [settingsRow] = await tx
        .select({
          taxScheme: restaurants.taxScheme,
          priceMode: restaurantSettings.priceMode,
          serviceChargeBp: restaurantSettings.serviceChargeBp,
          serviceChargeTaxable: restaurantSettings.serviceChargeTaxable,
          roundOffEnabled: restaurantSettings.roundOffEnabled,
        })
        .from(restaurantSettings)
        .innerJoin(restaurants, eq(restaurantSettings.restaurantId, restaurants.id))
        .where(eq(restaurantSettings.restaurantId, auth.restaurantId))
        .limit(1);

      if (!settingsRow) throw new AppError('CONFIG_ERROR', 'Settings not found', 500);

      // Load current bill lines
      const bLines = await tx.select().from(billLines).where(eq(billLines.billId, bill.id));
      const pricingLines = bLines.map((l) => ({ lineTotal: l.lineTotal, taxRateBp: l.taxRateBp }));

      const pricingSettings: PricingSettings = {
        taxScheme: settingsRow.taxScheme as 'REGULAR' | 'COMPOSITION',
        priceMode: settingsRow.priceMode as 'EXCLUSIVE' | 'INCLUSIVE',
        serviceChargeBp: settingsRow.serviceChargeBp,
        serviceChargeTaxable: settingsRow.serviceChargeTaxable,
        roundOffEnabled: settingsRow.roundOffEnabled,
      };

      const recomputed = calculatePricing(pricingLines, pricingSettings, { type, value });

      // Update bill
      const [updatedBill] = await tx
        .update(bills)
        .set({
          discount: recomputed.discount,
          discountReason: reason,
          discountApprovedBy: approverId,
          serviceCharge: recomputed.serviceCharge,
          taxableTotal: recomputed.taxableTotal,
          cgstTotal: recomputed.cgstTotal,
          sgstTotal: recomputed.sgstTotal,
          roundOff: recomputed.roundOff,
          total: recomputed.total,
        })
        .where(eq(bills.id, bill.id))
        .returning();

      // Replace tax lines
      await tx.delete(billTaxLines).where(eq(billTaxLines.billId, bill.id));
      for (const tl of recomputed.taxLines) {
        await tx.insert(billTaxLines).values({
          billId: bill.id,
          taxRateBp: tl.taxRateBp,
          taxableValue: tl.taxableValue,
          cgst: tl.cgst,
          sgst: tl.sgst,
        });
      }

      // If 100% discount gives total 0, session closes as NO_CHARGE
      if (recomputed.total === 0) {
        await tx
          .update(tableSessions)
          .set({
            status: 'CLOSED',
            closedReason: 'NO_CHARGE',
            closedAt: new Date(),
            closedBy: auth.userId,
          })
          .where(eq(tableSessions.id, bill.sessionId));

        await tx.update(bills).set({ status: 'PAID', issuedAt: new Date() }).where(eq(bills.id, bill.id));
      }

      await tx.insert(auditLogs).values({
        restaurantId: auth.restaurantId,
        actorId: auth.userId,
        action: 'APPLY_DISCOUNT',
        entity: 'bills',
        entityId: bill.id,
        before: { total: bill.total, discount: bill.discount },
        after: { total: recomputed.total, discount: recomputed.discount, approverId, reason },
      });

      return updatedBill;
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
