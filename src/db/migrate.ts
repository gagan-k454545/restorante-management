import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, queryClient } from './client';
import { logger } from '@/lib/logger';

export async function runMigrations() {
  logger.info('Starting database migrations...');
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    logger.info('Database migrations applied successfully.');
  } catch (error) {
    logger.error({ err: error }, 'Migration failed');
    throw error;
  }
}

if (process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
    .finally(async () => {
      await queryClient.end();
    });
}
