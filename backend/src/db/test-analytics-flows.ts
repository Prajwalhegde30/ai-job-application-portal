/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
import { Server } from 'http';
import app from '../app';
import { db, connectDatabase, disconnectDatabase } from '../config/database';

const TEST_PORT = 8086;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

let server: Server;
let passedTests = 0;
let failedTests = 0;

function logPass(test: string, details?: string): void {
  passedTests++;
  console.log(`  PASS: ${test}${details ? ` (${details})` : ''}`);
}

function logFail(test: string, error?: string): void {
  failedTests++;
  console.error(`  FAIL: ${test}${error ? ` - ${error}` : ''}`);
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
): Promise<{ id: string; token: string }> {
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
  return { id: userId, token: await getToken(email, password) };
}

async function apiGet(path: string, token: string): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function createJob(
  postedBy: string,
  title: string,
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO jobs (
       posted_by, title, company, description, requirements, responsibilities,
       location, job_type, status, slug, is_featured, published_at, closed_at
     ) VALUES (
       $1, $2, 'AnalyticsCorp',
       'Analytics integration test job description.',
       'Analytics integration test job requirements.',
       'Own the analytics test workflow.',
       'Remote', 'REMOTE', $3::job_status, $4, FALSE,
       CASE WHEN $3::job_status IN ('PUBLISHED', 'CLOSED') THEN NOW() ELSE NULL END,
       CASE WHEN $3::job_status = 'CLOSED' THEN NOW() ELSE NULL END
     )
     RETURNING id`,
    [postedBy, title, status, `${title.toLowerCase().replace(/\s+/g, '-')}`]
  );
  return result.rows[0].id;
}

async function createResume(userId: string, label: string): Promise<string> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO resumes (
       user_id, name, file_url, file_key, is_default, file_name, storage_path,
       is_active, file_size, file_type, resume_title
     ) VALUES (
       $1, $2, $3, $4, FALSE, $5, $4, TRUE, 128, 'application/pdf', $2
     )
     RETURNING id`,
    [
      userId,
      `${label} Resume`,
      `https://example.test/${label}.pdf`,
      `analytics/${label}.pdf`,
      `${label}.pdf`,
    ]
  );
  return result.rows[0].id;
}

async function createApplication(
  userId: string,
  jobId: string,
  resumeId: string,
  status: string,
  daysAgo: number
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO applications (
       user_id, job_id, resume_id, cover_letter, status,
       resume_snapshot_title, resume_snapshot_file_name,
       resume_snapshot_storage_path, applied_at, created_at
     ) VALUES (
       $1, $2, $3, 'Analytics test application', $4,
       'Snapshot Resume', 'snapshot.pdf', 'analytics/snapshot.pdf',
       NOW() - ($5::int * INTERVAL '1 day'),
       NOW() - ($5::int * INTERVAL '1 day')
     )
     RETURNING id`,
    [userId, jobId, resumeId, status, daysAgo]
  );
  return result.rows[0].id;
}

async function cleanupAnalyticsRecords(emails: string[]): Promise<void> {
  await db.query(
    `DELETE FROM notifications
     WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1::text[]))`,
    [emails]
  );
  await db.query(
    `DELETE FROM applications
     WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1::text[]))`,
    [emails]
  );
  await db.query(
    `DELETE FROM resumes
     WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1::text[]))`,
    [emails]
  );
  await db.query(
    `DELETE FROM jobs
     WHERE posted_by IN (SELECT id FROM users WHERE email = ANY($1::text[]))`,
    [emails]
  );
  await db.query('DELETE FROM users WHERE email = ANY($1::text[])', [emails]);
}

async function runTests(): Promise<void> {
  console.log('='.repeat(80));
  console.log('  AI Job Portal - Recruiter Analytics Integration Tests');
  console.log('='.repeat(80));

  const unique = Date.now();
  const password = 'TestPass123!';
  const emails = {
    adminA: `analytics_admin_a_${unique}@test.com`,
    adminB: `analytics_admin_b_${unique}@test.com`,
    adminEmpty: `analytics_admin_empty_${unique}@test.com`,
    userA: `analytics_user_a_${unique}@test.com`,
    userB: `analytics_user_b_${unique}@test.com`,
    userC: `analytics_user_c_${unique}@test.com`,
    userD: `analytics_user_d_${unique}@test.com`,
    userE: `analytics_user_e_${unique}@test.com`,
    userF: `analytics_user_f_${unique}@test.com`,
  };

  try {
    await connectDatabase(3, 1000);
    server = app.listen(TEST_PORT);
    console.log(`Test server started on port ${TEST_PORT}\n`);

    const adminA = await registerUser(
      'Analytics Admin A',
      emails.adminA,
      password,
      'ADMIN'
    );
    const adminB = await registerUser(
      'Analytics Admin B',
      emails.adminB,
      password,
      'ADMIN'
    );
    const adminEmpty = await registerUser(
      'Analytics Empty Admin',
      emails.adminEmpty,
      password,
      'ADMIN'
    );
    const users = await Promise.all([
      registerUser('Analytics User A', emails.userA, password),
      registerUser('Analytics User B', emails.userB, password),
      registerUser('Analytics User C', emails.userC, password),
      registerUser('Analytics User D', emails.userD, password),
      registerUser('Analytics User E', emails.userE, password),
      registerUser('Analytics User F', emails.userF, password),
    ]);
    logPass('Registered analytics test users');

    const resumes = await Promise.all(
      users.map((user, index) =>
        createResume(user.id, `analytics-user-${index}`)
      )
    );

    const jobA1 = await createJob(
      adminA.id,
      'Analytics Staff Engineer',
      'PUBLISHED'
    );
    const jobA2 = await createJob(
      adminA.id,
      'Analytics Product Manager',
      'PUBLISHED'
    );
    await createJob(adminA.id, 'Analytics Draft Role', 'DRAFT');
    await createJob(adminA.id, 'Analytics Closed Role', 'CLOSED');
    const jobB1 = await createJob(
      adminB.id,
      'Other Recruiter Role',
      'PUBLISHED'
    );

    const applicationA1 = await createApplication(
      users[0].id,
      jobA1,
      resumes[0],
      'PENDING',
      0
    );
    await createApplication(users[1].id, jobA1, resumes[1], 'REVIEWING', 1);
    await createApplication(users[2].id, jobA1, resumes[2], 'SHORTLISTED', 2);
    await createApplication(users[3].id, jobA1, resumes[3], 'HIRED', 3);
    await createApplication(users[4].id, jobA2, resumes[4], 'REJECTED', 4);
    await createApplication(users[5].id, jobA2, resumes[5], 'WITHDRAWN', 5);
    await createApplication(users[0].id, jobA2, resumes[0], 'HIRED', 6);
    await createApplication(users[1].id, jobB1, resumes[1], 'HIRED', 0);

    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, is_read)
       VALUES
       ($1, 'SYSTEM', 'Unread 1', 'Unread analytics notification', FALSE),
       ($1, 'SYSTEM', 'Unread 2', 'Unread analytics notification', FALSE),
       ($1, 'SYSTEM', 'Read 1', 'Read analytics notification', TRUE),
       ($2, 'SYSTEM', 'Other unread', 'Other recruiter notification', FALSE)`,
      [adminA.id, adminB.id]
    );
    logPass('Created deterministic jobs, applications, and notifications');

    console.log('\n--- Test 1: Summary Metrics ---');
    try {
      const res = await apiGet('/analytics/summary', adminA.token);
      const data: any = await res.json();
      const summary = data.data.summary;
      if (
        res.status === 200 &&
        summary.totalJobs === 4 &&
        summary.draftJobs === 1 &&
        summary.publishedJobs === 2 &&
        summary.closedJobs === 1 &&
        summary.totalApplications === 7 &&
        summary.reviewingApplications === 1 &&
        summary.shortlistedApplications === 1 &&
        summary.hiredApplications === 2 &&
        summary.rejectedApplications === 1 &&
        summary.unreadNotifications === 2
      ) {
        logPass('Summary metrics match recruiter-owned data');
      } else {
        logFail('Summary metrics mismatch', JSON.stringify(summary));
      }
    } catch (err) {
      logFail('Summary test failed', (err as Error).message);
    }

    console.log('\n--- Test 2: Ownership Isolation ---');
    try {
      const res = await apiGet('/analytics/summary', adminB.token);
      const data: any = await res.json();
      const summary = data.data.summary;
      if (
        res.status === 200 &&
        summary.totalJobs === 1 &&
        summary.totalApplications === 1 &&
        summary.hiredApplications === 1 &&
        summary.unreadNotifications === 1
      ) {
        logPass('Admin B only sees Admin B analytics');
      } else {
        logFail('Admin B isolation mismatch', JSON.stringify(summary));
      }

      const userRes = await apiGet('/analytics/summary', users[0].token);
      if (userRes.status === 403) {
        logPass('USER role blocked from analytics routes');
      } else {
        logFail('Expected USER analytics block', `Status: ${userRes.status}`);
      }
    } catch (err) {
      logFail('Ownership isolation test failed', (err as Error).message);
    }

    console.log('\n--- Test 3: Hiring Funnel ---');
    try {
      const res = await apiGet('/analytics/hiring-funnel', adminA.token);
      const data: any = await res.json();
      const funnel = data.data.funnel;
      if (
        funnel.pending === 1 &&
        funnel.reviewing === 1 &&
        funnel.shortlisted === 1 &&
        funnel.hired === 2 &&
        funnel.rejected === 1 &&
        funnel.withdrawn === 1
      ) {
        logPass('Hiring funnel counts every application status');
      } else {
        logFail('Hiring funnel mismatch', JSON.stringify(funnel));
      }
    } catch (err) {
      logFail('Hiring funnel test failed', (err as Error).message);
    }

    console.log('\n--- Test 4: Application Trends ---');
    try {
      const res = await apiGet(
        '/analytics/application-trends?range=7d',
        adminA.token
      );
      const data: any = await res.json();
      const trends = data.data.trends;
      const total = trends.reduce(
        (sum: number, point: any) => sum + point.applications,
        0
      );
      if (res.status === 200 && trends.length === 7 && total === 7) {
        logPass('7-day trends return daily buckets with owned counts');
      } else {
        logFail('Trend data mismatch', JSON.stringify(trends));
      }

      const invalidRes = await apiGet(
        '/analytics/application-trends?range=365d',
        adminA.token
      );
      if (invalidRes.status === 400) {
        logPass('Invalid trend range rejected');
      } else {
        logFail(
          'Invalid trend range should return 400',
          `${invalidRes.status}`
        );
      }
    } catch (err) {
      logFail('Application trend test failed', (err as Error).message);
    }

    console.log('\n--- Test 5: Top Jobs ---');
    try {
      const res = await apiGet('/analytics/top-jobs', adminA.token);
      const data: any = await res.json();
      const jobs = data.data.jobs;
      if (
        res.status === 200 &&
        jobs.length >= 2 &&
        jobs[0].jobId === jobA1 &&
        jobs[0].applicationCount === 4 &&
        jobs[1].jobId === jobA2 &&
        jobs[1].applicationCount === 3 &&
        jobs.every((job: any) => job.title !== 'Other Recruiter Role')
      ) {
        logPass('Top jobs ordered by owned application count');
      } else {
        logFail('Top jobs mismatch', JSON.stringify(jobs));
      }
    } catch (err) {
      logFail('Top jobs test failed', (err as Error).message);
    }

    console.log('\n--- Test 6: Job Performance ---');
    try {
      const res = await apiGet(
        `/analytics/job-performance/${jobA1}`,
        adminA.token
      );
      const data: any = await res.json();
      const perf = data.data.performance;
      if (
        res.status === 200 &&
        perf.applications === 4 &&
        perf.reviewing === 1 &&
        perf.shortlisted === 1 &&
        perf.hired === 1 &&
        perf.rejected === 0 &&
        perf.withdrawn === 0 &&
        perf.conversionRate === 50 &&
        perf.hireRate === 25
      ) {
        logPass('Job performance aggregation and SQL rates are correct');
      } else {
        logFail('Job performance mismatch', JSON.stringify(perf));
      }

      const forbiddenJobRes = await apiGet(
        `/analytics/job-performance/${jobB1}`,
        adminA.token
      );
      if (forbiddenJobRes.status === 404) {
        logPass('Recruiter cannot query another recruiter job performance');
      } else {
        logFail(
          'Expected hidden foreign job performance',
          `${forbiddenJobRes.status}`
        );
      }

      const invalidIdRes = await apiGet(
        '/analytics/job-performance/not-a-uuid',
        adminA.token
      );
      if (invalidIdRes.status === 400) {
        logPass('Invalid job ID rejected');
      } else {
        logFail('Expected invalid job ID 400', `${invalidIdRes.status}`);
      }
    } catch (err) {
      logFail('Job performance test failed', (err as Error).message);
    }

    console.log('\n--- Test 7: Recent Applications ---');
    try {
      const res = await apiGet('/analytics/recent-applications', adminA.token);
      const data: any = await res.json();
      const applications = data.data.applications;
      if (
        res.status === 200 &&
        applications.length === 7 &&
        applications[0].applicationId === applicationA1 &&
        applications.every(
          (appRow: any) => appRow.jobTitle !== 'Other Recruiter Role'
        )
      ) {
        logPass('Recent applications are recruiter-scoped and newest first');
      } else {
        logFail('Recent applications mismatch', JSON.stringify(applications));
      }
    } catch (err) {
      logFail('Recent applications test failed', (err as Error).message);
    }

    console.log('\n--- Test 8: Empty State Handling ---');
    try {
      const summaryRes = await apiGet('/analytics/summary', adminEmpty.token);
      const summaryData: any = await summaryRes.json();
      const funnelRes = await apiGet(
        '/analytics/hiring-funnel',
        adminEmpty.token
      );
      const funnelData: any = await funnelRes.json();
      const trendsRes = await apiGet(
        '/analytics/application-trends?range=7d',
        adminEmpty.token
      );
      const trendsData: any = await trendsRes.json();
      const topRes = await apiGet('/analytics/top-jobs', adminEmpty.token);
      const topData: any = await topRes.json();
      const recentRes = await apiGet(
        '/analytics/recent-applications',
        adminEmpty.token
      );
      const recentData: any = await recentRes.json();

      const trendTotal = trendsData.data.trends.reduce(
        (sum: number, point: any) => sum + point.applications,
        0
      );
      if (
        summaryData.data.summary.totalJobs === 0 &&
        funnelData.data.funnel.pending === 0 &&
        trendsData.data.trends.length === 7 &&
        trendTotal === 0 &&
        topData.data.jobs.length === 0 &&
        recentData.data.applications.length === 0
      ) {
        logPass('Empty recruiter analytics return zeroed data structures');
      } else {
        logFail(
          'Empty state mismatch',
          JSON.stringify({
            summary: summaryData.data.summary,
            funnel: funnelData.data.funnel,
            trends: trendsData.data.trends,
            top: topData.data.jobs,
            recent: recentData.data.applications,
          })
        );
      }
    } catch (err) {
      logFail('Empty state test failed', (err as Error).message);
    }

    console.log('\nCleaning up analytics integration test records...');
    await cleanupAnalyticsRecords(Object.values(emails));
    logPass('Analytics test data cleaned up');
  } catch (err) {
    console.error('Analytics integration test flow failed:', err);
    try {
      await cleanupAnalyticsRecords(Object.values(emails));
      console.log('Cleaned up analytics test records after failure.');
    } catch (cleanupErr) {
      console.error('Analytics test cleanup failed:', cleanupErr);
    }
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
