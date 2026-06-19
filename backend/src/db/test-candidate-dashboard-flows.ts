/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
import { Server } from 'http';
import app from '../app';
import { db, connectDatabase, disconnectDatabase } from '../config/database';

const TEST_PORT = 8090;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

let server: Server;
let passedTests = 0;
let failedTests = 0;

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms * 3.5));

function logPass(test: string, details?: string): void {
  passedTests++;
  console.log(`  ✅ PASS: ${test}${details ? ` (${details})` : ''}`);
}

function logFail(test: string, error?: string): void {
  failedTests++;
  console.error(`  ❌ FAIL: ${test}${error ? ` — ${error}` : ''}`);
}

async function getToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data: any = await res.json();
  if (res.status !== 200) {
    throw new Error(
      `Login failed for ${email}: ${res.status} ${JSON.stringify(data)}`
    );
  }
  return data.data.accessToken;
}

async function registerUser(
  name: string,
  email: string,
  password: string,
  role: string = 'USER'
): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data: any = await res.json();
  if (res.status !== 201) {
    throw new Error(
      `Registration failed: ${res.status} ${JSON.stringify(data)}`
    );
  }
  const userId = data.data.user.id;
  if (role !== 'USER') {
    await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
  }
  return getToken(email, password);
}

async function runTests(): Promise<void> {
  console.log('='.repeat(80));
  console.log('  AI Job Portal — Candidate Dashboard Integration Tests');
  console.log('='.repeat(80));

  const userAEmail = `dashtest_usera_${Date.now()}@test.com`;
  const userBEmail = `dashtest_userb_${Date.now()}@test.com`;
  const adminEmail = `dashtest_admin_${Date.now()}@test.com`;
  const emptyUserEmail = `dashtest_empty_${Date.now()}@test.com`;
  const password = 'TestPass123!';

  let userAToken: string;
  let userBToken: string;
  let adminToken: string;
  let emptyUserToken: string;

  let publishedJobId: string;
  let publishedJobId2: string;

  try {
    // 1. Setup DB and Server
    await connectDatabase(3, 1000);
    server = app.listen(TEST_PORT);
    console.log(`Test server started on port ${TEST_PORT}\n`);

    // =============================================
    // SETUP: Register test users and create test data
    // =============================================
    console.log('--- Setup: Creating test users and data ---');

    userAToken = await registerUser(
      'Dashboard User A',
      userAEmail,
      password,
      'USER'
    );
    userBToken = await registerUser(
      'Dashboard User B',
      userBEmail,
      password,
      'USER'
    );
    adminToken = await registerUser(
      'Dashboard Admin',
      adminEmail,
      password,
      'ADMIN'
    );
    emptyUserToken = await registerUser(
      'Empty User',
      emptyUserEmail,
      password,
      'USER'
    );
    logPass('Registered 4 test users (3 USERs, 1 ADMIN)');

    // Admin creates 2 published jobs
    const jobRes1 = await fetch(`${BASE_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Dashboard Test Frontend Dev',
        company: 'DashCorp',
        description: 'Frontend developer role for dashboard testing.',
        requirements: 'React, TypeScript.',
        location: 'Remote',
        jobType: 'REMOTE',
        status: 'PUBLISHED',
      }),
    });
    const jobData1: any = await jobRes1.json();
    publishedJobId = jobData1.data.job.id;

    const jobRes2 = await fetch(`${BASE_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Dashboard Test Backend Dev',
        company: 'DashAPI Inc',
        description: 'Backend developer role for dashboard testing.',
        requirements: 'Node, PostgreSQL.',
        location: 'NYC',
        jobType: 'FULL_TIME',
        status: 'PUBLISHED',
      }),
    });
    const jobData2: any = await jobRes2.json();
    publishedJobId2 = jobData2.data.job.id;
    logPass('Admin created 2 published jobs');

    // User A uploads resume
    const resumeForm = new FormData();
    const mockPdf = new Blob([Buffer.from('%PDF-1.4 Mock PDF')], {
      type: 'application/pdf',
    });
    resumeForm.append('file', mockPdf, 'dashtest_resume.pdf');
    resumeForm.append('resumeTitle', 'Dashboard Test Resume');

    const resumeRes = await fetch(`${BASE_URL}/resumes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
      body: resumeForm,
    });
    const resumeData: any = await resumeRes.json();
    const resumeAId = resumeData.data.resume.id;
    logPass('User A uploaded resume');

    // User A updates profile for completion test
    await fetch(`${BASE_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        headline: 'Senior Developer',
        bio: 'Experienced full stack developer',
        location: 'San Francisco',
        phone: '+1234567890',
        skills: ['React', 'TypeScript', 'Node.js'],
        experience: [
          {
            company: 'TestCorp',
            title: 'Engineer',
            startDate: '2020-01-01',
            endDate: '2024-01-01',
            current: false,
            description: 'Built things',
          },
        ],
        education: [
          {
            institution: 'MIT',
            degree: 'BS',
            field: 'CS',
            startYear: 2016,
            endYear: 2020,
          },
        ],
        linkedin_url: 'https://linkedin.com/in/test',
      }),
    });
    logPass('User A updated profile');

    // Clear existing notifications for clean test state
    await db.query(
      'DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2, $3, $4))',
      [userAEmail, userBEmail, adminEmail, emptyUserEmail]
    );

    // User A applies to both jobs
    await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        jobId: publishedJobId,
        resumeId: resumeAId,
        coverLetter: 'Excited to apply!',
      }),
    });
    await sleep(100);

    const applyRes2 = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        jobId: publishedJobId2,
        resumeId: resumeAId,
      }),
    });
    const applyData2: any = await applyRes2.json();
    const applicationId2 = applyData2.data.application.id;
    await sleep(100);
    logPass('User A applied to 2 jobs');

    // Admin moves second application to REVIEWING
    await fetch(`${BASE_URL}/admin/applications/${applicationId2}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'REVIEWING', notes: 'Under review' }),
    });
    await sleep(100);
    logPass('Admin moved one application to REVIEWING');

    // =============================================
    // TEST 1: Dashboard Summary
    // =============================================
    console.log('\n--- Test 1: Dashboard Summary API ---');
    try {
      const res = await fetch(`${BASE_URL}/dashboard/summary`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const data: any = await res.json();

      if (res.status === 200 && data.success) {
        logPass('Dashboard summary endpoint returned 200');

        const s = data.data.summary;

        if (s.totalApplications === 2) {
          logPass('Total applications count correct', `${s.totalApplications}`);
        } else {
          logFail(
            'Total applications count incorrect',
            `${s.totalApplications} (expected 2)`
          );
        }

        if (s.pendingApplications === 1) {
          logPass('Pending applications count correct');
        } else {
          logFail(
            'Pending applications incorrect',
            `${s.pendingApplications} (expected 1)`
          );
        }

        if (s.reviewingApplications === 1) {
          logPass('Reviewing applications count correct');
        } else {
          logFail(
            'Reviewing applications incorrect',
            `${s.reviewingApplications} (expected 1)`
          );
        }

        if (s.totalResumes === 1) {
          logPass('Total resumes count correct');
        } else {
          logFail('Total resumes incorrect', `${s.totalResumes} (expected 1)`);
        }

        if (s.activeResume === true) {
          logPass('Active resume flag correct');
        } else {
          logFail('Active resume flag incorrect', `${s.activeResume}`);
        }

        if (
          typeof s.profileCompletion === 'number' &&
          s.profileCompletion > 0
        ) {
          logPass('Profile completion returned', `${s.profileCompletion}%`);
        } else {
          logFail('Profile completion invalid', `${s.profileCompletion}`);
        }

        if (typeof s.unreadNotifications === 'number') {
          logPass('Unread notifications returned', `${s.unreadNotifications}`);
        } else {
          logFail('Unread notifications missing');
        }
      } else {
        logFail('Dashboard summary failed', `Status: ${res.status}`);
      }
    } catch (err) {
      logFail('Test 1 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 2: Application Status Overview
    // =============================================
    console.log('\n--- Test 2: Application Status Overview API ---');
    try {
      const res = await fetch(`${BASE_URL}/dashboard/application-status`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const data: any = await res.json();

      if (res.status === 200 && data.success) {
        logPass('Application status endpoint returned 200');

        const s = data.data.status;

        if (s.pending === 1 && s.reviewing === 1) {
          logPass(
            'Status breakdown correct',
            `pending=${s.pending}, reviewing=${s.reviewing}`
          );
        } else {
          logFail('Status breakdown incorrect', JSON.stringify(s));
        }

        if (
          s.shortlisted === 0 &&
          s.rejected === 0 &&
          s.hired === 0 &&
          s.withdrawn === 0
        ) {
          logPass('Zero counts correct for unused statuses');
        } else {
          logFail('Non-zero counts for unused statuses', JSON.stringify(s));
        }
      } else {
        logFail('Application status failed', `Status: ${res.status}`);
      }
    } catch (err) {
      logFail('Test 2 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 3: Recent Applications
    // =============================================
    console.log('\n--- Test 3: Recent Applications API ---');
    try {
      const res = await fetch(`${BASE_URL}/dashboard/recent-applications`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const data: any = await res.json();

      if (res.status === 200 && data.success) {
        logPass('Recent applications endpoint returned 200');

        const apps = data.data.applications;

        if (apps.length === 2) {
          logPass('Returned correct number of applications', `${apps.length}`);
        } else {
          logFail(
            'Wrong number of applications',
            `${apps.length} (expected 2)`
          );
        }

        // Check fields
        const app = apps[0];
        if (
          app.applicationId &&
          app.jobTitle &&
          app.company &&
          app.status &&
          app.appliedAt
        ) {
          logPass('Application has all required fields');
        } else {
          logFail('Application missing fields', JSON.stringify(app));
        }

        // Check ordering (most recent first)
        if (apps.length >= 2) {
          const d1 = new Date(apps[0].appliedAt).getTime();
          const d2 = new Date(apps[1].appliedAt).getTime();
          if (d1 >= d2) {
            logPass('Applications ordered by most recent first');
          } else {
            logFail('Applications not in correct order');
          }
        }
      } else {
        logFail('Recent applications failed', `Status: ${res.status}`);
      }
    } catch (err) {
      logFail('Test 3 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 4: Recent Notifications
    // =============================================
    console.log('\n--- Test 4: Recent Notifications API ---');
    try {
      const res = await fetch(`${BASE_URL}/dashboard/recent-notifications`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const data: any = await res.json();

      if (res.status === 200 && data.success) {
        logPass('Recent notifications endpoint returned 200');

        const notifs = data.data.notifications;
        if (Array.isArray(notifs)) {
          logPass('Notifications returned as array', `count=${notifs.length}`);

          if (notifs.length > 0) {
            const n = notifs[0];
            if (n.title && typeof n.isRead === 'boolean' && n.createdAt) {
              logPass('Notification has required fields');
            } else {
              logFail('Notification missing fields', JSON.stringify(n));
            }
          }

          if (notifs.length <= 5) {
            logPass('Notifications capped at 5');
          } else {
            logFail('More than 5 notifications returned', `${notifs.length}`);
          }
        } else {
          logFail('Notifications not an array');
        }
      } else {
        logFail('Recent notifications failed', `Status: ${res.status}`);
      }
    } catch (err) {
      logFail('Test 4 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 5: Resume Summary
    // =============================================
    console.log('\n--- Test 5: Resume Summary API ---');
    try {
      const res = await fetch(`${BASE_URL}/dashboard/resume-summary`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const data: any = await res.json();

      if (res.status === 200 && data.success) {
        logPass('Resume summary endpoint returned 200');

        const rs = data.data.resumeSummary;

        if (rs.totalResumes === 1) {
          logPass('Total resumes count correct');
        } else {
          logFail('Total resumes incorrect', `${rs.totalResumes}`);
        }

        if (rs.activeResume === true) {
          logPass('Active resume flag correct');
        } else {
          logFail('Active resume flag incorrect');
        }

        if (rs.activeResumeTitle === 'Dashboard Test Resume') {
          logPass('Active resume title correct');
        } else {
          logFail('Active resume title incorrect', `${rs.activeResumeTitle}`);
        }

        if (rs.activeResumeUpdatedAt) {
          logPass('Active resume updatedAt present');
        } else {
          logFail('Active resume updatedAt missing');
        }
      } else {
        logFail('Resume summary failed', `Status: ${res.status}`);
      }
    } catch (err) {
      logFail('Test 5 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 6: Profile Completion Matches Profile Service
    // =============================================
    console.log('\n--- Test 6: Profile Completion Consistency ---');
    try {
      // Get profile completion from profile endpoint
      const profileRes = await fetch(`${BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const profileData: any = await profileRes.json();
      const profileCompletion = profileData.data.completionPercentage;

      // Get from dashboard summary
      const dashRes = await fetch(`${BASE_URL}/dashboard/summary`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const dashData: any = await dashRes.json();
      const dashCompletion = dashData.data.summary.profileCompletion;

      if (profileCompletion === dashCompletion) {
        logPass(
          'Profile completion matches between profile and dashboard',
          `${dashCompletion}%`
        );
      } else {
        logFail(
          'Profile completion mismatch',
          `Profile: ${profileCompletion}%, Dashboard: ${dashCompletion}%`
        );
      }
    } catch (err) {
      logFail('Test 6 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 7: Ownership Isolation
    // =============================================
    console.log('\n--- Test 7: Ownership Isolation (Cross-User Security) ---');
    try {
      // User B should see different data from User A
      const userBSummary = await fetch(`${BASE_URL}/dashboard/summary`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      const userBData: any = await userBSummary.json();
      const userBS = userBData.data.summary;

      if (userBS.totalApplications === 0) {
        logPass('User B sees 0 applications (isolation confirmed)');
      } else {
        logFail(
          'User B sees applications from User A',
          `${userBS.totalApplications}`
        );
      }

      if (userBS.totalResumes === 0) {
        logPass('User B sees 0 resumes (isolation confirmed)');
      } else {
        logFail('User B sees resumes from User A', `${userBS.totalResumes}`);
      }

      // User B recent applications
      const userBApps = await fetch(
        `${BASE_URL}/dashboard/recent-applications`,
        {
          headers: { Authorization: `Bearer ${userBToken}` },
        }
      );
      const userBAppsData: any = await userBApps.json();

      if (userBAppsData.data.applications.length === 0) {
        logPass('User B sees 0 recent applications (isolation confirmed)');
      } else {
        logFail('User B sees applications from User A in recent');
      }
    } catch (err) {
      logFail('Test 7 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 8: Empty States
    // =============================================
    console.log('\n--- Test 8: Empty States (New User) ---');
    try {
      // Clear any notifications for empty user
      await db.query(
        'DELETE FROM notifications WHERE user_id = (SELECT id FROM users WHERE email = $1)',
        [emptyUserEmail]
      );

      const summaryRes = await fetch(`${BASE_URL}/dashboard/summary`, {
        headers: { Authorization: `Bearer ${emptyUserToken}` },
      });
      const summaryData: any = await summaryRes.json();
      const s = summaryData.data.summary;

      if (
        s.totalApplications === 0 &&
        s.pendingApplications === 0 &&
        s.reviewingApplications === 0 &&
        s.shortlistedApplications === 0 &&
        s.rejectedApplications === 0 &&
        s.hiredApplications === 0
      ) {
        logPass('Empty user has all zero application counts');
      } else {
        logFail(
          'Empty user has non-zero application counts',
          JSON.stringify(s)
        );
      }

      if (s.totalResumes === 0 && s.activeResume === false) {
        logPass('Empty user has zero resumes and no active resume');
      } else {
        logFail('Empty user resume state incorrect');
      }

      // Recent applications should be empty array
      const appsRes = await fetch(`${BASE_URL}/dashboard/recent-applications`, {
        headers: { Authorization: `Bearer ${emptyUserToken}` },
      });
      const appsData: any = await appsRes.json();
      if (appsData.data.applications.length === 0) {
        logPass('Empty user has empty recent applications array');
      } else {
        logFail('Empty user has applications');
      }

      // Resume summary
      const resumeRes = await fetch(`${BASE_URL}/dashboard/resume-summary`, {
        headers: { Authorization: `Bearer ${emptyUserToken}` },
      });
      const resumeData: any = await resumeRes.json();
      const rs = resumeData.data.resumeSummary;
      if (
        rs.totalResumes === 0 &&
        rs.activeResume === false &&
        rs.activeResumeTitle === null &&
        rs.activeResumeUpdatedAt === null
      ) {
        logPass('Empty user resume summary returns correct null/zero values');
      } else {
        logFail('Empty user resume summary incorrect', JSON.stringify(rs));
      }
    } catch (err) {
      logFail('Test 8 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 9: ADMIN Blocked (403)
    // =============================================
    console.log('\n--- Test 9: ADMIN Role Blocked (403 on all endpoints) ---');
    try {
      const endpoints = [
        '/dashboard/summary',
        '/dashboard/application-status',
        '/dashboard/recent-applications',
        '/dashboard/recent-notifications',
        '/dashboard/resume-summary',
      ];

      let allBlocked = true;
      for (const endpoint of endpoints) {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.status !== 403) {
          logFail(`Admin not blocked on ${endpoint}`, `Status: ${res.status}`);
          allBlocked = false;
        }
      }

      if (allBlocked) {
        logPass('Admin correctly blocked (403) on all 5 dashboard endpoints');
      }
    } catch (err) {
      logFail('Test 9 failed with error', (err as Error).message);
    }

    // Cleanup
    console.log('\nCleaning up dashboard integration test records...');
    await db.query(
      'DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2, $3, $4))',
      [userAEmail, userBEmail, adminEmail, emptyUserEmail]
    );
    await db.query(
      'DELETE FROM application_timeline WHERE application_id IN (SELECT id FROM applications WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2)))',
      [userAEmail, userBEmail]
    );
    await db.query(
      'DELETE FROM applications WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2))',
      [userAEmail, userBEmail]
    );
    await db.query(
      'DELETE FROM resumes WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2))',
      [userAEmail, userBEmail]
    );
    await db.query(
      'DELETE FROM jobs WHERE posted_by IN (SELECT id FROM users WHERE email = $1)',
      [adminEmail]
    );
    await db.query(
      'DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2, $3, $4))',
      [userAEmail, userBEmail, adminEmail, emptyUserEmail]
    );
    await db.query(
      'DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2, $3, $4))',
      [userAEmail, userBEmail, adminEmail, emptyUserEmail]
    );
    await db.query('DELETE FROM users WHERE email IN ($1, $2, $3, $4)', [
      userAEmail,
      userBEmail,
      adminEmail,
      emptyUserEmail,
    ]);
    logPass('Integration test clean up completed');
  } catch (err) {
    console.error('Setup failed:', err);
    failedTests++;
  } finally {
    if (server) {
      server.close();
      console.log('Test server stopped.');
    }
    await disconnectDatabase();
  }

  console.log('\n' + '='.repeat(80));
  console.log(
    `  Tests completed: ${passedTests} passed, ${failedTests} failed`
  );
  console.log('='.repeat(80));

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
