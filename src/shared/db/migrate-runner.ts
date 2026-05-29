import { connectDB, disconnectDB } from './pool.js';
import { runMigrations } from './migrate.js';

async function main(): Promise<void> {
  await connectDB();
  await runMigrations();
  await disconnectDB();
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('[migrate] fatal error:', err);
  process.exit(1);
});