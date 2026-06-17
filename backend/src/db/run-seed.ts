/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { db, connectDatabase, disconnectDatabase } from '../config/database';

async function runSeed(): Promise<void> {
  console.log('='.repeat(60));
  console.log('  AI Job Portal — Database Seed Script');
  console.log('='.repeat(60));

  try {
    // 1. Establish DB Connection
    await connectDatabase(3, 1000);

    // 2. Read seed file
    const seedPath = path.join(__dirname, 'seed.sql');
    console.log(`\nReading seed file: ${seedPath}`);

    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at: ${seedPath}`);
    }

    const seedSql = fs.readFileSync(seedPath, 'utf8');

    // 3. Run seed SQL
    console.log('Executing seed SQL script...');
    const startTime = Date.now();
    await db.query(seedSql);
    const duration = Date.now() - startTime;

    console.log(`\n✅ Seeding successfully completed in ${duration}ms.`);

    // 4. Print counts of seeded tables for confirmation
    console.log('\n📊 Row Counts for Verification:');
    const tables = [
      'users',
      'profiles',
      'jobs',
      'resumes',
      'applications',
      'notifications',
    ];
    for (const table of tables) {
      const result = await db.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`   - ${table}: ${result.rows[0].count} rows`);
    }

    console.log('='.repeat(60));
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seeding failed:');
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

runSeed();
