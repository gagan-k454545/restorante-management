import { cookies } from 'next/headers';
import { db } from '@/db/client';
import { tables, restaurants, restaurantSettings, tableSessions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verifyDeviceCookie, DEVICE_COOKIE_NAME } from '@/lib/device-cookie';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';

export interface GuestContext {
  deviceId: string;
  tableId: string;
  restaurantId: string;
  tableLabel: string;
  guardMode: string;
}

export async function requireGuestContext(): Promise<GuestContext> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(DEVICE_COOKIE_NAME)?.value;

  const verified = verifyDeviceCookie(rawCookie, env.DEVICE_COOKIE_SECRET);
  if (!verified) {
    throw new AppError('DEVICE_UNIDENTIFIED', 'Please scan the table QR code to begin', 401);
  }

  // Look up table and verify it exists and is enabled
  const [tableRecord] = await db
    .select({
      id: tables.id,
      restaurantId: tables.restaurantId,
      label: tables.label,
      isEnabled: tables.isEnabled,
      deletedAt: tables.deletedAt,
      guardMode: restaurantSettings.orderGuardMode,
      orderingPausedUntil: restaurantSettings.orderingPausedUntil,
      pauseMessage: restaurantSettings.pauseMessage,
    })
    .from(tables)
    .innerJoin(restaurantSettings, eq(tables.restaurantId, restaurantSettings.restaurantId))
    .where(eq(tables.id, verified.tableId))
    .limit(1);

  if (!tableRecord || !tableRecord.isEnabled || tableRecord.deletedAt) {
    throw new AppError('TABLE_DISABLED', 'This table is currently disabled or unavailable', 403);
  }

  // Check if ordering is paused
  if (tableRecord.orderingPausedUntil && new Date() < new Date(tableRecord.orderingPausedUntil)) {
    throw new AppError(
      'ORDERING_PAUSED',
      tableRecord.pauseMessage || 'Ordering is temporarily paused. Please check back shortly.',
      403
    );
  }

  return {
    deviceId: verified.deviceId,
    tableId: tableRecord.id,
    restaurantId: tableRecord.restaurantId,
    tableLabel: tableRecord.label,
    guardMode: tableRecord.guardMode,
  };
}
