import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireGuestContext } from '@/modules/auth/guest-guard';
import { db } from '@/db/client';
import {
  categories,
  menuItems,
  menuItemVariants,
  modifierGroups,
  modifierOptions,
  menuItemModifierGroups,
} from '@/db/schema';
import { eq, and, sql, asc } from 'drizzle-orm';
import { formatErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const guest = await requireGuestContext();

    // 1. Fetch active categories
    const dbCategories = await db
      .select()
      .from(categories)
      .where(and(eq(categories.restaurantId, guest.restaurantId), eq(categories.isActive, true), sql`deleted_at IS NULL`))
      .orderBy(asc(categories.sortOrder));

    // 2. Fetch items
    const dbItems = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.restaurantId, guest.restaurantId), sql`deleted_at IS NULL`))
      .orderBy(asc(menuItems.sortOrder));

    // 3. Fetch variants
    const dbVariants = await db
      .select()
      .from(menuItemVariants)
      .where(eq(menuItemVariants.isAvailable, true))
      .orderBy(asc(menuItemVariants.sortOrder));

    const variantsByItem = new Map<string, typeof dbVariants>();
    for (const v of dbVariants) {
      const list = variantsByItem.get(v.itemId) || [];
      list.push(v);
      variantsByItem.set(v.itemId, list);
    }

    // 4. Fetch modifier groups
    const dbModifierGroups = await db
      .select()
      .from(modifierGroups)
      .where(eq(modifierGroups.restaurantId, guest.restaurantId));

    const dbModOptions = await db
      .select()
      .from(modifierOptions)
      .where(eq(modifierOptions.isAvailable, true))
      .orderBy(asc(modifierOptions.sortOrder));

    const optionsByGroup = new Map<string, typeof dbModOptions>();
    for (const opt of dbModOptions) {
      const list = optionsByGroup.get(opt.groupId) || [];
      list.push(opt);
      optionsByGroup.set(opt.groupId, list);
    }

    // Item to modifier group mapping
    const dbItemMods = await db.select().from(menuItemModifierGroups);
    const modGroupsByItem = new Map<string, typeof dbModifierGroups>();
    for (const im of dbItemMods) {
      const g = dbModifierGroups.find((grp) => grp.id === im.groupId);
      if (g) {
        const list = modGroupsByItem.get(im.itemId) || [];
        list.push(g);
        modGroupsByItem.set(im.itemId, list);
      }
    }

    // Structure category with items
    const categoryTree = dbCategories.map((cat) => {
      const catItems = dbItems
        .filter((it) => it.categoryId === cat.id)
        .map((it) => {
          const itemVariants = variantsByItem.get(it.id) || [];
          const itemModGroups = (modGroupsByItem.get(it.id) || []).map((mg) => ({
            id: mg.id,
            name: mg.name,
            minSelect: mg.minSelect,
            maxSelect: mg.maxSelect,
            options: (optionsByGroup.get(mg.id) || []).map((opt) => ({
              id: opt.id,
              name: opt.name,
              priceDelta: opt.priceDelta,
            })),
          }));

          const remainingPortions =
            it.dailyLimit !== null && it.dailyLimit !== undefined
              ? Math.max(0, it.dailyLimit - it.soldToday)
              : null;

          return {
            id: it.id,
            name: it.name,
            description: it.description,
            imageUrl: it.imageUrl,
            basePrice: it.basePrice,
            isVeg: it.isVeg,
            allergens: it.allergens,
            tags: it.tags,
            spiceLevel: it.spiceLevel,
            availability: it.availability,
            prepTimeMinutes: it.prepTimeMinutes,
            dailyLimit: it.dailyLimit,
            remainingPortions,
            variants: itemVariants.map((v) => ({
              id: v.id,
              name: v.name,
              price: v.price,
            })),
            modifierGroups: itemModGroups,
          };
        });

      return {
        id: cat.id,
        name: cat.name,
        availableFrom: cat.availableFrom,
        availableTo: cat.availableTo,
        items: catItems,
      };
    });

    const response = NextResponse.json({ data: categoryTree });
    response.headers.set('X-Request-Id', requestId);
    response.headers.set('X-Server-Time', serverNow.toString());
    response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    const response = NextResponse.json(body, { status });
    response.headers.set('X-Request-Id', requestId);
    response.headers.set('X-Server-Time', serverNow.toString());
    return response;
  }
}
