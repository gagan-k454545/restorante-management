import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireGuestContext } from '@/modules/auth/guest-guard';
import { placeOrderSchema } from '@/modules/orders/orders.schema';
import { placeOrder } from '@/modules/orders/orders.service';
import { checkRateLimit, placeOrderDeviceLimiter, placeOrderTableLimiter } from '@/lib/rate-limit';
import { formatErrorResponse, AppError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const guest = await requireGuestContext();

    // 1. Check rate limits: 6/min per device, 20/min per table
    await checkRateLimit(placeOrderDeviceLimiter, guest.deviceId, 'Too many orders. Please wait a moment.');
    await checkRateLimit(placeOrderTableLimiter, guest.tableId, 'Too many orders for this table. Please wait a moment.');

    // 2. Validate Idempotency-Key header
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey) {
      throw new AppError('VALIDATION_ERROR', 'Idempotency-Key header is required', 400);
    }

    // 3. Validate body with Zod
    const body = await request.json();
    const validatedInput = placeOrderSchema.parse(body);

    // 4. Call service
    const result = await placeOrder(validatedInput, {
      deviceId: guest.deviceId,
      tableId: guest.tableId,
      restaurantId: guest.restaurantId,
      idempotencyKey,
    });

    const isReplay = (result as { _isIdempotentReplay?: boolean })._isIdempotentReplay;
    delete (result as { _isIdempotentReplay?: boolean })._isIdempotentReplay;

    const response = NextResponse.json({ data: result }, { status: 201 });
    response.headers.set('X-Request-Id', requestId);
    response.headers.set('X-Server-Time', serverNow.toString());
    if (isReplay) {
      response.headers.set('Idempotent-Replay', 'true');
    }

    return response;
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    const response = NextResponse.json(body, { status });
    response.headers.set('X-Request-Id', requestId);
    response.headers.set('X-Server-Time', serverNow.toString());
    return response;
  }
}
