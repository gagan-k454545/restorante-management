import { execSync } from 'child_process';
import { logger } from '../src/lib/logger';

const phase = process.argv[2] || '1';

async function runGate() {
  logger.info(`Running Quality Gate for Phase ${phase}...`);

  try {
    // 1. Typecheck
    logger.info('Step 1: TypeScript typecheck...');
    execSync('pnpm.cmd typecheck', { stdio: 'inherit' });

    // 2. Unit tests (Pricing, State Machine, Invariants)
    logger.info('Step 2: Unit tests...');
    execSync('pnpm.cmd test:unit', { stdio: 'inherit' });

    logger.info(`Phase ${phase} Gate PASSED successfully!`);
  } catch (error) {
    logger.error({ err: error }, `Phase ${phase} Gate FAILED`);
    process.exit(1);
  }
}

runGate();
