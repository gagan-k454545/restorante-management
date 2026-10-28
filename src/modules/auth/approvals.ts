import { jwtVerify } from 'jose';
import { env } from '@/lib/env';

const approvalSecret = new TextEncoder().encode(env.AUTH_SECRET + '_APPROVAL');

export async function verifyApprovalToken(token: string, restaurantId: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, approvalSecret);
    if (payload.restaurantId !== restaurantId) return null;
    return payload.approverId as string;
  } catch {
    return null;
  }
}
