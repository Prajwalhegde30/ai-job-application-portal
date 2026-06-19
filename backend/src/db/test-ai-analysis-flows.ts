/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
import { Server } from 'http';
import app from '../app';
import { db, connectDatabase, disconnectDatabase } from '../config/database';

const TEST_PORT = 8091;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

let server: Server;
let passedTests = 0;
let failedTests = 0;

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms * 3));

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
  console.log('  AI Job Portal — AI Resume Analysis Engine Integration Tests');
  console.log('='.repeat(80));

  const userAEmail = `aitest_usera_${Date.now()}@test.com`;
  const userBEmail = `aitest_userb_${Date.now()}@test.com`;
  const password = 'TestPass123!';

  let userAToken: string;
  let userBToken: string;
  let resumeId: string;

  try {
    // 1. Setup DB and Server
    await connectDatabase(3, 1000);
    server = app.listen(TEST_PORT);
    console.log(`Test server started on port ${TEST_PORT}\n`);

    // =============================================
    // SETUP: Register test users
    // =============================================
    console.log('--- Setup: Creating test users ---');
    userAToken = await registerUser('AI User A', userAEmail, password, 'USER');
    userBToken = await registerUser('AI User B', userBEmail, password, 'USER');
    logPass('Registered 2 test users (USER role)');

    // =============================================
    // TEST 1: Resume Upload & Auto Background Analysis
    // =============================================
    console.log('\n--- Test 1: Resume Upload & Auto Background Analysis ---');

    const resumeTextContent = `%PDF-1.4
CONTACT INFORMATION
Email: usera@test.com
Phone: 555-123-4567
LinkedIn: linkedin.com/in/usera-dev
GitHub: github.com/usera-dev

EDUCATION
Master of Science in Computer Science
Stanford University, 2022
GPA: 3.9 / 4.0

EXPERIENCE
Software Engineer at Google Inc.
June 2022 - Present
- Increased API performance by 45% using Node.js and Redis.
- Optimized database queries to reduce page loads.

PROJECTS
E-Commerce Application
Built a full stack shopping app with React, Next.js, and PostgreSQL.
GitHub: github.com/usera-dev/ecommerce
Description: A high performance shopping platform with stripe integration.

CERTIFICATIONS
AWS Certified Solutions Architect
Amazon Web Services, 2023
`;

    const resumeForm = new FormData();
    const mockPdf = new Blob([Buffer.from(resumeTextContent)], {
      type: 'application/pdf',
    });
    resumeForm.append('file', mockPdf, 'usera_resume.pdf');
    resumeForm.append('resumeTitle', 'AI Integration Test Resume');

    const uploadRes = await fetch(`${BASE_URL}/resumes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
      body: resumeForm,
    });
    const uploadData: any = await uploadRes.json();

    if (uploadRes.status === 201 && uploadData.success) {
      resumeId = uploadData.data.resume.id;
      logPass('Resume uploaded successfully', `ID: ${resumeId}`);

      // Wait for EventBus background handler to parse & score
      console.log('Waiting for background resume analysis trigger...');
      await sleep(350);

      // Verify that analysis record was auto-created in database
      const dbCheck = await db.query(
        "SELECT * FROM ai_analysis WHERE resume_id = $1 AND analysis_type = 'RESUME_EXTRACT'",
        [resumeId]
      );
      if (dbCheck.rows.length > 0) {
        logPass('Background analysis auto-created successfully');
      } else {
        logFail('Background analysis record missing in database');
      }
    } else {
      logFail('Resume upload failed', `Status: ${uploadRes.status}`);
      throw new Error('Abort: Upload failed');
    }

    // =============================================
    // TEST 2: Retrieve Analysis Report
    // =============================================
    console.log('\n--- Test 2: Retrieve Analysis Report (GET) ---');
    let analysisUpdatedAt = '';

    try {
      const getRes = await fetch(`${BASE_URL}/ai-analysis/${resumeId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const getData: any = await getRes.json();

      if (getRes.status === 200 && getData.success) {
        logPass('Retrieve analysis report returned 200');

        const rep = getData.data;
        analysisUpdatedAt = rep.updatedAt;

        // Check overall score & categories breakdown
        if (typeof rep.score === 'number' && rep.score > 50) {
          logPass('Overall Score returned', `${rep.score}`);
        } else {
          logFail('Overall score missing or invalid', `${rep.score}`);
        }

        const cat = rep.categoryScores;
        if (
          cat.education > 0 &&
          cat.experience > 0 &&
          cat.projects > 0 &&
          cat.skills > 0 &&
          cat.certifications > 0 &&
          cat.contact > 0
        ) {
          logPass('Category scores present and non-zero', JSON.stringify(cat));
        } else {
          logFail('Category scores incomplete or zero', JSON.stringify(cat));
        }

        // Check strengths & weaknesses
        if (
          Array.isArray(rep.strengths) &&
          Array.isArray(rep.weaknesses) &&
          Array.isArray(rep.suggestions)
        ) {
          logPass(
            'Rule feedback lists (strengths, weaknesses, suggestions) populated',
            `strengths=${rep.strengths.length}, weaknesses=${rep.weaknesses.length}, suggestions=${rep.suggestions.length}`
          );
        } else {
          logFail('Feedback lists empty or invalid');
        }

        // Verify entity extraction outputs
        const hasSkill = rep.extractedSkills.some(
          (s: any) => s.name === 'react'
        );
        if (hasSkill) {
          logPass('Skill extraction correctly identified react');
        } else {
          logFail('Skill extraction failed to detect react');
        }

        const hasEdu = rep.extractedEducation.some((e: any) =>
          e.university.includes('Stanford')
        );
        if (hasEdu) {
          logPass('Education extraction matched Stanford University');
        } else {
          logFail('Education extraction failed');
        }

        const hasExp = rep.extractedExperience.some(
          (e: any) => e.company && e.company.includes('Google')
        );
        if (hasExp) {
          logPass('Experience extraction matched Google Inc.');

          const hasQuant = rep.extractedExperience.some(
            (e: any) =>
              e.achievements &&
              e.achievements.some((ach: string) => ach.includes('45%'))
          );
          if (hasQuant) {
            logPass(
              'Experience timeline highlighted quantified achievement (45%)'
            );
          } else {
            logFail('Experience timeline missing metrics');
          }
        } else {
          logFail('Experience extraction failed');
        }

        const hasProj = rep.extractedProjects.some((p: any) =>
          p.projectName.includes('E-Commerce')
        );
        if (hasProj) {
          logPass('Projects extraction matched E-Commerce App');
        } else {
          logFail('Projects extraction failed');
        }

        const hasCert = rep.extractedCertifications.some(
          (c: any) => c.provider === 'AWS'
        );
        if (hasCert) {
          logPass('Certifications extraction matched AWS Architect');
        } else {
          logFail('Certifications extraction failed');
        }

        if (
          rep.contactInfo.email === 'usera@test.com' &&
          rep.contactInfo.linkedin
        ) {
          logPass('Contact completeness details correctly parsed');
        } else {
          logFail('Contact details extraction failed');
        }
      } else {
        logFail(
          'Retrieve analysis report endpoint failed',
          `Status: ${getRes.status}`
        );
      }
    } catch (err) {
      logFail('Test 2 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 3: Caching & Re-analysis Prevention
    // =============================================
    console.log('\n--- Test 3: Caching & Re-analysis Prevention ---');
    try {
      const start = Date.now();
      const getRes = await fetch(`${BASE_URL}/ai-analysis/${resumeId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const duration = Date.now() - start;
      const getData: any = await getRes.json();

      if (getRes.status === 200 && duration < 150) {
        logPass('Cache retrieval returned quickly', `${duration}ms`);
      } else {
        logFail('Cache retrieval slow', `${duration}ms`);
      }

      if (getData.data.updatedAt === analysisUpdatedAt) {
        logPass('Timestamps match; re-analysis was successfully skipped');
      } else {
        logFail('Timestamp mismatch; resume was incorrectly re-analyzed');
      }
    } catch (err) {
      logFail('Test 3 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 4: Forced Re-analysis Trigger (POST)
    // =============================================
    console.log('\n--- Test 4: Forced Re-analysis Trigger (POST) ---');
    try {
      const postRes = await fetch(
        `${BASE_URL}/ai-analysis/${resumeId}/analyze`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${userAToken}` },
        }
      );
      const postData: any = await postRes.json();

      if (postRes.status === 200 && postData.success) {
        logPass('Forced re-analysis endpoint returned 200');

        if (new Date(postData.data.updatedAt) > new Date(analysisUpdatedAt)) {
          logPass(
            'Timestamp updated; forced re-analysis executed successfully'
          );
          analysisUpdatedAt = postData.data.updatedAt;
        } else {
          logFail('Forced re-analysis did not update database timestamp');
        }
      } else {
        logFail('Forced re-analysis failed', `Status: ${postRes.status}`);
      }
    } catch (err) {
      logFail('Test 4 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 5: Resume Replacement Re-analysis trigger
    // =============================================
    console.log('\n--- Test 5: Resume Replacement Re-analysis Trigger ---');
    try {
      const replacementText = `%PDF-1.4
CONTACT
Email: replaced_user@test.com

EDUCATION
Bachelor of Science
MIT, 2018
`;
      const replaceForm = new FormData();
      const replacePdf = new Blob([Buffer.from(replacementText)], {
        type: 'application/pdf',
      });
      replaceForm.append('file', replacePdf, 'usera_replaced.pdf');
      replaceForm.append('resumeTitle', 'Replaced Resume');

      const replaceRes = await fetch(`${BASE_URL}/resumes/${resumeId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: replaceForm,
      });

      if (replaceRes.status === 200) {
        logPass('Resume replaced successfully');

        // Sleep to let background event-driven analysis run
        console.log('Waiting for background re-analysis after replacement...');
        await sleep(350);

        // Fetch analysis report and inspect changes
        const getRes = await fetch(`${BASE_URL}/ai-analysis/${resumeId}`, {
          headers: { Authorization: `Bearer ${userAToken}` },
        });
        const getData: any = await getRes.json();
        const rep = getData.data;

        if (rep.contactInfo.email === 'replaced_user@test.com') {
          logPass('Background analysis updated with replaced resume content');
        } else {
          logFail('Re-analysis content mismatch', rep.contactInfo.email);
        }

        if (rep.score < 50) {
          logPass(
            'Score dropped appropriately due to missing sections',
            `Score: ${rep.score}`
          );
        } else {
          logFail('Score did not drop as expected', `Score: ${rep.score}`);
        }
      } else {
        logFail(
          'Failed to replace resume file',
          `Status: ${replaceRes.status}`
        );
      }
    } catch (err) {
      logFail('Test 5 failed with error', (err as Error).message);
    }

    // =============================================
    // TEST 6: Security & Ownership Enforcement
    // =============================================
    console.log('\n--- Test 6: Security & Ownership Enforcement ---');
    try {
      // User B attempts to access User A's analysis report
      const getRes = await fetch(`${BASE_URL}/ai-analysis/${resumeId}`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      if (getRes.status === 403) {
        logPass("User B blocked (403) from fetching User A's analysis");
      } else {
        logFail(
          "User B not blocked from fetching A's analysis",
          `Status: ${getRes.status}`
        );
      }

      // User B attempts to trigger re-analysis of User A's resume
      const postRes = await fetch(
        `${BASE_URL}/ai-analysis/${resumeId}/analyze`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${userBToken}` },
        }
      );
      if (postRes.status === 403) {
        logPass(
          "User B blocked (403) from triggering re-analysis on A's resume"
        );
      } else {
        logFail(
          'User B not blocked from triggering re-analysis',
          `Status: ${postRes.status}`
        );
      }
    } catch (err) {
      logFail('Test 6 failed with error', (err as Error).message);
    }

    // Cleanup
    console.log('\nCleaning up AI Analysis test records...');
    await db.query(
      'DELETE FROM ai_analysis WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2))',
      [userAEmail, userBEmail]
    );
    await db.query(
      'DELETE FROM resumes WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2))',
      [userAEmail, userBEmail]
    );
    await db.query(
      'DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2))',
      [userAEmail, userBEmail]
    );
    await db.query(
      'DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2))',
      [userAEmail, userBEmail]
    );
    await db.query('DELETE FROM users WHERE email IN ($1, $2)', [
      userAEmail,
      userBEmail,
    ]);
    logPass('AI Analysis integration test clean up completed');
  } catch (err) {
    console.error('AI Analysis setup failed:', err);
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
    `  AI Analysis Tests completed: ${passedTests} passed, ${failedTests} failed`
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
