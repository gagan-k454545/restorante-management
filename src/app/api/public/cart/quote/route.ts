import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireGuestContext } from '@/modules/auth/guest-guard';
import { db } from '@/db/client';
import { restaurants, menuItems, menuItemVariants, modifierOptions, restaurantSettings } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { calculatePricing, PricingLineItem, PricingSettings } from '@/lib/pricing';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const quoteSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string().uuid(),
      variantId: z.string().uuid().optional(),
      modifierOptionIds: z.array(z.string().uuid()).default([]),
      qty: z.number().int().min(1).max(20),
    })
  ),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const guest = await requireGuestContext();
    const body = await request.json();
    const parsed = quoteSchema.parse(body);

    const [settingsRow] = await db
      .select({
        taxScheme: restaurants.taxScheme,
        priceMode: restaurantSettings.priceMode,
        defaultTaxRateBp: restaurantSettings.defaultTaxRateBp,
        serviceChargeBp: restaurantSettings.serviceChargeBp,
        serviceChargeTaxable: restaurantSettings.serviceChargeTaxable,
        roundOffEnabled: restaurantSettings.roundOffEnabled,
      })
      .from(restaurantSettings)
      .innerJoin(restaurants, eq(restaurantSettings.restaurantId, restaurants.id))
      .where(eq(restaurantSettings.restaurantId, guest.restaurantId))
      .limit(1);

    if (!settingsRow) {
      throw new AppError('CONFIG_ERROR', 'Settings not found', 500);
    }

    const itemIds = parsed.items.map((i) => i.itemId);
    const dbItems = itemIds.length > 0
      ? await db.select().from(menuItems).where(and(eq(menuItems.restaurantId, guest.restaurantId), inArray(menuItems.id, itemIds)))
      : [];

    const itemMap = new Map(dbItems.map((i) => [i.id, i]));
    const pricingLines: PricingLineItem[] = [];

    for (const item of parsed.items) {
      const dbItem = itemMap.get(item.itemId);
      if (!dbItem) continue;

      let unitPrice = dbItem.basePrice;
      if (item.variantId) {
        const [variant] = await db
          .select()
          .from(menuItemVariants)
          .where(and(eq(menuItemVariants.id, item.variantId), eq(menuItemVariants.itemId, dbItem.id)))
          .limit(1);
        if (variant) unitPrice = variant.price;
      }

      if (item.modifierOptionIds.length > 0) {
        const options = await db
          .select()
          .from(modifierOptions)
          .where(inArray(modifierOptions.id, item.modifierOptionIds));
        for (const opt of options) {
          unitPrice += opt.priceDelta;
        }
      }

      pricingLines.push({
        lineTotal: unitPrice * item.qty,
        taxRateBp: dbItem.taxRateBp ?? settingsRow.defaultTaxRateBp,
      });
    }

    const pricingSettings: PricingSettings = {
      taxScheme: settingsRow.taxScheme as 'REGULAR' | 'COMPOSITION',
      priceMode: settingsRow.priceMode as 'EXCLUSIVE' | 'INCLUSIVE',
      serviceChargeBp: settingsRow.serviceChargeBp,
      serviceChargeTaxable: settingsRow.serviceChargeTaxable,
      roundOffEnabled: settingsRow.roundOffEnabled,
    };

    const quote = calculatePricing(pricingLines, pricingSettings);

    const response = NextResponse.json({
      data: {
        subtotal: quote.subtotal,
        serviceCharge: quote.serviceCharge,
        taxableTotal: quote.taxableTotal,
        cgstTotal: quote.cgstTotal,
        sgstTotal: quote.sgstTotal,
        total: quote.total,
        roundOff: quote.roundOff,
        isEstimated: true,
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
