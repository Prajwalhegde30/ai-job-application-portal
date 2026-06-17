/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
import { Server } from 'http';
import app from '../app';
import { db, connectDatabase, disconnectDatabase } from '../config/database';

const TEST_PORT = 8081;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

let server: Server;
let passedTests = 0;
let failedTests = 0;

function logPass(test: string, details?: string): void {
  passedTests++;
  console.log(`  ✅ PASS: ${test}${details ? ` (${details})` : ''}`);
}

function logFail(test: string, error?: string): void {
  failedTests++;
  console.error(`  ❌ FAIL: ${test}${error ? ` — ${error}` : ''}`);
}

// Parse Set-Cookie header to extract refresh token
function extractCookie(
  cookieHeader: string | null,
  name: string
): string | null {
  if (!cookieHeader) return null;

  // Set-Cookie can be an array if multiple cookies are set, or a comma-separated string
  const cookies = cookieHeader.split(/,(?=[^;]+;)/);
  for (const cookie of cookies) {
    const parts = cookie.split(';');
    const mainPart = parts[0].trim();
    const [cookieName, cookieValue] = mainPart.split('=');
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
}

async function runTests(): Promise<void> {
  console.log('='.repeat(80));
  console.log('  AI Job Portal — Authentication Integration Tests');
  console.log('='.repeat(80));

  try {
    // 1. Setup DB and Server
    await connectDatabase(3, 1000);
    server = app.listen(TEST_PORT);
    console.log(`Test server started on port ${TEST_PORT}\n`);

    // Let's keep track of cookies and tokens
    let registeredUserId = '';

    const testEmail = `integration_test_${Date.now()}@test.com`;
    const testPassword = 'TestPassword@123';

    // -------------------------------------------------------------
    // Test 1: Register with ADMIN role in body (should be rejected)
    // -------------------------------------------------------------
    console.log(
      '--- Test 1: Strict Body Validation (Privilege Escalation Prevention) ---'
    );
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Hacker Admin',
          email: testEmail,
          password: testPassword,
          role: 'ADMIN', // disallowed field
        }),
      });
      const data: any = await res.json();
      if (res.status === 400 && data.success === false) {
        logPass('Register with role=ADMIN rejected with 400 Bad Request');
      } else {
        logFail(
          `Register with role=ADMIN should fail with 400, got ${res.status}`,
          JSON.stringify(data)
        );
      }
    } catch (err) {
      logFail(
        'Register with role=ADMIN test threw error',
        (err as Error).message
      );
    }

    // -------------------------------------------------------------
    // Test 2: Register with valid USER data (should succeed)
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Valid Registration & Cookie Check ---');
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Integration Test User',
          email: testEmail,
          password: testPassword,
        }),
      });

      const data: any = await res.json();
      const setCookie = res.headers.get('set-cookie');
      const refreshToken = extractCookie(setCookie, 'refreshToken');

      if (
        res.status === 201 &&
        data.success === true &&
        data.data.accessToken &&
        refreshToken
      ) {
        logPass(
          'Successful registration returns 201 + accessToken + refreshToken cookie'
        );
        registeredUserId = data.data.user.id;
      } else {
        logFail(
          'Valid registration failed',
          `Status: ${res.status}, Body: ${JSON.stringify(data)}`
        );
      }
    } catch (err) {
      logFail('Valid registration test threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 3: Profile Auto-Creation Check
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Profile Auto-Creation Verification ---');
    if (registeredUserId) {
      try {
        const result = await db.query(
          'SELECT * FROM profiles WHERE user_id = $1',
          [registeredUserId]
        );
        if (result.rows.length === 1) {
          logPass(
            'Profile auto-creation confirmed: 1 profile record exists for new user',
            `Profile ID: ${result.rows[0].id}`
          );
        } else {
          logFail(
            `Expected 1 profile for user ${registeredUserId}, found ${result.rows.length}`
          );
        }
      } catch (err) {
        logFail('Profile verification DB query failed', (err as Error).message);
      }
    } else {
      logFail('Skipped: Registration step failed, no user ID available');
    }

    // -------------------------------------------------------------
    // Test 4: Duplicate Registration (should fail with 409)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Duplicate Registration Check ---');
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Integration Test User',
          email: testEmail,
          password: testPassword,
        }),
      });
      const data: any = await res.json();
      if (res.status === 409 && data.success === false) {
        logPass(
          'Duplicate email registration correctly rejected with 409 Conflict'
        );
      } else {
        logFail(
          `Duplicate registration should fail with 409, got ${res.status}`,
          JSON.stringify(data)
        );
      }
    } catch (err) {
      logFail(
        'Duplicate registration test threw error',
        (err as Error).message
      );
    }

    // -------------------------------------------------------------
    // Test 5: Login Deterministic Admin Account (admin@test.com)
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Deterministic Admin Login Flow ---');
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'Admin@123',
        }),
      });
      const data: any = await res.json();
      const setCookie = res.headers.get('set-cookie');
      const refreshToken = extractCookie(setCookie, 'refreshToken');

      if (
        res.status === 200 &&
        data.success === true &&
        data.data.accessToken &&
        data.data.user.role === 'ADMIN' &&
        refreshToken
      ) {
        logPass(
          'Admin login succeeded (200 OK), returned role ADMIN and refresh cookie'
        );
      } else {
        logFail(
          'Admin login failed',
          `Status: ${res.status}, Role: ${data?.data?.user?.role}, Cookie: ${!!refreshToken}`
        );
      }
    } catch (err) {
      logFail('Admin login test threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 6: Login Deterministic User Account (user@test.com)
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Deterministic User Login Flow ---');
    let userAccessToken = '';
    let userRefreshToken = '';
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: 'User@123',
        }),
      });
      const data: any = await res.json();
      const setCookie = res.headers.get('set-cookie');
      const refreshToken = extractCookie(setCookie, 'refreshToken');

      if (
        res.status === 200 &&
        data.success === true &&
        data.data.accessToken &&
        data.data.user.role === 'USER' &&
        refreshToken
      ) {
        logPass(
          'User login succeeded (200 OK), returned role USER and refresh cookie'
        );
        userAccessToken = data.data.accessToken;
        userRefreshToken = refreshToken;
      } else {
        logFail(
          'User login failed',
          `Status: ${res.status}, Role: ${data?.data?.user?.role}, Cookie: ${!!refreshToken}`
        );
      }
    } catch (err) {
      logFail('User login test threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 7: Login Wrong Password / Non-existent email
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Authentication Failure Handling ---');
    try {
      // Wrong password
      const res1 = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: 'WrongPassword@123',
        }),
      });
      if (res1.status === 401) {
        logPass('Login with invalid password rejected with 401 Unauthorized');
      } else {
        logFail(`Login with wrong password expected 401, got ${res1.status}`);
      }

      // Non-existent email
      const res2 = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: 'User@123',
        }),
      });
      if (res2.status === 401) {
        logPass('Login with non-existent email rejected with 401 Unauthorized');
      } else {
        logFail(
          `Login with non-existent email expected 401, got ${res2.status}`
        );
      }
    } catch (err) {
      logFail(
        'Auth failure handling tests threw error',
        (err as Error).message
      );
    }

    // -------------------------------------------------------------
    // Test 8: Get /auth/me Flow (Verified & Unverified)
    // -------------------------------------------------------------
    console.log('\n--- Test 8: GET /auth/me Flow ---');
    try {
      // 1. Success case
      const res1 = await fetch(`${BASE_URL}/auth/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${userAccessToken}` },
      });
      const data1: any = await res1.json();
      if (
        res1.status === 200 &&
        data1.success === true &&
        data1.data.email === 'user@test.com'
      ) {
        logPass('GET /auth/me succeeds with valid Bearer token');
      } else {
        logFail(
          'GET /auth/me with valid token failed',
          `Status: ${res1.status}`
        );
      }

      // 2. No token case
      const res2 = await fetch(`${BASE_URL}/auth/me`, {
        method: 'GET',
      });
      if (res2.status === 401) {
        logPass('GET /auth/me without header rejected with 401');
      } else {
        logFail(`GET /auth/me without header expected 401, got ${res2.status}`);
      }

      // 3. Expired/Invalid token case
      const res3 = await fetch(`${BASE_URL}/auth/me`, {
        method: 'GET',
        headers: { Authorization: 'Bearer invalid-token-value' },
      });
      if (res3.status === 401) {
        logPass('GET /auth/me with invalid token rejected with 401');
      } else {
        logFail(
          `GET /auth/me with invalid token expected 401, got ${res3.status}`
        );
      }
    } catch (err) {
      logFail('GET /auth/me tests threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 9: Refresh Token Rotation
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Refresh Token Rotation Flow ---');
    let rotatedAccessToken = '';
    let rotatedRefreshToken = '';
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          Cookie: `refreshToken=${encodeURIComponent(userRefreshToken)}`,
        },
      });
      const data: any = await res.json();
      const setCookie = res.headers.get('set-cookie');
      const refreshToken = extractCookie(setCookie, 'refreshToken');

      if (
        res.status === 200 &&
        data.success === true &&
        data.data.accessToken &&
        refreshToken
      ) {
        logPass(
          'Token refresh succeeds, returns new access token & rotates refresh token cookie'
        );
        rotatedAccessToken = data.data.accessToken;
        rotatedRefreshToken = refreshToken;

        if (rotatedRefreshToken !== userRefreshToken) {
          logPass(
            'Refresh token rotation verified: new refresh token is different from old token'
          );
        } else {
          logFail('Refresh token rotation failed: same refresh token returned');
        }
      } else {
        logFail(
          'Token refresh failed',
          `Status: ${res.status}, Body: ${JSON.stringify(data)}`
        );
      }
    } catch (err) {
      logFail('Token refresh test threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 10: Refresh with Revoked Token (Replay attack detection)
    // -------------------------------------------------------------
    console.log(
      '\n--- Test 10: Refresh Token Replay Protection (Revoked Token Check) ---'
    );
    try {
      // Re-using 'userRefreshToken' which should now be revoked due to rotation
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          Cookie: `refreshToken=${encodeURIComponent(userRefreshToken)}`,
        },
      });
      const data: any = await res.json();
      if (res.status === 401) {
        logPass(
          'Refresh with previously rotated/revoked token correctly rejected with 401'
        );
      } else {
        logFail(
          `Expected 401 for revoked refresh token, got ${res.status}`,
          JSON.stringify(data)
        );
      }
    } catch (err) {
      logFail(
        'Refresh replay prevention test threw error',
        (err as Error).message
      );
    }

    // -------------------------------------------------------------
    // Test 11: Logout Flow
    // -------------------------------------------------------------
    console.log('\n--- Test 11: Logout & Cookie Clear Flow ---');
    try {
      const res = await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${rotatedAccessToken}`,
          Cookie: `refreshToken=${encodeURIComponent(rotatedRefreshToken)}`,
        },
      });
      const data: any = await res.json();
      const setCookie = res.headers.get('set-cookie');

      // Cookie is cleared if Max-Age is 0 or Expires is in the past, or empty
      const isCleared =
        setCookie &&
        (setCookie.includes('Max-Age=0') || setCookie.includes('1970'));

      if (res.status === 200 && data.success === true && isCleared) {
        logPass(
          'Logout succeeds (200 OK), revokes token and clears the refreshToken cookie'
        );
      } else {
        logFail(
          'Logout failed',
          `Status: ${res.status}, CookieCleared: ${!!isCleared}`
        );
      }
    } catch (err) {
      logFail('Logout test threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 12: Refresh after Logout (should fail)
    // -------------------------------------------------------------
    console.log('\n--- Test 12: Post-Logout Token Revocation Verification ---');
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          Cookie: `refreshToken=${encodeURIComponent(rotatedRefreshToken)}`,
        },
      });
      if (res.status === 401) {
        logPass(
          'Refresh attempt using logged-out token fails with 401 Unauthorized'
        );
      } else {
        logFail(`Refresh after logout expected 401, got ${res.status}`);
      }
    } catch (err) {
      logFail('Post-logout refresh test threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Cleanup registered integration test user to leave DB clean
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up test user from database... ---');
    if (registeredUserId) {
      try {
        await db.query('DELETE FROM users WHERE id = $1', [registeredUserId]);
        console.log(
          '  Cleaned up integration test user & profile record successfully.'
        );
      } catch (err) {
        console.error(
          '  Failed to clean up integration test user:',
          (err as Error).message
        );
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(
      `  Tests completed: ${passedTests} passed, ${failedTests} failed`
    );
    console.log('='.repeat(80));

    // Force exit cleanly
    if (failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during integration tests:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDatabase();
  }
}

runTests();
