import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { restaurantSettings, events } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { bus } from '@/modules/realtime/bus';
import { formatErrorResponse } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const busySchema = z.object({
  extraDelayMinutes: z.number().int().min(0).max(60),
  pauseUntil: z.string().datetime().optional().nullable(),
  pauseMessage: z.string().max(200).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER']);
    const body = await request.json();
    const { extraDelayMinutes, pauseUntil, pauseMessage } = busySchema.parse(body);

    const [updatedSettings] = await db
      .update(restaurantSettings)
      .set({
        extraDelayMinutes,
        orderingPausedUntil: pauseUntil ? new Date(pauseUntil) : null,
        pauseMessage: pauseMessage || null,
      })
      .where(eq(restaurantSettings.restaurantId, auth.restaurantId))
      .returning();

    await db.insert(events).values({
      restaurantId: auth.restaurantId,
      channel: 'all',
      type: 'settings.updated',
      payload: {
        extraDelayMinutes,
        isPaused: !!pauseUntil,
        pauseMessage,
      },
    });

    bus.wake();

    const response = NextResponse.json({
      data: {
        extraDelayMinutes: updatedSettings.extraDelayMinutes,
        orderingPausedUntil: updatedSettings.orderingPausedUntil,
        pauseMessage: updatedSettings.pauseMessage,
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
