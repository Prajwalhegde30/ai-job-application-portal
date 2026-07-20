/* eslint-disable no-console */
process.env.NODE_ENV = 'test';
import { Server } from 'http';
import app from '../app';
import { connectDatabase, disconnectDatabase } from '../config/database';
import http from 'http';

const PORT = 8084;
let server: Server;

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
  console.log('\n👤  Profile Management Integration Tests');
  console.log('=========================================\n');

  try {
    // 1. Setup DB and Server
    await connectDatabase(3, 1000);
    server = app.listen(PORT);
    console.log(`Test server started on port ${PORT}\n`);

    // ─── Group 1: Unauthenticated tests ─────────────────────────────────────
    console.log('GROUP 1: Unauthenticated access tests');
    {
      const res = await request('GET', '/profile');
      assert('Unauthenticated GET /profile returns 401', res.status, 401);
    }
    {
      const res = await request('PUT', '/profile', { headline: 'Test' });
      assert('Unauthenticated PUT /profile returns 401', res.status, 401);
    }
    {
      const res = await request(
        'GET',
        '/profile/4b7a151b-4029-4e78-8314-e223bfd6995a'
      );
      assert(
        'Unauthenticated GET /profile/:userId returns 401',
        res.status,
        401
      );
    }
    {
      const res = await request(
        'GET',
        '/profile/public/4b7a151b-4029-4e78-8314-e223bfd6995a'
      );
      assert(
        'Unauthenticated GET /profile/public/:userId returns 401',
        res.status,
        401
      );
    }

    // ─── Obtain tokens ───────────────────────────────────────────────────────
    let adminToken: string;
    let userToken: string;

    try {
      console.log('\n  Logging in to obtain tokens...');
      adminToken = await getToken('admin@test.com', 'Admin@123');
      console.log('  ✅ Admin token obtained');
      userToken = await getToken('user@test.com', 'User@123');
      console.log('  ✅ User token obtained\n');
    } catch (e) {
      console.error(`  ❌ Failed to obtain tokens: ${(e as Error).message}`);
      process.exit(1);
    }

    // ─── Group 2: Retrieve own profile ───────────────────────────────────────
    console.log('GROUP 2: Retrieve own profile');
    let userUserId: string;
    let adminUserId: string;

    {
      const res = await request('GET', '/profile', undefined, userToken);
      assert('User can retrieve own profile (200)', res.status, 200);
      const profile = (res.data as { data: { profile: { user_id: string } } })
        .data?.profile;
      userUserId = profile?.user_id;
      assert(
        'User profile has valid user_id',
        userUserId ? 200 : 500,
        200,
        `user_id=${userUserId}`
      );
    }

    {
      const res = await request('GET', '/profile', undefined, adminToken);
      assert('Admin can retrieve own profile (200)', res.status, 200);
      const profile = (res.data as { data: { profile: { user_id: string } } })
        .data?.profile;
      adminUserId = profile?.user_id;
      assert(
        'Admin profile has valid user_id',
        adminUserId ? 200 : 500,
        200,
        `user_id=${adminUserId}`
      );
    }

    // ─── Group 3: Admin vs User Role Access to GET /profile/:userId ─────────
    console.log('\nGROUP 3: Admin endpoint authorization /profile/:userId');
    {
      // User attempts to view admin's full profile via Admin route
      const res = await request(
        'GET',
        `/profile/${adminUserId}`,
        undefined,
        userToken
      );
      assert(
        'User cannot view other profile via GET /profile/:userId (403)',
        res.status,
        403
      );
    }
    {
      // User attempts to view own full profile via Admin route
      const res = await request(
        'GET',
        `/profile/${userUserId}`,
        undefined,
        userToken
      );
      assert(
        'User cannot view own profile via GET /profile/:userId (403)',
        res.status,
        403
      );
    }
    {
      // Admin views user's full profile
      const res = await request(
        'GET',
        `/profile/${userUserId}`,
        undefined,
        adminToken
      );
      assert(
        'Admin CAN view user profile via GET /profile/:userId (200)',
        res.status,
        200
      );
      const responseData = res.data as {
        data: { profile: { user_id: string } };
      };
      assert(
        'Admin received correct user profile',
        responseData.data?.profile?.user_id === userUserId ? 200 : 500,
        200
      );
    }

    // ─── Group 4: Public Profiles GET /profile/public/:userId ────────────────
    console.log(
      '\nGROUP 4: Public profile access (recruiter viewing candidates)'
    );
    {
      // User GET public profile of Admin
      const res = await request(
        'GET',
        `/profile/public/${adminUserId}`,
        undefined,
        userToken
      );
      assert('User can view admin public profile (200)', res.status, 200);
      const profile = (
        res.data as { data: { profile: Record<string, unknown> } }
      ).data?.profile;
      assert(
        'Public profile excludes phone',
        profile?.phone === undefined ? 200 : 500,
        200
      );
      assert(
        'Public profile excludes user_id',
        profile?.user_id === undefined ? 200 : 500,
        200
      );
      assert(
        'Public profile excludes id',
        profile?.id === undefined ? 200 : 500,
        200
      );
      assert(
        'Public profile contains user_name',
        typeof profile?.user_name === 'string' ? 200 : 500,
        200
      );
      assert(
        'Public profile contains user_role',
        typeof profile?.user_role === 'string' ? 200 : 500,
        200
      );
    }

    // ─── Group 5: Validation Failures (400) ──────────────────────────────────
    console.log('\nGROUP 5: Put validation errors');
    {
      // Invalid phone regex check
      const res = await request(
        'PUT',
        '/profile',
        { phone: '123-abc-456' },
        userToken
      );
      assert('Update with invalid phone format returns 400', res.status, 400);
    }
    {
      // Invalid website URL check
      const res = await request(
        'PUT',
        '/profile',
        { website: 'ftp://mywebsite.com' },
        userToken
      );
      assert('Update with non-http/https URL returns 400', res.status, 400);
    }
    {
      // Invalid linkedin URL check
      const res = await request(
        'PUT',
        '/profile',
        { linkedin_url: 'https://google.com' },
        userToken
      );
      assert(
        'Update with non-linkedin URL for linkedin_url returns 400',
        res.status,
        400
      );
    }
    {
      // Invalid github URL check
      const res = await request(
        'PUT',
        '/profile',
        { github_url: 'https://linkedin.com' },
        userToken
      );
      assert(
        'Update with non-github URL for github_url returns 400',
        res.status,
        400
      );
    }
    {
      // Invalid experience check (missing required fields)
      const res = await request(
        'PUT',
        '/profile',
        { experience: [{ company: 'Test' }] },
        userToken
      );
      assert(
        'Update with incomplete experience entry returns 400',
        res.status,
        400
      );
    }
    {
      // Invalid education check (startYear out of bounds)
      const res = await request(
        'PUT',
        '/profile',
        {
          education: [
            {
              institution: 'Test College',
              degree: 'BS',
              field: 'CS',
              startYear: 1800,
              endYear: 1804,
            },
          ],
        },
        userToken
      );
      assert('Update with startYear before 1950 returns 400', res.status, 400);
    }

    // ─── Group 6: Successful profile update and completion scoring ─────────
    console.log('\nGROUP 6: Profile update and completion logic');
    {
      // First, clear profile fields to test score builds
      const clearRes = await request(
        'PUT',
        '/profile',
        {
          headline: '',
          bio: '',
          location: '',
          phone: '',
          website: '',
          linkedin_url: '',
          github_url: '',
          skills: [],
          experience: [],
          education: [],
        },
        userToken
      );
      assert('Resetting profile to empty returns 200', clearRes.status, 200);
      const completion = (
        clearRes.data as { data: { completionPercentage: number } }
      ).data?.completionPercentage;
      assert('Empty profile completion score is 0', completion, 0);

      // Update with complete profile
      const updateRes = await request(
        'PUT',
        '/profile',
        {
          headline: 'Lead Developer',
          bio: 'Just another passionate coder.',
          location: 'Seattle, WA',
          phone: '+15551234567',
          website: 'https://website.com',
          linkedin_url: 'https://linkedin.com/in/john-doe',
          github_url: 'https://github.com/john-doe',
          skills: ['TypeScript', 'Express', 'React', 'React'], // 'React' is duplicate, should be deduped
          experience: [
            {
              company: 'Tech Corp',
              title: 'Developer',
              startDate: '2021-01',
              endDate: '2023-01',
              current: false,
              description: 'Coding standard web applications.',
            },
          ],
          education: [
            {
              institution: 'State University',
              degree: 'BSc',
              field: 'Computer Science',
              startYear: 2017,
              endYear: 2021,
            },
          ],
        },
        userToken
      );

      assert(
        'Update with all fields populated returns 200',
        updateRes.status,
        200
      );
      const data = (
        updateRes.data as {
          data: {
            profile: Record<string, unknown>;
            completionPercentage: number;
          };
        }
      ).data;
      assert(
        'Profile completion is 100% when all fields populated',
        data.completionPercentage,
        100
      );

      const skills = data.profile.skills as string[];
      assert('Skills are deduplicated', skills.length, 3);
      assert(
        'Skills contain React only once',
        skills.filter((s) => s === 'React').length,
        1
      );
    }
  } catch (err) {
    console.error('Setup or test execution failed:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
      console.log('Test server stopped.');
    }
    await disconnectDatabase();
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('\n=========================================');
  console.log(
    `Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`
  );

  if (failed > 0) {
    console.log('\n❌ Profile tests FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ All Profile tests PASSED');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
