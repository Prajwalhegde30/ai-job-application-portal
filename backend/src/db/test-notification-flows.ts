/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
import { Server } from 'http';
import app from '../app';
import { db, connectDatabase, disconnectDatabase } from '../config/database';

const TEST_PORT = 8085;
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
  console.log('  AI Job Portal — Notification Management Integration Tests');
  console.log('='.repeat(80));

  const userAEmail = `notiftest_usera_${Date.now()}@test.com`;
  const userBEmail = `notiftest_userb_${Date.now()}@test.com`;
  const adminAEmail = `notiftest_admina_${Date.now()}@test.com`;
  const adminBEmail = `notiftest_adminb_${Date.now()}@test.com`;
  const password = 'TestPass123!';

  let userAToken: string;
  let userBToken: string;
  let adminAToken: string;
  let adminBToken: string;

  let publishedJobId: string;
  let resumeAId: string;
  let resumeBId: string;
  let applicationAId = '';

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
    const userBRecord = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [userBEmail]
    );
    const userBId = userBRecord.rows[0].id;
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
        title: 'Test Senior Frontend Developer',
        company: 'Innovate Tech',
        description: 'Need a senior frontend developer with React experience.',
        requirements: 'React, TypeScript, CSS, testing.',
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
    const mockPdf = new Blob([Buffer.from('%PDF-1.4 Mock PDF')], {
      type: 'application/pdf',
    });
    resumeForm.append('file', mockPdf, 'resumeA.pdf');
    resumeForm.append('resumeTitle', 'User A Resume');

    const resumeRes = await fetch(`${BASE_URL}/resumes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
      body: resumeForm,
    });
    const resumeData: any = await resumeRes.json();
    resumeAId = resumeData.data.resume.id;

    // User B uploads a resume
    const resumeBForm = new FormData();
    resumeBForm.append('file', mockPdf, 'resumeB.pdf');
    resumeBForm.append('resumeTitle', 'User B Resume');

    const resumeBRes = await fetch(`${BASE_URL}/resumes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userBToken}` },
      body: resumeBForm,
    });
    const resumeBData: any = await resumeBRes.json();
    resumeBId = resumeBData.data.resume.id;

    logPass('Uploaded test resumes');

    // =============================================
    // TEST 1: Application Created Notification
    // =============================================
    console.log('\n--- Test 1: Application Created Event ---');
    try {
      // Clear notifications first for Admin A
      await db.query('DELETE FROM notifications');

      // User A applies to Admin A's job
      const applyRes = await fetch(`${BASE_URL}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          jobId: publishedJobId,
          resumeId: resumeAId,
          coverLetter: 'Hello!',
        }),
      });
      const applyData: any = await applyRes.json();
      applicationAId = applyData.data.application.id;
      await sleep(150);

      // Verify Admin A (recruiter) got a notification
      const adminNotifRes = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${adminAToken}` },
      });
      const adminNotifData: any = await adminNotifRes.json();
      const notifs = adminNotifData.data.notifications;

      if (notifs.length === 1 && notifs[0].type === 'APPLICATION_CREATED') {
        logPass('Recruiter received APPLICATION_CREATED notification');
        if (
          notifs[0].message.includes('User A') &&
          notifs[0].message.includes('Test Senior Frontend Developer')
        ) {
          logPass('Notification copy matches expected format');
        } else {
          logFail('Notification copy mismatch', notifs[0].message);
        }
      } else {
        logFail(
          'Recruiter failed to get correct application notification',
          JSON.stringify(notifs)
        );
      }

      // Verify Candidate A got NO new notifications (only standard seed/job publish bulk notification if any)
      // Since Candidate A is a USER, they got the JOB_PUBLISHED bulk notif when the job was posted!
      // But they shouldn't get any application creation notif for their own action.
      const candidateNotifRes = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const candidateNotifData: any = await candidateNotifRes.json();
      const candNotifs = candidateNotifData.data.notifications;
      const applyCreatedNotif = candNotifs.find(
        (n: any) => n.type === 'APPLICATION_CREATED'
      );

      if (!applyCreatedNotif) {
        logPass(
          'Candidate did not receive APPLICATION_CREATED notification for self action'
        );
      } else {
        logFail('Candidate received self application notification');
      }
    } catch (err) {
      logFail('Test 1 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 2: Application Withdrawn Notification
    // =============================================
    console.log('\n--- Test 2: Application Withdrawn Event ---');
    try {
      // Clear notifications again
      await db.query('DELETE FROM notifications');

      // Candidate A withdraws application
      await fetch(`${BASE_URL}/applications/${applicationAId}/withdraw`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      await sleep(150);

      // Verify Admin A got APPLICATION_WITHDRAWN notification
      const adminNotifRes = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${adminAToken}` },
      });
      const adminNotifData: any = await adminNotifRes.json();
      const notifs = adminNotifData.data.notifications;

      if (notifs.length === 1 && notifs[0].type === 'APPLICATION_WITHDRAWN') {
        logPass('Recruiter received APPLICATION_WITHDRAWN notification');
        if (
          notifs[0].message.includes('User A') &&
          notifs[0].message.includes('withdrawn')
        ) {
          logPass('Notification message copy is correct');
        } else {
          logFail('Unexpected copy', notifs[0].message);
        }
      } else {
        logFail(
          'Recruiter failed to get withdraw notification',
          JSON.stringify(notifs)
        );
      }
    } catch (err) {
      logFail('Test 2 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 3: Recruiter Status Updates (Status Changed Events)
    // =============================================
    console.log('\n--- Test 3: Status Transition Notifications ---');
    try {
      // Clear notifications
      await db.query('DELETE FROM notifications');

      // Candidate B applies to Job
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
      const applicationBId = applyData.data.application.id;
      await sleep(150);

      // Clear notifications to start clean
      await db.query('DELETE FROM notifications');

      // Admin A transitions status PENDING -> REVIEWING
      await fetch(`${BASE_URL}/admin/applications/${applicationBId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAToken}`,
        },
        body: JSON.stringify({ status: 'REVIEWING', notes: 'Looking good' }),
      });
      await sleep(150);

      // Verify Candidate B got APPLICATION_REVIEWING notification
      let userBNotifRes = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      let userBNotifData: any = await userBNotifRes.json();
      let notifs = userBNotifData.data.notifications;

      if (notifs.length === 1 && notifs[0].type === 'APPLICATION_REVIEWING') {
        logPass(
          'Candidate B received APPLICATION_REVIEWING status notification'
        );
      } else {
        logFail(
          'Expected APPLICATION_REVIEWING notification',
          JSON.stringify(notifs)
        );
      }

      // Admin A transitions status REVIEWING -> SHORTLISTED
      await fetch(`${BASE_URL}/admin/applications/${applicationBId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAToken}`,
        },
        body: JSON.stringify({ status: 'SHORTLISTED', notes: 'Shortlisted' }),
      });
      await sleep(150);

      // Verify Candidate B got APPLICATION_SHORTLISTED notification
      userBNotifRes = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      userBNotifData = await userBNotifRes.json();
      notifs = userBNotifData.data.notifications;

      const shortlistedNotif = notifs.find(
        (n: any) => n.type === 'APPLICATION_SHORTLISTED'
      );
      if (shortlistedNotif) {
        logPass(
          'Candidate B received APPLICATION_SHORTLISTED status notification'
        );
      } else {
        logFail(
          'Expected APPLICATION_SHORTLISTED notification in list',
          JSON.stringify(notifs)
        );
      }

      // Admin A transitions status SHORTLISTED -> HIRED
      await fetch(`${BASE_URL}/admin/applications/${applicationBId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAToken}`,
        },
        body: JSON.stringify({ status: 'HIRED', notes: 'Hired' }),
      });
      await sleep(150);

      // Verify Candidate B got APPLICATION_HIRED notification
      userBNotifRes = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      userBNotifData = await userBNotifRes.json();
      notifs = userBNotifData.data.notifications;

      const hiredNotif = notifs.find(
        (n: any) => n.type === 'APPLICATION_HIRED'
      );
      if (hiredNotif) {
        logPass('Candidate B received APPLICATION_HIRED status notification');
        if (hiredNotif.message.includes('Congratulations')) {
          logPass('Status change message copy is correct');
        } else {
          logFail('Unexpected copy', hiredNotif.message);
        }
      } else {
        logFail(
          'Expected APPLICATION_HIRED notification in list',
          JSON.stringify(notifs)
        );
      }
    } catch (err) {
      logFail('Test 3 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 4: Unread Count API
    // =============================================
    console.log('\n--- Test 4: Unread Count API ---');
    try {
      const countRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      const countData: any = await countRes.json();

      if (countRes.status === 200 && countData.data.unreadCount === 3) {
        logPass('Unread count correctly returned 3 unread notifications');
      } else {
        logFail('Unread count incorrect', JSON.stringify(countData));
      }
    } catch (err) {
      logFail('Test 4 failed', (err as Error).message);
    }

    // =============================================
    // TEST 5: Mark Read & Mark All Read
    // =============================================
    console.log('\n--- Test 5: Mark As Read / Read All ---');
    try {
      // Get User B's notifications
      const userBNotifRes = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      const userBNotifData: any = await userBNotifRes.json();
      const notifs = userBNotifData.data.notifications;
      const targetNotifId = notifs[0].id;

      // Mark single notification as read
      const readRes = await fetch(
        `${BASE_URL}/notifications/${targetNotifId}/read`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${userBToken}` },
        }
      );
      const readData: any = await readRes.json();

      if (
        readRes.status === 200 &&
        readData.data.notification.is_read === true
      ) {
        logPass('Single notification marked as read');
      } else {
        logFail('Failed to mark as read', JSON.stringify(readData));
      }

      // Check count again
      const countRes1 = await fetch(`${BASE_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      const countData1: any = await countRes1.json();
      if (countData1.data.unreadCount === 2) {
        logPass('Unread count correctly updated to 2');
      } else {
        logFail(
          'Unread count did not decrement correctly',
          JSON.stringify(countData1)
        );
      }

      // Mark all as read
      const allReadRes = await fetch(`${BASE_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userBToken}` },
      });

      if (allReadRes.status === 200) {
        logPass('Mark all as read succeeded');
      } else {
        logFail('Mark all as read failed', `Status: ${allReadRes.status}`);
      }

      // Check count again (should be 0)
      const countRes2 = await fetch(`${BASE_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      const countData2: any = await countRes2.json();
      if (countData2.data.unreadCount === 0) {
        logPass('Unread count correctly updated to 0');
      } else {
        logFail('Unread count not zero', JSON.stringify(countData2));
      }
    } catch (err) {
      logFail('Test 5 failed', (err as Error).message);
    }

    // =============================================
    // TEST 6: Delete & Ownership Enforcement
    // =============================================
    console.log('\n--- Test 6: Deletion & Ownership Security Checks ---');
    try {
      // Get User B's notifications
      const userBNotifRes = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      const userBNotifData: any = await userBNotifRes.json();
      const notifs = userBNotifData.data.notifications;
      const targetNotifId = notifs[0].id;

      // User A attempts to mark User B's notification as read (should fail with 403)
      const badReadRes = await fetch(
        `${BASE_URL}/notifications/${targetNotifId}/read`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${userAToken}` },
        }
      );
      if (badReadRes.status === 403) {
        logPass(
          "User A blocked from marking User B's notification as read (403)"
        );
      } else {
        logFail(
          'Expected 403 status code for unauthorized read update',
          `Got: ${badReadRes.status}`
        );
      }

      // User A attempts to delete User B's notification (should fail with 403)
      const badDelRes = await fetch(
        `${BASE_URL}/notifications/${targetNotifId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userAToken}` },
        }
      );
      if (badDelRes.status === 403) {
        logPass("User A blocked from deleting User B's notification (403)");
      } else {
        logFail(
          'Expected 403 status code for unauthorized delete',
          `Got: ${badDelRes.status}`
        );
      }

      // User B deletes own notification
      const delRes = await fetch(`${BASE_URL}/notifications/${targetNotifId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      if (delRes.status === 200) {
        logPass('User B deleted own notification successfully');
      } else {
        logFail('Delete notification failed', `Status: ${delRes.status}`);
      }

      // Verify notification is gone
      const verifyRes = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      const verifyData: any = await verifyRes.json();
      const exists = verifyData.data.notifications.some(
        (n: any) => n.id === targetNotifId
      );
      if (!exists) {
        logPass('Verified notification is no longer returned in list');
      } else {
        logFail('Notification still exists in database list');
      }
    } catch (err) {
      logFail('Test 6 failed', (err as Error).message);
    }

    // =============================================
    // TEST 7: Pagination
    // =============================================
    console.log('\n--- Test 7: Pagination and Metadata Check ---');
    try {
      // Clear notifications
      await db.query('DELETE FROM notifications');

      // Create 5 dummy system notifications for User B directly in database
      for (let i = 1; i <= 5; i++) {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, is_read)
           VALUES ($1, 'SYSTEM', $2, $3, FALSE)`,
          [userBId, `System Notification ${i}`, `Message body ${i}`]
        );
      }

      // Fetch with page=1 & limit=2
      const res = await fetch(`${BASE_URL}/notifications?page=1&limit=2`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      const data: any = await res.json();

      if (res.status === 200 && data.success) {
        const payload = data.data;
        if (payload.notifications.length === 2) {
          logPass('Limit constraint enforced (returned 2 items)');
        } else {
          logFail(
            'Limit not enforced',
            `Count: ${payload.notifications.length}`
          );
        }

        if (
          payload.totalCount === 5 &&
          payload.totalPages === 3 &&
          payload.unreadCount === 5
        ) {
          logPass('Pagination metadata fields are correct');
        } else {
          logFail('Metadata incorrect', JSON.stringify(payload));
        }
      } else {
        logFail('Paginated query failed', `Status: ${res.status}`);
      }
    } catch (err) {
      logFail('Test 7 failed', (err as Error).message);
    }

    // =============================================
    // TEST 8: Job Published Broadcast (Bulk Notification)
    // =============================================
    console.log('\n--- Test 8: Job Published Bulk Notification ---');
    try {
      // Clear notifications first
      await db.query('DELETE FROM notifications');

      // Count candidate users in database
      const candidates = await db.query(
        "SELECT id FROM users WHERE role = 'USER'"
      );
      const candCount = candidates.rows.length;

      // Admin B creates a new published job
      await fetch(`${BASE_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminBToken}`,
        },
        body: JSON.stringify({
          title: 'Staff Security Engineer',
          company: 'SecureCorp',
          description: 'Secure everything in sight.',
          requirements: 'Security testing and authorization checks.',
          location: 'Bangalore',
          jobType: 'FULL_TIME',
          status: 'PUBLISHED',
        }),
      });
      await sleep(500);

      // Verify BOTH User A and User B received a notification (since role='USER')
      const notifA = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const notifB = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });

      const dataA: any = await notifA.json();
      const dataB: any = await notifB.json();

      const hasNotifA = dataA.data.notifications.some(
        (n: any) => n.type === 'JOB_PUBLISHED' && n.title === 'New Job Posted'
      );
      const hasNotifB = dataB.data.notifications.some(
        (n: any) => n.type === 'JOB_PUBLISHED' && n.title === 'New Job Posted'
      );

      // Verify that ALL candidate users received the notification in the database
      const dbNotifs = await db.query(
        "SELECT user_id FROM notifications WHERE type = 'JOB_PUBLISHED' AND title = 'New Job Posted'"
      );
      const recipientIds = dbNotifs.rows.map((r: any) => r.user_id);

      const missingCandidates = candidates.rows.filter(
        (c: any) => !recipientIds.includes(c.id)
      );

      if (missingCandidates.length === 0 && hasNotifA && hasNotifB) {
        logPass(
          `Bulk JOB_PUBLISHED notifications successfully delivered to all candidates (Count: ${candCount})`
        );
      } else {
        logFail(
          'JOB_PUBLISHED broadcast failed',
          `Missing: ${missingCandidates.length}, A: ${hasNotifA}, B: ${hasNotifB}`
        );
        console.log(
          'User A Notifications:',
          JSON.stringify(dataA.data, null, 2)
        );
        console.log(
          'User B Notifications:',
          JSON.stringify(dataB.data, null, 2)
        );
      }
    } catch (err) {
      logFail('Test 8 failed', (err as Error).message);
    }

    // Cleanup
    console.log('\nCleaning up notification integration test records...');
    await db.query('DELETE FROM notifications');
    await db.query('DELETE FROM applications WHERE job_id = $1', [
      publishedJobId,
    ]);
    await db.query(
      'DELETE FROM resumes WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2))',
      [userAEmail, userBEmail]
    );
    await db.query(
      'DELETE FROM jobs WHERE posted_by IN (SELECT id FROM users WHERE email IN ($1, $2))',
      [adminAEmail, adminBEmail]
    );
    await db.query('DELETE FROM users WHERE email IN ($1, $2, $3, $4)', [
      userAEmail,
      userBEmail,
      adminAEmail,
      adminBEmail,
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
