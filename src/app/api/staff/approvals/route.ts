import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import * as argon2 from '@node-rs/argon2';
import { requireAuth } from '@/modules/auth/guards';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/lib/env';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const approvalSchema = z.object({
  managerPin: z.string().length(6, 'PIN must be 6 digits'),
});

const approvalSecret = new TextEncoder().encode(env.AUTH_SECRET + '_APPROVAL');

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const auth = await requireAuth();
    const body = await request.json();
    const { managerPin } = approvalSchema.parse(body);

    // Look for active manager or owner with matching PIN in this restaurant
    const managers = await db
      .select()
      .from(users)
      .where(and(eq(users.restaurantId, auth.restaurantId), eq(users.isActive, true)));

    let approvedManager: (typeof managers)[0] | null = null;
    for (const m of managers) {
      if ((m.role === 'OWNER' || m.role === 'MANAGER') && m.pinHash) {
        const isMatch = await argon2.verify(m.pinHash, managerPin);
        if (isMatch) {
          approvedManager = m;
          break;
        }
      }
    }

    if (!approvedManager) {
      throw new AppError('INVALID_PIN', 'Invalid manager PIN', 401);
    }

    // Generate one-use approval token valid for 120 seconds
    const approvalToken = await new SignJWT({
      approverId: approvedManager.id,
      approverName: approvedManager.name,
      restaurantId: auth.restaurantId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('120s')
      .sign(approvalSecret);

    const response = NextResponse.json({
      data: {
        approvalToken,
        approverName: approvedManager.name,
        expiresInSeconds: 120,
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
