import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../models/db.js';
import { isSafeResetTarget } from './db-safety.js';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (!isSafeResetTarget(databaseUrl) && process.env.ALLOW_REMOTE_DB_RESET !== 'true') {
    throw new Error(
      'Refusing to reset a non-local database. Set ALLOW_REMOTE_DB_RESET=true if you really intend to do this.'
    );
  }

  await db.execute(
    sql.raw('TRUNCATE TABLE "session_stats", "updates", "sessions", "sitters" RESTART IDENTITY CASCADE;')
  );

  console.log('Database reset complete.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Database reset failed:', error);
    process.exit(1);
  });
