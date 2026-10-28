import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAuth } from '@/modules/auth/guards';
import { formatErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireAuth();

    const response = NextResponse.json({
      data: {
        userId: auth.userId,
        name: auth.name,
        role: auth.role,
        restaurantId: auth.restaurantId,
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
