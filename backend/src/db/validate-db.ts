/* eslint-disable no-console */
import { Pool } from 'pg';

/**
 * Database Validation Script
 * Verifies the complete database schema is correctly deployed.
 *
 * Usage: npx ts-node-dev src/db/validate-db.ts
 *
 * Checks:
 * 1. Database connectivity
 * 2. All 8 tables exist
 * 3. All 5 enum types exist
 * 4. All 12 indexes exist
 * 5. Constraint enforcement (unique email, unique application)
 * 6. Cascade delete behavior
 * 7. updated_at trigger functionality
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
});

let passed = 0;
let failed = 0;

function logPass(test: string): void {
  passed++;
  console.log(`  ✅ PASS: ${test}`);
}

function logFail(test: string, error?: string): void {
  failed++;
  console.error(`  ❌ FAIL: ${test}${error ? ` — ${error}` : ''}`);
}

async function checkConnection(): Promise<boolean> {
  console.log('\n🔗 Test 1: Database Connectivity');
  try {
    const result = await pool.query('SELECT NOW() AS current_time');
    logPass(`Connected at ${result.rows[0].current_time}`);
    return true;
  } catch (err) {
    logFail('Database connection', (err as Error).message);
    return false;
  }
}

async function checkTables(): Promise<void> {
  console.log('\n📋 Test 2: Table Existence');
  const expectedTables = [
    'users',
    'profiles',
    'jobs',
    'resumes',
    'applications',
    'ai_analysis',
    'notifications',
    'refresh_tokens',
  ];

  for (const table of expectedTables) {
    try {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        ) AS exists`,
        [table]
      );
      if (result.rows[0].exists) {
        logPass(`Table "${table}" exists`);
      } else {
        logFail(`Table "${table}" does not exist`);
      }
    } catch (err) {
      logFail(`Table "${table}" check`, (err as Error).message);
    }
  }
}

async function checkEnums(): Promise<void> {
  console.log('\n🏷️  Test 3: Enum Type Existence');
  const expectedEnums = [
    'user_role',
    'job_type',
    'job_status',
    'application_status',
    'analysis_type',
  ];

  for (const enumName of expectedEnums) {
    try {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = $1
        ) AS exists`,
        [enumName]
      );
      if (result.rows[0].exists) {
        logPass(`Enum "${enumName}" exists`);
      } else {
        logFail(`Enum "${enumName}" does not exist`);
      }
    } catch (err) {
      logFail(`Enum "${enumName}" check`, (err as Error).message);
    }
  }
}

async function checkIndexes(): Promise<void> {
  console.log('\n📇 Test 4: Index Existence');
  const expectedIndexes = [
    'idx_jobs_status',
    'idx_jobs_posted_by',
    'idx_jobs_created_at',
    'idx_applications_job_id',
    'idx_applications_user_id',
    'idx_applications_status',
    'idx_resumes_user_id',
    'idx_ai_analysis_resume_id',
    'idx_ai_analysis_type',
    'idx_notifications_user_id',
    'idx_notifications_is_read',
    'idx_refresh_tokens_user_id',
  ];

  for (const index of expectedIndexes) {
    try {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = $1
        ) AS exists`,
        [index]
      );
      if (result.rows[0].exists) {
        logPass(`Index "${index}" exists`);
      } else {
        logFail(`Index "${index}" does not exist`);
      }
    } catch (err) {
      logFail(`Index "${index}" check`, (err as Error).message);
    }
  }
}

async function checkConstraints(): Promise<void> {
  console.log('\n🔒 Test 5: Constraint Enforcement');

  // Test unique email constraint
  try {
    await pool.query('BEGIN');
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ('constraint_test@test.com', 'hash123', 'Test User', 'USER')`
    );
    try {
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ('constraint_test@test.com', 'hash456', 'Duplicate User', 'USER')`
      );
      logFail('Unique email constraint — duplicate insert succeeded');
    } catch {
      logPass('Unique email constraint — duplicate insert correctly rejected');
    }
    await pool.query('ROLLBACK');
  } catch (err) {
    logFail('Unique email constraint test setup', (err as Error).message);
    await pool.query('ROLLBACK');
  }

  // Test unique application constraint (one application per user per job)
  try {
    await pool.query('BEGIN');
    // Create test user, admin, job, and resume
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ('app_constraint_user@test.com', 'hash123', 'App Test User', 'USER')
       RETURNING id`
    );
    const userId = userResult.rows[0].id;

    const adminResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ('app_constraint_admin@test.com', 'hash123', 'App Test Admin', 'ADMIN')
       RETURNING id`
    );
    const adminId = adminResult.rows[0].id;

    const jobResult = await pool.query(
      `INSERT INTO jobs (posted_by, title, company, description, requirements, location)
       VALUES ($1, 'Test Job', 'Test Co', 'Desc', 'Reqs', 'Test City')
       RETURNING id`,
      [adminId]
    );
    const jobId = jobResult.rows[0].id;

    const resumeResult = await pool.query(
      `INSERT INTO resumes (user_id, name, file_url, file_key, file_name, storage_path, resume_title)
       VALUES ($1, 'Test Resume', 'https://test.com/resume.pdf', 'test/resume.pdf', 'test-resume.pdf', 'resumes/test/resume.pdf', 'Test Resume')
       RETURNING id`,
      [userId]
    );
    const resumeId = resumeResult.rows[0].id;

    // First application should succeed
    await pool.query(
      `INSERT INTO applications (job_id, user_id, resume_id)
       VALUES ($1, $2, $3)`,
      [jobId, userId, resumeId]
    );

    // Second application to same job by same user should fail
    try {
      await pool.query(
        `INSERT INTO applications (job_id, user_id, resume_id)
         VALUES ($1, $2, $3)`,
        [jobId, userId, resumeId]
      );
      logFail(
        'Unique application constraint — duplicate application succeeded'
      );
    } catch {
      logPass(
        'Unique application constraint — duplicate application correctly rejected'
      );
    }
    await pool.query('ROLLBACK');
  } catch (err) {
    logFail('Unique application constraint test setup', (err as Error).message);
    await pool.query('ROLLBACK');
  }

  // Test cascade delete (deleting user cascades to profile)
  try {
    await pool.query('BEGIN');
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ('cascade_test@test.com', 'hash123', 'Cascade Test', 'USER')
       RETURNING id`
    );
    const userId = userResult.rows[0].id;

    await pool.query(
      `INSERT INTO profiles (user_id, headline)
       VALUES ($1, 'Test Headline')`,
      [userId]
    );

    // Verify profile exists
    const beforeDelete = await pool.query(
      'SELECT COUNT(*) FROM profiles WHERE user_id = $1',
      [userId]
    );

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    // Verify profile was cascade-deleted
    const afterDelete = await pool.query(
      'SELECT COUNT(*) FROM profiles WHERE user_id = $1',
      [userId]
    );

    if (
      parseInt(beforeDelete.rows[0].count) === 1 &&
      parseInt(afterDelete.rows[0].count) === 0
    ) {
      logPass('CASCADE DELETE — user deletion removes profile');
    } else {
      logFail('CASCADE DELETE — profile was not removed');
    }
    await pool.query('ROLLBACK');
  } catch (err) {
    logFail('CASCADE DELETE test', (err as Error).message);
    await pool.query('ROLLBACK');
  }
}

async function checkTriggers(): Promise<void> {
  console.log('\n⚡ Test 6: updated_at Trigger');

  let userId: string | null = null;
  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ('trigger_test@test.com', 'hash123', 'Trigger Test', 'USER')
       RETURNING id, updated_at`
    );
    userId = result.rows[0].id;
    const originalUpdatedAt = result.rows[0].updated_at;

    // Wait briefly to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Update the user
    const updateResult = await pool.query(
      `UPDATE users SET name = 'Trigger Test Updated' WHERE id = $1 RETURNING updated_at`,
      [userId]
    );
    const newUpdatedAt = updateResult.rows[0].updated_at;

    if (new Date(newUpdatedAt) > new Date(originalUpdatedAt)) {
      logPass(
        `updated_at trigger works (${originalUpdatedAt} → ${newUpdatedAt})`
      );
    } else {
      logFail('updated_at trigger — timestamp was not updated');
    }
  } catch (err) {
    logFail('updated_at trigger test', (err as Error).message);
  } finally {
    if (userId) {
      try {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      } catch (err) {
        console.error(
          'Error cleaning up trigger test user:',
          (err as Error).message
        );
      }
    }
  }
}

async function checkSeedData(): Promise<void> {
  console.log('\n🌱 Test 7: Seed Data Verification');

  const checks = [
    { table: 'users', expected: 7, label: 'Users (2 admins + 5 users)' },
    { table: 'profiles', expected: 7, label: 'Profiles' },
    { table: 'jobs', expected: 6, label: 'Jobs' },
    { table: 'resumes', expected: 5, label: 'Resumes' },
    { table: 'applications', expected: 6, label: 'Applications' },
    { table: 'notifications', expected: 6, label: 'Notifications' },
  ];

  for (const check of checks) {
    try {
      const result = await pool.query(`SELECT COUNT(*) FROM ${check.table}`);
      const count = parseInt(result.rows[0].count);
      if (count >= check.expected) {
        logPass(`${check.label}: ${count} rows`);
      } else {
        logFail(`${check.label}: expected >= ${check.expected}, got ${count}`);
      }
    } catch (err) {
      logFail(`${check.label} count`, (err as Error).message);
    }
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('  AI Job Portal — Database Validation Script');
  console.log('='.repeat(60));

  const connected = await checkConnection();
  if (!connected) {
    console.log('\n❌ Cannot proceed without database connection.');
    await pool.end();
    process.exit(1);
  }

  await checkTables();
  await checkEnums();
  await checkIndexes();
  await checkConstraints();
  await checkTriggers();
  await checkSeedData();

  console.log('\n' + '='.repeat(60));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main();
