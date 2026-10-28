import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { tables, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { formatErrorResponse, AppError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tableId } = await params;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireRole(['OWNER', 'MANAGER']);

    const newToken = crypto.randomBytes(16).toString('hex'); // 128-bit random token

    const [updatedTable] = await db
      .update(tables)
      .set({ token: newToken })
      .where(and(eq(tables.id, tableId), eq(tables.restaurantId, auth.restaurantId)))
      .returning();

    if (!updatedTable) {
      throw new AppError('TABLE_NOT_FOUND', 'Table not found', 404);
    }

    await db.insert(auditLogs).values({
      restaurantId: auth.restaurantId,
      actorId: auth.userId,
      action: 'REGENERATE_QR_TOKEN',
      entity: 'tables',
      entityId: updatedTable.id,
      after: { tableLabel: updatedTable.label },
    });

    const response = NextResponse.json({
      data: {
        id: updatedTable.id,
        label: updatedTable.label,
        token: updatedTable.token,
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
