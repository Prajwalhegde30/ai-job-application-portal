/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
import { Server } from 'http';
import app from '../app';
import { db, connectDatabase, disconnectDatabase } from '../config/database';

const TEST_PORT = 8082;
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

async function runTests(): Promise<void> {
  console.log('='.repeat(80));
  console.log('  AI Job Portal — Job Management Integration Tests');
  console.log('='.repeat(80));

  try {
    // 1. Setup DB and Server
    await connectDatabase(3, 1000);
    server = app.listen(TEST_PORT);
    console.log(`Test server started on port ${TEST_PORT}\n`);

    // Obtain tokens
    console.log('Logging in standard test accounts...');
    const admin1Token = await getToken('admin@test.com', 'Admin@123');
    const userToken = await getToken('user@test.com', 'User@123');
    logPass('Logged in Admin 1 and User successfully');

    // Create and login Admin 2 (recruiter 2) dynamically
    const admin2Email = `recruiter2_${Date.now()}@test.com`;
    const admin2Password = 'Password123!';

    // Register as user first
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Recruiter Two',
        email: admin2Email,
        password: admin2Password,
      }),
    });
    const regData: any = await regRes.json();
    if (regRes.status !== 201) {
      throw new Error(
        `Failed to register user: ${regRes.status} ${JSON.stringify(regData)}`
      );
    }
    const admin2Id = regData.data.user.id;

    // Escalate privileges via DB update
    await db.query('UPDATE users SET role = $1 WHERE id = $2', [
      'ADMIN',
      admin2Id,
    ]);
    const admin2Token = await getToken(admin2Email, admin2Password);
    logPass('Registered and promoted Admin 2 successfully');

    let createdJobId = '';
    let createdJobSlug = '';

    // -------------------------------------------------------------
    // Test 1: Admin 1 creates a DRAFT job
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Job Creation (DRAFT) ---');
    try {
      const jobPayload = {
        title: 'Backend Software Developer - TypeScript',
        company: 'InnovateCorp',
        description:
          'Join our team to build next-generation AI platforms using TypeScript.',
        requirements:
          'Must have 3+ years experience with Node.js and TypeScript.',
        responsibilities: 'Write robust backend APIs and write unit tests.',
        location: 'Remote, India',
        salaryMin: 900000,
        salaryMax: 1500000,
        jobType: 'REMOTE',
        status: 'DRAFT',
        isFeatured: true,
      };

      const res = await fetch(`${BASE_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin1Token}`,
        },
        body: JSON.stringify(jobPayload),
      });

      const data: any = await res.json();
      if (res.status === 201 && data.success === true) {
        createdJobId = data.data.job.id;
        createdJobSlug = data.data.job.slug;
        logPass(
          'Admin 1 created a DRAFT job successfully',
          `ID: ${createdJobId}, Slug: ${createdJobSlug}`
        );

        // Assertions
        if (data.data.job.status !== 'DRAFT')
          logFail('Expected status to be DRAFT', data.data.job.status);
        if (data.data.job.isFeatured !== true)
          logFail(
            'Expected isFeatured to be true',
            String(data.data.job.isFeatured)
          );
        if (!createdJobSlug) logFail('Expected slug to be generated');
      } else {
        logFail(
          'Failed to create job',
          `Status: ${res.status}, Body: ${JSON.stringify(data)}`
        );
      }
    } catch (err) {
      logFail('Job creation test threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 2: User Role Restriction Check
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Role Authorization Checks ---');
    try {
      // User attempts to create a job
      const res = await fetch(`${BASE_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          title: 'Hacker Engineer',
          company: 'Hacks',
          description: 'Try to hack',
          requirements: 'Hacking skills',
          location: 'Remote',
          jobType: 'REMOTE',
        }),
      });
      const data: any = await res.json();
      if (res.status === 403) {
        logPass('User role blocked from job creation with 403 Forbidden');
      } else {
        logFail(
          'Expected user job creation to fail with 403',
          `Status: ${res.status}, Body: ${JSON.stringify(data)}`
        );
      }
    } catch (err) {
      logFail('User job creation test threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 3: Draft Job Visibility Restriction Check
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Draft Job Visibility Restriction Check ---');
    try {
      // User attempts to view the draft job by ID
      const getRes = await fetch(`${BASE_URL}/jobs/${createdJobId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const getData: any = await getRes.json();
      if (getRes.status === 404) {
        logPass('User gets 404 for a draft job');
      } else {
        logFail(
          'User should get 404 for a draft job',
          `Status: ${getRes.status}, Body: ${JSON.stringify(getData)}`
        );
      }

      // User attempts to list jobs
      const listRes = await fetch(`${BASE_URL}/jobs`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const listData: any = await listRes.json();
      const jobFound = listData.data.jobs.some(
        (j: any) => j.id === createdJobId
      );
      if (!jobFound) {
        logPass('Draft job is excluded from public search listings');
      } else {
        logFail('Draft job should NOT be visible in public listings');
      }
    } catch (err) {
      logFail('Draft visibility check threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 4: Ownership Restriction Checks
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Ownership Restriction Checks ---');
    try {
      // Admin 2 attempts to edit Admin 1's draft job
      const editRes = await fetch(`${BASE_URL}/jobs/${createdJobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin2Token}`,
        },
        body: JSON.stringify({
          title: 'Modified by unauthorized admin',
        }),
      });
      await editRes.json();
      if (editRes.status === 403) {
        logPass(
          "Admin 2 blocked from editing Admin 1's job with 403 Forbidden"
        );
      } else {
        logFail(
          'Expected edit by unauthorized admin to fail with 403',
          `Status: ${editRes.status}`
        );
      }

      // Admin 2 attempts to delete Admin 1's job
      const delRes = await fetch(`${BASE_URL}/jobs/${createdJobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${admin2Token}` },
      });
      if (delRes.status === 403) {
        logPass(
          "Admin 2 blocked from deleting Admin 1's job with 403 Forbidden"
        );
      } else {
        logFail(
          'Expected delete by unauthorized admin to fail with 403',
          `Status: ${delRes.status}`
        );
      }
    } catch (err) {
      logFail(
        'Ownership restriction checks threw error',
        (err as Error).message
      );
    }

    // -------------------------------------------------------------
    // Test 5: Job Update and Slug Regeneration Check
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Job Update and Slug Regeneration ---');
    try {
      const updatedTitle = 'Lead Software Engineer - TypeScript';
      const updateRes = await fetch(`${BASE_URL}/jobs/${createdJobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin1Token}`,
        },
        body: JSON.stringify({
          title: updatedTitle,
        }),
      });

      const updateData: any = await updateRes.json();
      if (updateRes.status === 200 && updateData.success === true) {
        const updatedJob = updateData.data.job;
        if (updatedJob.title === updatedTitle) {
          logPass('Job updated successfully by owner');
        } else {
          logFail('Title not updated in response', updatedJob.title);
        }

        // Verify slug has regenerated
        if (updatedJob.slug !== createdJobSlug) {
          logPass(
            'Slug regenerated successfully after title update',
            `New Slug: ${updatedJob.slug}`
          );
          createdJobSlug = updatedJob.slug;
        } else {
          logFail('Slug did not change after title update', updatedJob.slug);
        }
      } else {
        logFail('Job update failed', `Status: ${updateRes.status}`);
      }
    } catch (err) {
      logFail('Job update test threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 6: Publish Workflow
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Publish Workflow ---');
    try {
      const pubRes = await fetch(`${BASE_URL}/jobs/${createdJobId}/publish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${admin1Token}` },
      });
      const pubData: any = await pubRes.json();
      if (pubRes.status === 200 && pubData.success === true) {
        const job = pubData.data.job;
        if (job.status === 'PUBLISHED' && job.publishedAt) {
          logPass(
            'Job status transitioned to PUBLISHED with publishedAt timestamp'
          );
        } else {
          logFail(
            'Published job has incorrect status or lacks publishedAt timestamp',
            JSON.stringify(job)
          );
        }
      } else {
        logFail('Publish endpoint failed', `Status: ${pubRes.status}`);
      }

      // Verify user can now access details
      const viewRes = await fetch(`${BASE_URL}/jobs/${createdJobId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (viewRes.status === 200) {
        logPass('User can now retrieve the job by ID');
      } else {
        logFail(
          'User failed to fetch the published job by ID',
          `Status: ${viewRes.status}`
        );
      }
    } catch (err) {
      logFail('Publish workflow test threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 7: Retrieve Job by Slug
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Retrieve Job by Slug ---');
    try {
      const viewRes = await fetch(`${BASE_URL}/jobs/${createdJobSlug}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const viewData: any = await viewRes.json();
      if (viewRes.status === 200 && viewData.success === true) {
        if (viewData.data.job.id === createdJobId) {
          logPass('Job details retrieved successfully using generated slug');
        } else {
          logFail('Mismatched job ID retrieved by slug', viewData.data.job.id);
        }
      } else {
        logFail('Retrieving job by slug failed', `Status: ${viewRes.status}`);
      }
    } catch (err) {
      logFail('Slug retrieval check threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 8: Public Search & Filters
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Public Search & Filters ---');
    try {
      // 1. Search filter
      const searchRes = await fetch(`${BASE_URL}/jobs?search=TypeScript`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const searchData: any = await searchRes.json();
      const searchFound = searchData.data.jobs.some(
        (j: any) => j.id === createdJobId
      );
      if (searchFound) {
        logPass('Case-insensitive search query returned the job');
      } else {
        logFail(
          'Job not returned in search search=TypeScript',
          JSON.stringify(searchData)
        );
      }

      // 2. Job Type filter
      const typeRes = await fetch(`${BASE_URL}/jobs?jobType=REMOTE`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const typeData: any = await typeRes.json();
      const typeFound = typeData.data.jobs.some(
        (j: any) => j.id === createdJobId
      );
      if (typeFound) {
        logPass('Job type filtering returned the job');
      } else {
        logFail('Job not returned when filtering by jobType=REMOTE');
      }

      // 3. Location filter
      const locRes = await fetch(`${BASE_URL}/jobs?location=Remote`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const locData: any = await locRes.json();
      const locFound = locData.data.jobs.some(
        (j: any) => j.id === createdJobId
      );
      if (locFound) {
        logPass('Location filtering returned the job');
      } else {
        logFail('Job not returned when filtering by location=Remote');
      }
    } catch (err) {
      logFail('Search/filtering test threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 9: Close Workflow
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Close Workflow ---');
    try {
      const closeRes = await fetch(`${BASE_URL}/jobs/${createdJobId}/close`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${admin1Token}` },
      });
      const closeData: any = await closeRes.json();
      if (closeRes.status === 200 && closeData.success === true) {
        const job = closeData.data.job;
        if (job.status === 'CLOSED' && job.closedAt) {
          logPass('Job status transitioned to CLOSED with closedAt timestamp');
        } else {
          logFail(
            'Closed job has incorrect status or lacks closedAt timestamp',
            JSON.stringify(job)
          );
        }
      } else {
        logFail('Close endpoint failed', `Status: ${closeRes.status}`);
      }

      // Verify user gets 404 now
      const viewRes = await fetch(`${BASE_URL}/jobs/${createdJobId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (viewRes.status === 404) {
        logPass('User gets 404 for a closed job');
      } else {
        logFail(
          'User should get 404 for a closed job',
          `Status: ${viewRes.status}`
        );
      }
    } catch (err) {
      logFail('Close workflow test threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 10: Soft Delete Workflow
    // -------------------------------------------------------------
    console.log('\n--- Test 10: Soft Delete ---');
    try {
      // Re-create a job and then delete it to test soft-delete directly from DRAFT or PUBLISHED
      const tempRes = await fetch(`${BASE_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin1Token}`,
        },
        body: JSON.stringify({
          title: 'Temp Job for Deletion',
          company: 'InnovateCorp',
          description: 'Job description for deletion testing purposes.',
          requirements: 'Requirements description.',
          location: 'Bangalore',
          jobType: 'FULL_TIME',
        }),
      });
      const tempData: any = await tempRes.json();
      const tempJobId = tempData.data.job.id;

      const delRes = await fetch(`${BASE_URL}/jobs/${tempJobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${admin1Token}` },
      });
      const delData: any = await delRes.json();

      if (delRes.status === 200 && delData.success === true) {
        logPass('Delete endpoint returned 200 success');

        // Query DB directly to verify status is CLOSED and closed_at is set (Soft Delete verification)
        const dbVerify = await db.query(
          'SELECT status, closed_at FROM jobs WHERE id = $1',
          [tempJobId]
        );
        const dbJob = dbVerify.rows[0];
        if (dbJob && dbJob.status === 'CLOSED' && dbJob.closed_at !== null) {
          logPass(
            'Soft delete verified: status is CLOSED and closed_at is set in database'
          );
        } else {
          logFail('Soft delete failed in database', JSON.stringify(dbJob));
        }
      } else {
        logFail('Delete endpoint failed', `Status: ${delRes.status}`);
      }
    } catch (err) {
      logFail('Soft delete workflow test threw error', (err as Error).message);
    }

    // Clean up created test recruiter from database
    console.log('\nCleaning up integration test users from database...');
    await db.query('DELETE FROM users WHERE email = $1', [admin2Email]);
    logPass('Cleaned up dynamic recruiter successfully');
  } catch (err) {
    console.error('Migration or setup failed:', err);
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
