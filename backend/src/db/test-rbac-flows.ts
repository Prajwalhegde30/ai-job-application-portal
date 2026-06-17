/* eslint-disable no-console */
/**
 * RBAC Authorization Integration Tests
 * Tests the requireRole() middleware against live endpoints.
 *
 * Requirements:
 *   - Backend server running on PORT 8080
 *   - Seed accounts: admin@test.com / Admin@123, user@test.com / User@123
 *
 * Test Matrix:
 *   1. Admin can access /rbac-test/admin-only → 200
 *   2. User cannot access /rbac-test/admin-only → 403
 *   3. User can access /rbac-test/user-only → 200
 *   4. Admin cannot access /rbac-test/user-only → 403
 *   5. Admin can access /rbac-test/both → 200
 *   6. User can access /rbac-test/both → 200
 *   7. Unauthenticated request to /rbac-test/admin-only → 401
 *   8. Unauthenticated request to /rbac-test/user-only → 401
 *   9. Admin /rbac-test/whoami returns correct role
 *  10. User /rbac-test/whoami returns correct role
 */

import http from 'http';

const PORT = 8080;

let passed = 0;
let failed = 0;

interface TestResult {
  name: string;
  passed: boolean;
  expected: number;
  actual: number;
  detail?: string;
}

const results: TestResult[] = [];

/**
 * Simple HTTP request helper (no external deps).
 */
async function request(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  token?: string
): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const options: http.RequestOptions = {
      hostname: 'localhost',
      port: PORT,
      path: `/api/v1${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode ?? 0, data: {} });
        }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function assert(
  name: string,
  actual: number,
  expected: number,
  detail?: string
): void {
  const ok = actual === expected;
  results.push({ name, passed: ok, expected, actual, detail });
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(
      `  ❌ ${name} — expected ${expected}, got ${actual}${detail ? ' | ' + detail : ''}`
    );
  }
}

async function getToken(email: string, password: string): Promise<string> {
  const res = await request('POST', '/auth/login', { email, password });
  if (res.status !== 200) {
    throw new Error(
      `Login failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`
    );
  }
  return (res.data as { data: { accessToken: string } }).data.accessToken;
}

async function runTests(): Promise<void> {
  console.log('\n🛡️  RBAC Authorization Integration Tests');
  console.log('=========================================\n');

  // ─── Obtain tokens ───────────────────────────────────────────────────────
  let adminToken: string;
  let userToken: string;

  try {
    console.log('  Logging in as admin@test.com...');
    adminToken = await getToken('admin@test.com', 'Admin@123');
    console.log('  ✅ Admin token obtained\n');
  } catch (e) {
    console.error(`  ❌ Failed to get admin token: ${(e as Error).message}`);
    process.exit(1);
  }

  try {
    console.log('  Logging in as user@test.com...');
    userToken = await getToken('user@test.com', 'User@123');
    console.log('  ✅ User token obtained\n');
  } catch (e) {
    console.error(`  ❌ Failed to get user token: ${(e as Error).message}`);
    process.exit(1);
  }

  // ─── Test 1: Admin → /admin-only → 200 ──────────────────────────────────
  console.log('GROUP 1: ADMIN-ONLY endpoint tests');
  {
    const res = await request(
      'GET',
      '/rbac-test/admin-only',
      undefined,
      adminToken
    );
    assert('Admin can access /rbac-test/admin-only', res.status, 200);
  }

  // ─── Test 2: User → /admin-only → 403 ──────────────────────────────────
  {
    const res = await request(
      'GET',
      '/rbac-test/admin-only',
      undefined,
      userToken
    );
    assert('User cannot access /rbac-test/admin-only (403)', res.status, 403);
    const errCode = (res.data as { error?: { code: string } }).error?.code;
    assert(
      'Error code is FORBIDDEN on role denial',
      errCode === 'FORBIDDEN' ? 200 : 403,
      200,
      `code=${errCode}`
    );
  }

  // ─── Test 3: User → /user-only → 200 ────────────────────────────────────
  console.log('\nGROUP 2: USER-ONLY endpoint tests');
  {
    const res = await request(
      'GET',
      '/rbac-test/user-only',
      undefined,
      userToken
    );
    assert('User can access /rbac-test/user-only', res.status, 200);
  }

  // ─── Test 4: Admin → /user-only → 403 ───────────────────────────────────
  {
    const res = await request(
      'GET',
      '/rbac-test/user-only',
      undefined,
      adminToken
    );
    assert('Admin cannot access /rbac-test/user-only (403)', res.status, 403);
  }

  // ─── Test 5 & 6: Both → /both → 200 ────────────────────────────────────
  console.log('\nGROUP 3: BOTH-ROLES endpoint tests');
  {
    const adminRes = await request(
      'GET',
      '/rbac-test/both',
      undefined,
      adminToken
    );
    assert('Admin can access /rbac-test/both', adminRes.status, 200);
  }
  {
    const userRes = await request(
      'GET',
      '/rbac-test/both',
      undefined,
      userToken
    );
    assert('User can access /rbac-test/both', userRes.status, 200);
  }

  // ─── Test 7 & 8: Unauthenticated → 401 ──────────────────────────────────
  console.log('\nGROUP 4: Unauthenticated access tests');
  {
    const res = await request('GET', '/rbac-test/admin-only');
    assert('Unauthenticated → /admin-only returns 401', res.status, 401);
  }
  {
    const res = await request('GET', '/rbac-test/user-only');
    assert('Unauthenticated → /user-only returns 401', res.status, 401);
  }

  // ─── Test 9 & 10: whoami role validation ─────────────────────────────────
  console.log('\nGROUP 5: whoami role payload tests');
  {
    const res = await request(
      'GET',
      '/rbac-test/whoami',
      undefined,
      adminToken
    );
    const role = (res.data as { data?: { user?: { role: string } } }).data?.user
      ?.role;
    assert(
      'Admin whoami returns ADMIN role',
      role === 'ADMIN' ? 200 : 403,
      200,
      `role=${role}`
    );
  }
  {
    const res = await request('GET', '/rbac-test/whoami', undefined, userToken);
    const role = (res.data as { data?: { user?: { role: string } } }).data?.user
      ?.role;
    assert(
      'User whoami returns USER role',
      role === 'USER' ? 200 : 403,
      200,
      `role=${role}`
    );
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('\n=========================================');
  console.log(
    `Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`
  );

  if (failed > 0) {
    console.log('\n❌ RBAC tests FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ All RBAC tests PASSED');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
