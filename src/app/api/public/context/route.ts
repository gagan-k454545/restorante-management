import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireGuestContext } from '@/modules/auth/guest-guard';
import { db } from '@/db/client';
import { restaurants, restaurantSettings, tableSessions, sessionDevices } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { formatErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const guest = await requireGuestContext();

    const [restaurant] = await db
      .select({
        name: restaurants.name,
        legalName: restaurants.legalName,
        brandColor: restaurants.brandColor,
        logoUrl: restaurants.logoUrl,
        fssaiNumber: restaurants.fssaiNumber,
        gstin: restaurants.gstin,
      })
      .from(restaurants)
      .where(eq(restaurants.id, guest.restaurantId))
      .limit(1);

    const [settings] = await db
      .select()
      .from(restaurantSettings)
      .where(eq(restaurantSettings.restaurantId, guest.restaurantId))
      .limit(1);

    const [session] = await db
      .select({
        id: tableSessions.id,
        status: tableSessions.status,
      })
      .from(tableSessions)
      .where(
        and(
          eq(tableSessions.tableId, guest.tableId),
          sql`${tableSessions.status} IN ('OPEN', 'BILL_REQUESTED', 'BILLING')`
        )
      )
      .limit(1);

    let isDeviceVerified = guest.guardMode === 'OPEN';
    if (session) {
      const [sDev] = await db
        .select({ verifiedAt: sessionDevices.verifiedAt })
        .from(sessionDevices)
        .where(and(eq(sessionDevices.sessionId, session.id), eq(sessionDevices.deviceId, guest.deviceId)))
        .limit(1);
      if (sDev?.verifiedAt) {
        isDeviceVerified = true;
      }
    }

    const isPaused = !!(settings?.orderingPausedUntil && new Date() < new Date(settings.orderingPausedUntil));

    const response = NextResponse.json({
      data: {
        restaurant: {
          name: restaurant?.name || 'Restaurant',
          legalName: restaurant?.legalName,
          brandColor: restaurant?.brandColor || '#ea580c',
          logoUrl: restaurant?.logoUrl,
          fssaiNumber: restaurant?.fssaiNumber,
          gstin: restaurant?.gstin,
        },
        table: {
          id: guest.tableId,
          label: guest.tableLabel,
        },
        session: session ? { id: session.id, status: session.status } : null,
        orderingStatus: {
          isOpen: !isPaused,
          isPaused,
          pauseMessage: settings?.pauseMessage,
          extraDelayMinutes: settings?.extraDelayMinutes || 0,
        },
        guardMode: guest.guardMode,
        isDeviceVerified,
        serverNow,
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
