import 'dotenv/config';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../models/db.js';

async function main() {
  await migrate(db, {
    migrationsFolder: './drizzle',
  });

  console.log('Database migrations applied.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Database migration failed:', error);
    process.exit(1);
  });
