/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { db, connectDatabase, disconnectDatabase } from '../config/database';

/**
 * Sequential migration runner.
 * Scans the migrations/ folder, sorts .sql files alphabetically,
 * and executes each in order within its own transaction.
 */
async function runMigrations(): Promise<void> {
  console.log('='.repeat(60));
  console.log('  AI Job Portal — Database Migration Script');
  console.log('='.repeat(60));

  try {
    // 1. Establish DB Connection
    await connectDatabase(3, 1000);

    // 2. Discover migration files
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at: ${migrationsDir}`);
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // Alphabetical sort ensures 001 < 002 < 003 etc.

    if (migrationFiles.length === 0) {
      console.log('\nNo migration files found. Nothing to execute.');
      process.exit(0);
    }

    console.log(`\nFound ${migrationFiles.length} migration file(s):`);
    migrationFiles.forEach((f) => console.log(`  → ${f}`));

    // 3. Execute each migration in order
    const totalStart = Date.now();

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`\nExecuting: ${file}...`);
      const start = Date.now();
      await db.query(sql);
      const duration = Date.now() - start;
      console.log(`  ✅ ${file} completed in ${duration}ms`);
    }

    const totalDuration = Date.now() - totalStart;
    console.log(
      `\n✅ All ${migrationFiles.length} migrations executed in ${totalDuration}ms.`
    );
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
