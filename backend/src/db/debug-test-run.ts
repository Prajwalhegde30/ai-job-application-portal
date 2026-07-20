/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
import app from '../app';
import { db, connectDatabase, disconnectDatabase } from '../config/database';
import { logger } from '../utils/logger';

// Force logger to print in tests
logger.silent = false;
logger.level = 'debug';

const TEST_PORT = 8122;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

async function main() {
  await connectDatabase(3, 1000);
  const server = app.listen(TEST_PORT);
  console.log(`Test server started on port ${TEST_PORT}`);

  const client = db;
  const timestamp = Date.now();
  const userAEmail = `notiftest_usera_${timestamp}@test.com`;
  const userBEmail = `notiftest_userb_${timestamp}@test.com`;
  const adminAEmail = `notiftest_admina_${timestamp}@test.com`;
  const password = 'TestPass123!';

  console.log('--- Registering Users ---');

  // Register User A
  let res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User A', email: userAEmail, password }),
  });
  const userAData: any = await res.json();
  const userAId = userAData.data.user.id;
  const userAToken = userAData.data.accessToken;

  // Register User B
  res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User B', email: userBEmail, password }),
  });
  const userBData: any = await res.json();
  const userBId = userBData.data.user.id;
  const userBToken = userBData.data.accessToken;

  // Register Admin A
  res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Admin A', email: adminAEmail, password }),
  });
  const adminAData: any = await res.json();
  const adminAId = adminAData.data.user.id;

  // Update Admin A role in DB
  await client.query("UPDATE users SET role = 'ADMIN' WHERE id = $1", [
    adminAId,
  ]);

  // Log in Admin A to get a token with ADMIN role
  res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminAEmail, password }),
  });
  const adminALoginData: any = await res.json();
  const adminAToken = adminALoginData.data.accessToken;

  console.log(
    `Registered User A: ${userAId}, User B: ${userBId}, Admin A: ${adminAId}`
  );

  // Clear notifications
  await client.query('DELETE FROM notifications');

  console.log('--- Admin A creating published job ---');
  res = await fetch(`${BASE_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAToken}`,
    },
    body: JSON.stringify({
      title: 'Test Job ' + timestamp,
      company: 'SecureCorp',
      description: 'Secure everything.',
      requirements: 'Security testing.',
      location: 'Remote',
      jobType: 'REMOTE',
      status: 'PUBLISHED',
    }),
  });
  const jobData: any = await res.json();
  const jobId = jobData.data.job.id;
  console.log('Created Job:', jobId);

  console.log('Sleeping 1 second for async notification processing...');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('--- NOTIFICATIONS IN DATABASE ---');
  const notifRes = await client.query('SELECT * FROM notifications');
  console.log('Total notifications in DB:', notifRes.rows.length);
  console.log(notifRes.rows);

  console.log('--- Fetching notifications via API ---');
  // Fetch for User A
  res = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${userAToken}` },
  });
  const notifA: any = await res.json();
  console.log('User A API response:', JSON.stringify(notifA.data));

  // Fetch for User B
  res = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  const notifB: any = await res.json();
  console.log('User B API response:', JSON.stringify(notifB.data));

  // Cleanup
  await client.query('DELETE FROM notifications');
  await client.query('DELETE FROM jobs WHERE id = $1', [jobId]);
  await client.query('DELETE FROM users WHERE email IN ($1, $2, $3)', [
    userAEmail,
    userBEmail,
    adminAEmail,
  ]);

  server.close();
  await disconnectDatabase();
}

main().catch(console.error);
