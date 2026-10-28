import * as argon2 from '@node-rs/argon2';
import { db, queryClient } from '../src/db/client';
import { users, restaurants } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../src/lib/logger';

async function createOrResetOwner() {
  const email = process.argv[2] || 'owner@spicegarden.com';
  const password = process.argv[3] || 'Password123!';
  const name = process.argv[4] || 'Restaurant Owner';

  logger.info({ email }, 'Creating or updating owner account...');

  const [restaurant] = await db.select().from(restaurants).limit(1);
  if (!restaurant) {
    logger.error('No restaurant found in database. Please run seed script first.');
    process.exit(1);
  }

  const passwordHash = await argon2.hash(password);
  const pinHash = await argon2.hash('123456');

  const [existingUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.restaurantId, restaurant.id), eq(users.email, email)))
    .limit(1);

  if (existingUser) {
    await db
      .update(users)
      .set({
        passwordHash,
        pinHash,
        role: 'OWNER',
        isActive: true,
        tokenVersion: existingUser.tokenVersion + 1,
      })
      .where(eq(users.id, existingUser.id));
    logger.info({ email }, 'Owner password and credentials reset successfully.');
  } else {
    await db.insert(users).values({
      restaurantId: restaurant.id,
      name,
      email,
      passwordHash,
      pinHash,
      role: 'OWNER',
      isActive: true,
    });
    logger.info({ email }, 'New owner account created successfully.');
  }
}

createOrResetOwner()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, 'Failed to create/reset owner');
    process.exit(1);
  })
  .finally(async () => {
    await queryClient.end();
  });
