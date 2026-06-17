/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
import { Server } from 'http';
import fs from 'fs';
import path from 'path';
import app from '../app';
import { db, connectDatabase, disconnectDatabase } from '../config/database';

const TEST_PORT = 8083;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
const MOCK_STORAGE_DIR = path.join(process.cwd(), 'storage_mock');

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
  console.log('  AI Job Portal — Resume Management Integration Tests');
  console.log('='.repeat(80));

  try {
    // 1. Setup DB and Server
    await connectDatabase(3, 1000);
    server = app.listen(TEST_PORT);
    console.log(`Test server started on port ${TEST_PORT}\n`);

    // Obtain tokens
    console.log('Logging in standard User A (user@test.com)...');
    const userAToken = await getToken('user@test.com', 'User@123');

    // Register User B dynamically
    const userBEmail = `userB_${Date.now()}@test.com`;
    const userBPassword = 'Password123!';
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User B Account',
        email: userBEmail,
        password: userBPassword,
      }),
    });
    const regData: any = await regRes.json();
    if (regRes.status !== 201) {
      throw new Error(
        `Failed to register User B: ${regRes.status} ${JSON.stringify(regData)}`
      );
    }
    const userBToken = await getToken(userBEmail, userBPassword);
    logPass('Logged in User A and registered User B successfully');

    let resume1Id = '';
    let resume2Id = '';
    let resume2StoragePath = '';

    // -------------------------------------------------------------
    // Test 1: Upload a valid PDF resume (User A)
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Valid PDF Upload (First Resume) ---');
    try {
      const formData = new FormData();
      const mockPdf = new Blob([Buffer.from('%PDF-1.4 Mock PDF Content')], {
        type: 'application/pdf',
      });
      formData.append('file', mockPdf, 'priya_resume_1.pdf');
      formData.append('resumeTitle', 'React Frontend Resume');

      const res = await fetch(`${BASE_URL}/resumes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
        body: formData,
      });

      const data: any = await res.json();
      if (res.status === 201 && data.success === true) {
        resume1Id = data.data.resume.id;
        logPass('First resume uploaded successfully', `ID: ${resume1Id}`);

        // Assertions for Task 2, 3, 4, 6
        const resume = data.data.resume;
        if (resume.resumeTitle !== 'React Frontend Resume')
          logFail('resumeTitle mismatch', resume.resumeTitle);
        if (resume.fileName !== 'priya_resume_1.pdf')
          logFail('fileName mismatch', resume.fileName);
        if (resume.isActive !== true)
          logFail('First uploaded resume must be automatically active');
        if (!resume.storagePath.startsWith('resumes/'))
          logFail('Invalid storagePath format', resume.storagePath);
        if (resume.resumeText !== null || resume.parsedAt !== null)
          logFail('AI fields should be null initially');

        // Legacy column compatibility check
        const dbVerify = await db.query(
          'SELECT name, file_url, file_key, is_default FROM resumes WHERE id = $1',
          [resume1Id]
        );
        const dbRow = dbVerify.rows[0];
        if (dbRow.name !== 'priya_resume_1.pdf' || dbRow.is_default !== true) {
          logFail(
            'Legacy columns name or is_default not set correctly in DB',
            JSON.stringify(dbRow)
          );
        } else {
          logPass('Legacy columns compatibility validated in DB');
        }
      } else {
        logFail(
          'Failed to upload valid PDF',
          `Status: ${res.status}, Body: ${JSON.stringify(data)}`
        );
      }
    } catch (err) {
      logFail('PDF upload test threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 2: Reject invalid files and oversized files
    // -------------------------------------------------------------
    console.log('\n--- Test 2: File Validation Rejections ---');

    // Reject DOCX file
    try {
      const formData = new FormData();
      const mockDocx = new Blob([Buffer.from('fake docx content')], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      formData.append('file', mockDocx, 'resume.docx');
      formData.append('resumeTitle', 'Docx Resume');

      const res = await fetch(`${BASE_URL}/resumes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: formData,
      });
      const data: any = await res.json();
      if (res.status === 400 && data.error?.code === 'INVALID_FILE_TYPE') {
        logPass('Backend successfully rejected DOCX file with 400 Bad Request');
      } else {
        logFail(
          'DOCX upload should fail with 400 INVALID_FILE_TYPE',
          `Status: ${res.status}, Code: ${data.error?.code}`
        );
      }
    } catch (err) {
      logFail('DOCX validation check threw error', (err as Error).message);
    }

    // Reject ZIP file
    try {
      const formData = new FormData();
      const mockZip = new Blob([Buffer.from('fake zip')], {
        type: 'application/zip',
      });
      formData.append('file', mockZip, 'hacks.zip');
      formData.append('resumeTitle', 'Zip CV');

      const res = await fetch(`${BASE_URL}/resumes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: formData,
      });
      await res.json();
      if (res.status === 400) {
        logPass('Backend successfully rejected ZIP file with 400 Bad Request');
      } else {
        logFail('ZIP upload should fail with 400', `Status: ${res.status}`);
      }
    } catch (err) {
      logFail('ZIP validation check threw error', (err as Error).message);
    }

    // Reject Oversized file (> 5MB)
    try {
      const formData = new FormData();
      const largeBuffer = Buffer.alloc(5.2 * 1024 * 1024); // 5.2 MB
      const mockLargeFile = new Blob([largeBuffer], {
        type: 'application/pdf',
      });
      formData.append('file', mockLargeFile, 'huge_resume.pdf');
      formData.append('resumeTitle', 'Huge CV');

      const res = await fetch(`${BASE_URL}/resumes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: formData,
      });
      const data: any = await res.json();
      if (res.status === 400 && data.error?.code === 'INVALID_FILE_SIZE') {
        logPass(
          'Backend successfully rejected oversized file (>5MB) with 400 Bad Request'
        );
      } else {
        logFail(
          'Oversized upload should fail with 400 INVALID_FILE_SIZE',
          `Status: ${res.status}, Code: ${data.error?.code}`
        );
      }
    } catch (err) {
      logFail('Oversized validation check threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 3: Upload Second Resume (User A)
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Upload Second Resume (Verify Inactive) ---');
    try {
      const formData = new FormData();
      const mockPdf = new Blob([Buffer.from('%PDF-1.4 Mock PDF Content')], {
        type: 'application/pdf',
      });
      formData.append('file', mockPdf, 'priya_backend_resume.pdf');
      formData.append('resumeTitle', 'Node.js Backend Resume');

      const res = await fetch(`${BASE_URL}/resumes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: formData,
      });

      const data: any = await res.json();
      if (res.status === 201 && data.success === true) {
        resume2Id = data.data.resume.id;
        resume2StoragePath = data.data.resume.storagePath;
        logPass('Second resume uploaded successfully', `ID: ${resume2Id}`);

        if (data.data.resume.isActive !== false) {
          logFail('Second uploaded resume must NOT be automatically active');
        } else {
          logPass('Second resume inactive status confirmed');
        }
      } else {
        logFail('Failed to upload second resume', `Status: ${res.status}`);
      }
    } catch (err) {
      logFail('Second upload test threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 4: Activate Resume (Toggle active status)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Activate Resume (Deactivate previous) ---');
    try {
      const res = await fetch(`${BASE_URL}/resumes/${resume2Id}/activate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const data: any = await res.json();

      if (res.status === 200 && data.success === true) {
        if (data.data.resume.isActive === true) {
          logPass('Selected resume successfully toggled to active');
        } else {
          logFail('Resume did not report active status in response');
        }

        // Verify resume 1 was deactivated
        const listRes = await fetch(`${BASE_URL}/resumes`, {
          headers: { Authorization: `Bearer ${userAToken}` },
        });
        const listData: any = await listRes.json();

        const r1 = listData.data.resumes.find((r: any) => r.id === resume1Id);
        const r2 = listData.data.resumes.find((r: any) => r.id === resume2Id);

        if (r1.isActive === false && r2.isActive === true) {
          logPass('First resume successfully deactivated in transaction');
        } else {
          logFail(
            'Auto-deactivation check failed',
            `r1 active: ${r1.isActive}, r2 active: ${r2.isActive}`
          );
        }
      } else {
        logFail('Activate request failed', `Status: ${res.status}`);
      }
    } catch (err) {
      logFail('Activate request check threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 5: Replace Resume
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Replace Resume ---');
    try {
      // Check that original mock storage file exists on disk
      const originalMockFile = path.join(MOCK_STORAGE_DIR, resume2StoragePath);
      if (!fs.existsSync(originalMockFile)) {
        logFail(`Mock storage file not found at ${originalMockFile}`);
      }

      const formData = new FormData();
      const mockPdf = new Blob(
        [Buffer.from('%PDF-1.4 Replaced PDF Content here')],
        { type: 'application/pdf' }
      );
      formData.append('file', mockPdf, 'replaced_resume.pdf');
      formData.append('resumeTitle', 'Updated Node.js Backend Resume');

      const res = await fetch(`${BASE_URL}/resumes/${resume2Id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: formData,
      });

      const data: any = await res.json();
      if (res.status === 200 && data.success === true) {
        const updatedResume = data.data.resume;
        logPass('Replace resume file request succeeded');

        if (updatedResume.fileName !== 'replaced_resume.pdf')
          logFail('fileName not updated', updatedResume.fileName);
        if (updatedResume.resumeTitle !== 'Updated Node.js Backend Resume')
          logFail('resumeTitle not updated', updatedResume.resumeTitle);

        // Verify storage cleanup of old file
        if (!fs.existsSync(originalMockFile)) {
          logPass(
            'Storage cleanup verified: old file deleted from mock storage folder'
          );
        } else {
          logFail('Legacy file still exists in storage after replacement');
        }

        // Verify new file exists
        const newMockFile = path.join(
          MOCK_STORAGE_DIR,
          updatedResume.storagePath
        );
        if (fs.existsSync(newMockFile)) {
          logPass(
            'Storage replacement verified: new file successfully written to disk'
          );
          resume2StoragePath = updatedResume.storagePath; // update ref
        } else {
          logFail('Replaced file not found in storage');
        }
      } else {
        logFail(
          'Replace resume file failed',
          `Status: ${res.status}, Body: ${JSON.stringify(data)}`
        );
      }
    } catch (err) {
      logFail('Replace resume check threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 6: View Resume (Signed URL)
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Signed URL Generation ---');
    try {
      const res = await fetch(`${BASE_URL}/resumes/${resume2Id}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success === true && data.data.signedUrl) {
        logPass('Signed URL generated successfully server-side');
        if (
          data.data.signedUrl.includes('mock-signature') &&
          data.data.signedUrl.includes('expires=')
        ) {
          logPass('Signed URL query params validated', data.data.signedUrl);
        } else {
          logFail('Signed URL lacks signature or expiry', data.data.signedUrl);
        }
      } else {
        logFail('Signed URL request failed', `Status: ${res.status}`);
      }
    } catch (err) {
      logFail('Signed URL check threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 7: Ownership Restriction Checks (User B accessing User A)
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Security Ownership Restrictions ---');
    try {
      // 1. User B tries to view User A's resume signed URL
      const viewRes = await fetch(`${BASE_URL}/resumes/${resume2Id}`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      if (viewRes.status === 403) {
        logPass("User B blocked from viewing User A's resume (403 Forbidden)");
      } else {
        logFail(
          'Expected view by unauthorized user to fail with 403',
          `Status: ${viewRes.status}`
        );
      }

      // 2. User B tries to activate User A's resume
      const actRes = await fetch(`${BASE_URL}/resumes/${resume2Id}/activate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      if (actRes.status === 403) {
        logPass(
          "User B blocked from activating User A's resume (403 Forbidden)"
        );
      } else {
        logFail(
          'Expected activate by unauthorized user to fail with 403',
          `Status: ${actRes.status}`
        );
      }

      // 3. User B tries to replace User A's resume file
      const formData = new FormData();
      const mockPdf = new Blob([Buffer.from('%PDF-1.4 Hacker PDF')], {
        type: 'application/pdf',
      });
      formData.append('file', mockPdf, 'hack.pdf');
      const repRes = await fetch(`${BASE_URL}/resumes/${resume2Id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${userBToken}` },
        body: formData,
      });
      if (repRes.status === 403) {
        logPass(
          "User B blocked from replacing User A's resume (403 Forbidden)"
        );
      } else {
        logFail(
          'Expected replace by unauthorized user to fail with 403',
          `Status: ${repRes.status}`
        );
      }

      // 4. User B tries to delete User A's resume
      const delRes = await fetch(`${BASE_URL}/resumes/${resume2Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      if (delRes.status === 403) {
        logPass("User B blocked from deleting User A's resume (403 Forbidden)");
      } else {
        logFail(
          'Expected delete by unauthorized user to fail with 403',
          `Status: ${delRes.status}`
        );
      }
    } catch (err) {
      logFail('Security ownership check threw error', (err as Error).message);
    }

    // -------------------------------------------------------------
    // Test 8: Delete Active Resume & Auto-Activation Fallback
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Resume Deletion & Auto-Activation Fallback ---');
    try {
      const activeMockFile = path.join(MOCK_STORAGE_DIR, resume2StoragePath);
      if (!fs.existsSync(activeMockFile)) {
        logFail(`Active mock storage file not found at ${activeMockFile}`);
      }

      // User A deletes their active resume (resume 2)
      const delRes = await fetch(`${BASE_URL}/resumes/${resume2Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userAToken}` },
      });

      if (delRes.status === 200) {
        logPass('Active resume deleted successfully');

        // Verify storage file deleted
        if (!fs.existsSync(activeMockFile)) {
          logPass('Storage file cleanup verified: file deleted from disk');
        } else {
          logFail('Mock storage file still exists after deletion');
        }

        // Verify resume 2 removed from database
        const dbCheck = await db.query('SELECT * FROM resumes WHERE id = $1', [
          resume2Id,
        ]);
        if (dbCheck.rows.length === 0) {
          logPass('Resume database row deletion verified');
        } else {
          logFail('Resume row still exists in database after delete');
        }

        // Rule: Verify that resume 1 was automatically activated
        const listRes = await fetch(`${BASE_URL}/resumes`, {
          headers: { Authorization: `Bearer ${userAToken}` },
        });
        const listData: any = await listRes.json();

        const r1 = listData.data.resumes.find((r: any) => r.id === resume1Id);
        if (r1 && r1.isActive === true) {
          logPass(
            'Auto-activation fallback verified: remaining resume (resume 1) is now active'
          );
        } else {
          logFail(
            'Auto-activation fallback failed: remaining resume not set to active'
          );
        }
      } else {
        logFail('Failed to delete active resume', `Status: ${delRes.status}`);
      }
    } catch (err) {
      logFail(
        'Delete and auto-activation fallback test threw error',
        (err as Error).message
      );
    }

    // Teardown DB rows for test users
    console.log('\nCleaning up integration test user resumes and records...');
    await db.query(
      'DELETE FROM resumes WHERE user_id = (SELECT id FROM users WHERE email = $1)',
      [userBEmail]
    );
    await db.query('DELETE FROM users WHERE email = $1', [userBEmail]);
    await db.query('DELETE FROM resumes WHERE id = $1', [resume1Id]);
    logPass('Teardown database clean successfully');
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

  // Check if mock storage folder has files left
  if (fs.existsSync(MOCK_STORAGE_DIR)) {
    const files = fs.readdirSync(MOCK_STORAGE_DIR);
    if (files.length > 0) {
      console.log(
        `[Storage Clean Check] Remaining files in mock storage folder:`,
        files
      );
    } else {
      console.log(`[Storage Clean Check] Mock storage folder is empty.`);
    }
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
