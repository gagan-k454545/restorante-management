import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { sessionDevices, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { formatErrorResponse, AppError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deviceId: string }> }
) {
  const { id: sessionId, deviceId } = await params;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER']);

    const [updated] = await db
      .update(sessionDevices)
      .set({ blockedAt: new Date() })
      .where(and(eq(sessionDevices.sessionId, sessionId), eq(sessionDevices.deviceId, deviceId)))
      .returning();

    if (!updated) {
      throw new AppError('DEVICE_NOT_FOUND', 'Device not found on this session', 404);
    }

    await db.insert(auditLogs).values({
      restaurantId: auth.restaurantId,
      actorId: auth.userId,
      action: 'BLOCK_DEVICE',
      entity: 'session_devices',
      entityId: updated.id,
      after: { sessionId, deviceId, blockedAt: updated.blockedAt },
    });

    const response = NextResponse.json({ data: { success: true, deviceId: updated.deviceId } });
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
