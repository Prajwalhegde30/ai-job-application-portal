/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { db, connectDatabase, disconnectDatabase } from '../config/database';

async function runMigrations(): Promise<void> {
  console.log('='.repeat(60));
  console.log('  AI Job Portal — Database Migration Script');
  console.log('='.repeat(60));

  try {
    // 1. Establish DB Connection
    await connectDatabase(3, 1000);

    // 2. Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_init.sql');
    console.log(`\nReading migration file: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at: ${migrationPath}`);
    }

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // 3. Run migration SQL
    console.log('Executing migration SQL script...');
    const startTime = Date.now();
    await db.query(migrationSql);
    const duration = Date.now() - startTime;

    console.log(`\n✅ Migration successfully executed in ${duration}ms.`);
    console.log('='.repeat(60));
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:');
    console.error((err as Error).message);
    if ((err as Error).stack) {
      console.error((err as Error).stack);
    }
    console.log('='.repeat(60));
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

runMigrations();
