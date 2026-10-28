import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { requireRole } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { tables } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { env } from '@/lib/env';
import { formatErrorResponse, AppError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tableId } = await params;

  try {
    const auth = await requireRole(['OWNER', 'MANAGER', 'WAITER']);
    const format = request.nextUrl.searchParams.get('format') || 'png';

    const [table] = await db
      .select()
      .from(tables)
      .where(and(eq(tables.id, tableId), eq(tables.restaurantId, auth.restaurantId)))
      .limit(1);

    if (!table || table.deletedAt) {
      throw new AppError('TABLE_NOT_FOUND', 'Table not found', 404);
    }

    const qrUrl = `${env.APP_URL}/t/${table.token}`;

    if (format === 'svg') {
      const svgString = await QRCode.toString(qrUrl, {
        type: 'svg',
        errorCorrectionLevel: 'Q',
        margin: 4,
        color: { dark: '#000000', light: '#ffffff' },
      });

      return new Response(svgString, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Default PNG buffer
    const pngBuffer = await QRCode.toBuffer(qrUrl, {
      type: 'png',
      width: 512,
      errorCorrectionLevel: 'Q',
      margin: 4,
      color: { dark: '#000000', light: '#ffffff' },
    });

    return new Response(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
