import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/lib/env';

export interface StaffJwtPayload {
  userId: string;
  restaurantId: string;
  role: 'OWNER' | 'MANAGER' | 'KITCHEN' | 'WAITER' | 'CASHIER';
  tokenVersion: number;
}

const secretKey = new TextEncoder().encode(env.AUTH_SECRET);
export const STAFF_AUTH_COOKIE = 'staff_token';

export async function signStaffToken(payload: StaffJwtPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secretKey);
}

export async function verifyStaffToken(token: string): Promise<StaffJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as StaffJwtPayload;
  } catch {
    return null;
  }
}
