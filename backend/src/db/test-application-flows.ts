/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
import { Server } from 'http';
import app from '../app';
import { db, connectDatabase, disconnectDatabase } from '../config/database';

const TEST_PORT = 8084;
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
  console.log('  AI Job Portal — Application Management Integration Tests');
  console.log('='.repeat(80));

  // Test user credentials
  const userAEmail = `apptest_userA_${Date.now()}@test.com`;
  const userBEmail = `apptest_userB_${Date.now()}@test.com`;
  const adminAEmail = `apptest_adminA_${Date.now()}@test.com`;
  const adminBEmail = `apptest_adminB_${Date.now()}@test.com`;
  const password = 'TestPass123!';

  let userAToken: string;
  let userBToken: string;
  let adminAToken: string;
  let adminBToken: string;
  let publishedJobId: string;
  let resumeAId: string;
  let applicationId = '';

  try {
    // 1. Setup DB and Server
    await connectDatabase(3, 1000);
    server = app.listen(TEST_PORT);
    console.log(`Test server started on port ${TEST_PORT}\n`);

    // =============================================
    // SETUP: Register test users and create test data
    // =============================================
    console.log('--- Setup: Creating test users and data ---');

    userAToken = await registerUser('User A', userAEmail, password, 'USER');
    userBToken = await registerUser('User B', userBEmail, password, 'USER');
    adminAToken = await registerUser('Admin A', adminAEmail, password, 'ADMIN');
    adminBToken = await registerUser('Admin B', adminBEmail, password, 'ADMIN');
    logPass('Registered 4 test users (2 USERs, 2 ADMINs)');

    // Admin A creates a job (PUBLISHED)
    const jobRes = await fetch(`${BASE_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        title: 'Test Software Engineer',
        company: 'TestCorp',
        description:
          'A test job description for application testing purposes. This is at least 10 characters.',
        requirements:
          'Requirements for the test job position. Must be at least 10 characters long.',
        location: 'Remote',
        jobType: 'REMOTE',
        status: 'PUBLISHED',
      }),
    });
    const jobData: any = await jobRes.json();
    publishedJobId = jobData.data.job.id;
    logPass('Admin A created published job', `ID: ${publishedJobId}`);

    // User A uploads a resume
    const resumeForm = new FormData();
    const mockPdf = new Blob([Buffer.from('%PDF-1.4 Test Resume PDF')], {
      type: 'application/pdf',
    });
    resumeForm.append('file', mockPdf, 'test_resume.pdf');
    resumeForm.append('resumeTitle', 'Test Engineering Resume');

    const resumeRes = await fetch(`${BASE_URL}/resumes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
      body: resumeForm,
    });
    const resumeData: any = await resumeRes.json();
    resumeAId = resumeData.data.resume.id;
    logPass('User A uploaded resume', `ID: ${resumeAId}`);

    // User B uploads a resume
    const resumeBForm = new FormData();
    const mockPdfB = new Blob([Buffer.from('%PDF-1.4 User B Resume')], {
      type: 'application/pdf',
    });
    resumeBForm.append('file', mockPdfB, 'user_b_resume.pdf');
    resumeBForm.append('resumeTitle', 'User B Resume');

    const resumeBRes = await fetch(`${BASE_URL}/resumes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userBToken}` },
      body: resumeBForm,
    });
    const resumeBData: any = await resumeBRes.json();
    const resumeBId = resumeBData.data.resume.id;
    logPass('User B uploaded resume', `ID: ${resumeBId}`);

    // =============================================
    // TEST 1: Apply to a job
    // =============================================
    console.log('\n--- Test 1: Apply to a Job ---');
    try {
      const res = await fetch(`${BASE_URL}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          jobId: publishedJobId,
          resumeId: resumeAId,
          coverLetter: 'I am very excited about this position.',
        }),
      });
      const data: any = await res.json();

      if (res.status === 201 && data.success) {
        applicationId = data.data.application.id;
        logPass('Application created successfully', `ID: ${applicationId}`);

        // Verify status is PENDING
        if (data.data.application.status === 'PENDING') {
          logPass('Initial status is PENDING');
        } else {
          logFail('Initial status not PENDING', data.data.application.status);
        }

        // Verify cover letter stored
        if (
          data.data.application.coverLetter ===
          'I am very excited about this position.'
        ) {
          logPass('Cover letter stored correctly');
        } else {
          logFail('Cover letter not stored', data.data.application.coverLetter);
        }

        // Verify appliedAt
        if (data.data.application.appliedAt) {
          logPass('Applied at timestamp recorded');
        } else {
          logFail('Applied at timestamp missing');
        }
      } else {
        logFail('Apply to job failed', `Status: ${res.status}`);
      }
    } catch (err) {
      logFail('Apply to job threw error', (err as Error).message);
    }

    // =============================================
    // TEST 2: Snapshot persistence
    // =============================================
    console.log('\n--- Test 2: Snapshot Persistence ---');
    try {
      const res = await fetch(`${BASE_URL}/applications/${applicationId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const data: any = await res.json();

      if (res.status === 200 && data.success) {
        const app = data.data.application;
        if (app.resumeSnapshotTitle === 'Test Engineering Resume') {
          logPass('Resume snapshot title preserved');
        } else {
          logFail('Resume snapshot title wrong', app.resumeSnapshotTitle);
        }

        if (app.resumeSnapshotFileName === 'test_resume.pdf') {
          logPass('Resume snapshot file name preserved');
        } else {
          logFail(
            'Resume snapshot file name wrong',
            app.resumeSnapshotFileName
          );
        }

        if (app.resumeSnapshotStoragePath) {
          logPass('Resume snapshot storage path preserved');
        } else {
          logFail('Resume snapshot storage path missing');
        }
      } else {
        logFail('Get application details failed', `Status: ${res.status}`);
      }
    } catch (err) {
      logFail('Snapshot test threw error', (err as Error).message);
    }

    // =============================================
    // TEST 3: Duplicate application prevention
    // =============================================
    console.log('\n--- Test 3: Duplicate Application Prevention ---');
    try {
      const res = await fetch(`${BASE_URL}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          jobId: publishedJobId,
          resumeId: resumeAId,
        }),
      });
      const data: any = await res.json();

      if (res.status === 409 && data.error?.code === 'DUPLICATE_APPLICATION') {
        logPass('Duplicate application correctly blocked with 409');
      } else {
        logFail(
          'Expected 409 DUPLICATE_APPLICATION',
          `Status: ${res.status}, Code: ${data.error?.code}`
        );
      }
    } catch (err) {
      logFail('Duplicate test threw error', (err as Error).message);
    }

    // =============================================
    // TEST 4: Check application endpoint
    // =============================================
    console.log('\n--- Test 4: Check Application Status ---');
    try {
      const res = await fetch(
        `${BASE_URL}/applications/check/${publishedJobId}`,
        {
          headers: { Authorization: `Bearer ${userAToken}` },
        }
      );
      const data: any = await res.json();

      if (res.status === 200 && data.data.hasApplied === true) {
        logPass('Check application correctly returns hasApplied=true');
      } else {
        logFail('Check application failed', JSON.stringify(data));
      }

      // User B should not have applied
      const resB = await fetch(
        `${BASE_URL}/applications/check/${publishedJobId}`,
        {
          headers: { Authorization: `Bearer ${userBToken}` },
        }
      );
      const dataB: any = await resB.json();

      if (resB.status === 200 && dataB.data.hasApplied === false) {
        logPass(
          'Check application correctly returns hasApplied=false for User B'
        );
      } else {
        logFail('Check for User B incorrect', JSON.stringify(dataB));
      }
    } catch (err) {
      logFail('Check test threw error', (err as Error).message);
    }

    // =============================================
    // TEST 5: My Applications (pagination)
    // =============================================
    console.log('\n--- Test 5: My Applications List ---');
    try {
      const res = await fetch(`${BASE_URL}/applications/my?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const data: any = await res.json();

      if (res.status === 200 && data.success) {
        const apps = data.data.applications;
        if (apps.length >= 1) {
          logPass('My applications returned results', `Count: ${apps.length}`);
        } else {
          logFail('My applications returned empty');
        }

        // Verify job details joined
        if (apps[0].job && apps[0].job.title) {
          logPass('Job details joined in response', apps[0].job.title);
        } else {
          logFail('Job details not joined');
        }

        // Verify pagination meta
        if (data.meta && typeof data.meta.total === 'number') {
          logPass('Pagination metadata present', `Total: ${data.meta.total}`);
        } else {
          logFail('Pagination metadata missing');
        }
      } else {
        logFail('My applications failed', `Status: ${res.status}`);
      }
    } catch (err) {
      logFail('My applications test threw error', (err as Error).message);
    }

    // =============================================
    // TEST 6: Ownership enforcement — User B cannot view User A application
    // =============================================
    console.log('\n--- Test 6: Ownership Enforcement ---');
    try {
      const res = await fetch(`${BASE_URL}/applications/${applicationId}`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });

      if (res.status === 403) {
        logPass("User B blocked from viewing User A's application (403)");
      } else {
        logFail('Expected 403 for unauthorized view', `Status: ${res.status}`);
      }

      // User B cannot withdraw User A application
      const wRes = await fetch(
        `${BASE_URL}/applications/${applicationId}/withdraw`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${userBToken}` },
        }
      );

      if (wRes.status === 403) {
        logPass("User B blocked from withdrawing User A's application (403)");
      } else {
        logFail(
          'Expected 403 for unauthorized withdraw',
          `Status: ${wRes.status}`
        );
      }
    } catch (err) {
      logFail('Ownership test threw error', (err as Error).message);
    }

    // =============================================
    // TEST 7: Admin A reviews application (status transitions)
    // =============================================
    console.log('\n--- Test 7: Admin Status Transitions ---');
    try {
      // PENDING → REVIEWING
      const r1 = await fetch(
        `${BASE_URL}/admin/applications/${applicationId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminAToken}`,
          },
          body: JSON.stringify({
            status: 'REVIEWING',
            notes: 'Moving to review stage',
          }),
        }
      );
      const d1: any = await r1.json();

      if (r1.status === 200 && d1.data.application.status === 'REVIEWING') {
        logPass('PENDING → REVIEWING transition succeeded');
      } else {
        logFail('PENDING → REVIEWING failed', `Status: ${r1.status}`);
      }

      // Verify reviewed_at and reviewed_by
      if (d1.data.application.reviewedAt) {
        logPass('reviewed_at timestamp recorded');
      } else {
        logFail('reviewed_at missing');
      }

      if (d1.data.application.notes === 'Moving to review stage') {
        logPass('Notes stored correctly');
      } else {
        logFail('Notes not stored', d1.data.application.notes);
      }

      // REVIEWING → SHORTLISTED
      const r2 = await fetch(
        `${BASE_URL}/admin/applications/${applicationId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminAToken}`,
          },
          body: JSON.stringify({
            status: 'SHORTLISTED',
            notes: 'Strong candidate',
          }),
        }
      );
      const d2: any = await r2.json();

      if (r2.status === 200 && d2.data.application.status === 'SHORTLISTED') {
        logPass('REVIEWING → SHORTLISTED transition succeeded');
      } else {
        logFail('REVIEWING → SHORTLISTED failed', `Status: ${r2.status}`);
      }

      // SHORTLISTED → HIRED
      const r3 = await fetch(
        `${BASE_URL}/admin/applications/${applicationId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminAToken}`,
          },
          body: JSON.stringify({
            status: 'HIRED',
            notes: 'Congratulations! Offer extended.',
          }),
        }
      );
      const d3: any = await r3.json();

      if (r3.status === 200 && d3.data.application.status === 'HIRED') {
        logPass('SHORTLISTED → HIRED transition succeeded');
      } else {
        logFail('SHORTLISTED → HIRED failed', `Status: ${r3.status}`);
      }
    } catch (err) {
      logFail('Admin status test threw error', (err as Error).message);
    }

    // =============================================
    // TEST 8: Invalid status transition
    // =============================================
    console.log('\n--- Test 8: Invalid Status Transition ---');
    try {
      // HIRED → REVIEWING (invalid)
      const res = await fetch(
        `${BASE_URL}/admin/applications/${applicationId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminAToken}`,
          },
          body: JSON.stringify({ status: 'REVIEWING' }),
        }
      );
      const data: any = await res.json();

      if (
        res.status === 400 &&
        data.error?.code === 'INVALID_STATUS_TRANSITION'
      ) {
        logPass('Invalid transition HIRED → REVIEWING blocked (400)');
      } else {
        logFail(
          'Expected 400 INVALID_STATUS_TRANSITION',
          `Status: ${res.status}, Code: ${data.error?.code}`
        );
      }
    } catch (err) {
      logFail('Invalid transition test threw error', (err as Error).message);
    }

    // =============================================
    // TEST 9: Cannot withdraw HIRED application
    // =============================================
    console.log('\n--- Test 9: Cannot Withdraw HIRED Application ---');
    try {
      const res = await fetch(
        `${BASE_URL}/applications/${applicationId}/withdraw`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${userAToken}` },
        }
      );
      const data: any = await res.json();

      if (
        res.status === 400 &&
        data.error?.code === 'INVALID_STATUS_TRANSITION'
      ) {
        logPass('Cannot withdraw HIRED application (400)');
      } else {
        logFail(
          'Expected 400 for withdrawing HIRED',
          `Status: ${res.status}, Code: ${data.error?.code}`
        );
      }
    } catch (err) {
      logFail('Withdraw HIRED test threw error', (err as Error).message);
    }

    // =============================================
    // TEST 10: Withdraw a new application
    // =============================================
    console.log('\n--- Test 10: Withdraw Application ---');
    try {
      // User B applies first
      const applyRes = await fetch(`${BASE_URL}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userBToken}`,
        },
        body: JSON.stringify({
          jobId: publishedJobId,
          resumeId: resumeBId,
        }),
      });
      const applyData: any = await applyRes.json();
      const userBAppId = applyData.data.application.id;

      // Withdraw
      const wRes = await fetch(
        `${BASE_URL}/applications/${userBAppId}/withdraw`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${userBToken}` },
        }
      );
      const wData: any = await wRes.json();

      if (
        wRes.status === 200 &&
        wData.data.application.status === 'WITHDRAWN'
      ) {
        logPass('Application withdrawn successfully');
      } else {
        logFail(
          'Withdraw failed',
          `Status: ${wRes.status}, App Status: ${wData.data?.application?.status}`
        );
      }

      // Cannot withdraw again (WITHDRAWN is terminal)
      const w2 = await fetch(
        `${BASE_URL}/applications/${userBAppId}/withdraw`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${userBToken}` },
        }
      );

      if (w2.status === 400) {
        logPass('Cannot withdraw already withdrawn application (400)');
      } else {
        logFail('Expected 400 for double withdrawal', `Status: ${w2.status}`);
      }
    } catch (err) {
      logFail('Withdraw test threw error', (err as Error).message);
    }

    // =============================================
    // TEST 11: Timeline creation and retrieval
    // =============================================
    console.log('\n--- Test 11: Timeline ---');
    try {
      const res = await fetch(
        `${BASE_URL}/applications/${applicationId}/timeline`,
        {
          headers: { Authorization: `Bearer ${userAToken}` },
        }
      );
      const data: any = await res.json();

      if (res.status === 200 && data.success) {
        const timeline = data.data.timeline;
        if (timeline.length >= 4) {
          logPass('Timeline has expected events', `Count: ${timeline.length}`);
        } else {
          logFail(
            'Timeline should have ≥4 events (submit + 3 status changes)',
            `Count: ${timeline.length}`
          );
        }

        // Verify first event is APPLICATION_SUBMITTED
        if (timeline[0]?.eventType === 'APPLICATION_SUBMITTED') {
          logPass('First timeline event is APPLICATION_SUBMITTED');
        } else {
          logFail('First event wrong', timeline[0]?.eventType);
        }

        // Verify actor types
        if (timeline[0]?.actorType === 'USER') {
          logPass('Submit event actor type is USER');
        } else {
          logFail('Submit event actor type wrong', timeline[0]?.actorType);
        }

        const adminEvent = timeline.find(
          (e: any) => e.eventType === 'STATUS_CHANGED'
        );
        if (adminEvent?.actorType === 'ADMIN') {
          logPass('Status change event actor type is ADMIN');
        } else {
          logFail('Status change actor type wrong', adminEvent?.actorType);
        }

        // Verify chronological order
        const dates = timeline.map((e: any) => new Date(e.createdAt).getTime());
        const isSorted = dates.every(
          (d: number, i: number) => i === 0 || d >= dates[i - 1]
        );
        if (isSorted) {
          logPass('Timeline events in chronological order');
        } else {
          logFail('Timeline not in chronological order');
        }
      } else {
        logFail('Timeline retrieval failed', `Status: ${res.status}`);
      }
    } catch (err) {
      logFail('Timeline test threw error', (err as Error).message);
    }

    // =============================================
    // TEST 12: Admin B cannot manage Admin A's job applications
    // =============================================
    console.log('\n--- Test 12: Admin Ownership Restriction ---');
    try {
      // Admin B tries to update status
      const res = await fetch(
        `${BASE_URL}/admin/applications/${applicationId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminBToken}`,
          },
          body: JSON.stringify({ status: 'REVIEWING' }),
        }
      );

      if (res.status === 403) {
        logPass(
          "Admin B blocked from managing Admin A's job applications (403)"
        );
      } else {
        logFail(
          'Expected 403 for Admin B managing Admin A job',
          `Status: ${res.status}`
        );
      }

      // Admin B tries to view application detail
      const detRes = await fetch(`${BASE_URL}/applications/${applicationId}`, {
        headers: { Authorization: `Bearer ${adminBToken}` },
      });

      if (detRes.status === 403) {
        logPass(
          "Admin B blocked from viewing Admin A's job applications (403)"
        );
      } else {
        logFail(
          'Expected 403 for Admin B viewing Admin A application',
          `Status: ${detRes.status}`
        );
      }

      // Admin B tries to view timeline
      const tlRes = await fetch(
        `${BASE_URL}/applications/${applicationId}/timeline`,
        {
          headers: { Authorization: `Bearer ${adminBToken}` },
        }
      );

      if (tlRes.status === 403) {
        logPass(
          "Admin B blocked from viewing Admin A's application timeline (403)"
        );
      } else {
        logFail(
          'Expected 403 for Admin B viewing Admin A timeline',
          `Status: ${tlRes.status}`
        );
      }
    } catch (err) {
      logFail('Admin ownership test threw error', (err as Error).message);
    }

    // =============================================
    // TEST 13: Admin A list applications (with search and filters)
    // =============================================
    console.log('\n--- Test 13: Admin Application List, Search, Filters ---');
    try {
      // Basic list
      const r1 = await fetch(`${BASE_URL}/admin/applications?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${adminAToken}` },
      });
      const d1: any = await r1.json();

      if (r1.status === 200 && d1.success && d1.data.applications.length >= 1) {
        logPass(
          'Admin applications list returned results',
          `Count: ${d1.data.applications.length}`
        );
      } else {
        logFail('Admin list failed', `Status: ${r1.status}`);
      }

      // Verify pagination meta
      if (d1.meta && typeof d1.meta.total === 'number') {
        logPass('Admin list pagination meta present');
      } else {
        logFail('Admin list pagination meta missing');
      }

      // Filter by status
      const r2 = await fetch(`${BASE_URL}/admin/applications?status=HIRED`, {
        headers: { Authorization: `Bearer ${adminAToken}` },
      });
      const d2: any = await r2.json();

      if (r2.status === 200 && d2.success) {
        const allHired = d2.data.applications.every(
          (a: any) => a.status === 'HIRED'
        );
        if (allHired) {
          logPass('Status filter works correctly');
        } else {
          logFail('Status filter returned non-HIRED results');
        }
      } else {
        logFail('Status filter query failed');
      }

      // Filter by jobId
      const r3 = await fetch(
        `${BASE_URL}/admin/applications?jobId=${publishedJobId}`,
        {
          headers: { Authorization: `Bearer ${adminAToken}` },
        }
      );
      const d3: any = await r3.json();

      if (r3.status === 200 && d3.success) {
        logPass(
          'Job ID filter works',
          `Results: ${d3.data.applications.length}`
        );
      } else {
        logFail('Job ID filter query failed');
      }

      // Search by candidate name
      const r4 = await fetch(`${BASE_URL}/admin/applications?search=User%20A`, {
        headers: { Authorization: `Bearer ${adminAToken}` },
      });
      const d4: any = await r4.json();

      if (r4.status === 200 && d4.success && d4.data.applications.length >= 1) {
        logPass('Search by candidate name works');
      } else {
        logFail('Search failed', `Status: ${r4.status}`);
      }

      // Admin B should see no results (no jobs posted)
      const r5 = await fetch(`${BASE_URL}/admin/applications`, {
        headers: { Authorization: `Bearer ${adminBToken}` },
      });
      const d5: any = await r5.json();

      if (r5.status === 200 && d5.data.applications.length === 0) {
        logPass('Admin B correctly sees no applications (no jobs owned)');
      } else {
        logFail(
          'Admin B should see empty list',
          `Count: ${d5.data?.applications?.length}`
        );
      }
    } catch (err) {
      logFail('Admin list test threw error', (err as Error).message);
    }

    // =============================================
    // TEST 14: RBAC — Admin cannot apply
    // =============================================
    console.log('\n--- Test 14: RBAC Enforcement ---');
    try {
      const res = await fetch(`${BASE_URL}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAToken}`,
        },
        body: JSON.stringify({
          jobId: publishedJobId,
          resumeId: resumeAId,
        }),
      });

      if (res.status === 403) {
        logPass('Admin blocked from applying to jobs (403)');
      } else {
        logFail('Expected 403 for admin applying', `Status: ${res.status}`);
      }

      // User cannot access admin routes
      const adminRes = await fetch(`${BASE_URL}/admin/applications`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });

      if (adminRes.status === 403) {
        logPass('User blocked from admin application list (403)');
      } else {
        logFail(
          'Expected 403 for user admin route',
          `Status: ${adminRes.status}`
        );
      }

      // User cannot update status
      const statusRes = await fetch(
        `${BASE_URL}/admin/applications/${applicationId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userAToken}`,
          },
          body: JSON.stringify({ status: 'REVIEWING' }),
        }
      );

      if (statusRes.status === 403) {
        logPass('User blocked from updating application status (403)');
      } else {
        logFail(
          'Expected 403 for user status update',
          `Status: ${statusRes.status}`
        );
      }
    } catch (err) {
      logFail('RBAC test threw error', (err as Error).message);
    }

    // =============================================
    // TEST 15: Resume ownership — cannot apply with other's resume
    // =============================================
    console.log('\n--- Test 15: Resume Ownership Enforcement ---');
    try {
      // Admin A creates another published job
      const job2Res = await fetch(`${BASE_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAToken}`,
        },
        body: JSON.stringify({
          title: 'Another Test Position',
          company: 'TestCorp',
          description:
            'Another test job description that is long enough for validation rules.',
          requirements:
            'More requirements for the second test position with sufficient length.',
          location: 'Bangalore',
          jobType: 'FULL_TIME',
          status: 'PUBLISHED',
        }),
      });
      const job2Data: any = await job2Res.json();
      const job2Id = job2Data.data.job.id;

      // User B tries to apply with User A's resume
      const res = await fetch(`${BASE_URL}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userBToken}`,
        },
        body: JSON.stringify({
          jobId: job2Id,
          resumeId: resumeAId,
        }),
      });

      if (res.status === 403) {
        logPass("User B blocked from applying with User A's resume (403)");
      } else {
        logFail(
          'Expected 403 for using another user resume',
          `Status: ${res.status}`
        );
      }

      // Cleanup extra job
      await db.query('DELETE FROM jobs WHERE id = $1', [job2Id]);
    } catch (err) {
      logFail('Resume ownership test threw error', (err as Error).message);
    }

    // =============================================
    // CLEANUP
    // =============================================
    console.log('\nCleaning up test data...');
    await db.query(
      `DELETE FROM application_timeline WHERE application_id IN
        (SELECT id FROM applications WHERE user_id IN
          (SELECT id FROM users WHERE email IN ($1, $2)))`,
      [userAEmail, userBEmail]
    );
    await db.query(
      `DELETE FROM applications WHERE user_id IN
        (SELECT id FROM users WHERE email IN ($1, $2))`,
      [userAEmail, userBEmail]
    );
    await db.query(
      `DELETE FROM resumes WHERE user_id IN
        (SELECT id FROM users WHERE email IN ($1, $2))`,
      [userAEmail, userBEmail]
    );
    await db.query(
      `DELETE FROM jobs WHERE posted_by IN
        (SELECT id FROM users WHERE email IN ($1, $2))`,
      [adminAEmail, adminBEmail]
    );
    await db.query('DELETE FROM users WHERE email IN ($1, $2, $3, $4)', [
      userAEmail,
      userBEmail,
      adminAEmail,
      adminBEmail,
    ]);
    logPass('Test data cleaned up');
  } catch (err) {
    console.error('Integration test flow failed:', err);
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
