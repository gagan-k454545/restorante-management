import { cookies, headers } from 'next/headers';
import { db } from '@/db/client';
import { users, pairedDevices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyStaffToken, STAFF_AUTH_COOKIE } from './jwt';
import { AppError } from '@/lib/errors';
import { UserRole } from '@/lib/state-machine';

export interface AuthenticatedStaffContext {
  userId: string;
  restaurantId: string;
  role: UserRole;
  name: string;
  isPairedDevice?: boolean;
}

export async function requireAuth(): Promise<AuthenticatedStaffContext> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_AUTH_COOKIE)?.value;

  // Check Bearer header fallback or paired device header
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  const rawToken = token || bearerToken;
  if (!rawToken) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const payload = await verifyStaffToken(rawToken);
  if (!payload) {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401);
  }

  // Validate active status and token version against DB
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, payload.userId), eq(users.restaurantId, payload.restaurantId)))
    .limit(1);

  if (!user || !user.isActive || user.deletedAt) {
    throw new AppError('UNAUTHORIZED', 'User account is inactive or disabled', 401);
  }

  if (user.tokenVersion !== payload.tokenVersion) {
    throw new AppError('UNAUTHORIZED', 'Session expired. Please sign in again.', 401);
  }

  return {
    userId: user.id,
    restaurantId: user.restaurantId,
    role: user.role as UserRole,
    name: user.name,
  };
}

export async function requireRole(allowedRoles: UserRole[]): Promise<AuthenticatedStaffContext> {
  const auth = await requireAuth();

  if (!allowedRoles.includes(auth.role)) {
    throw new AppError('FORBIDDEN', `Role ${auth.role} is not authorized for this resource`, 403);
  }

  return auth;
}
