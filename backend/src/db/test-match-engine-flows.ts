/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
import { Server } from 'http';
import app from '../app';
import { db, connectDatabase, disconnectDatabase } from '../config/database';

const TEST_PORT = 8092;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

let server: Server;
let passedTests = 0;
let failedTests = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  console.log('  AI Job Portal — Resume Match Score Engine Integration Tests');
  console.log('='.repeat(80));

  const recruiterEmail = `match_recruiter_${Date.now()}@test.com`;
  const recruiterBEmail = `match_recruiterb_${Date.now()}@test.com`;
  const candidateAEmail = `match_cand_a_${Date.now()}@test.com`;
  const candidateBEmail = `match_cand_b_${Date.now()}@test.com`;
  const password = 'TestPass123!';

  let recruiterToken: string;
  let recruiterBToken: string;
  let candidateAToken: string;
  let candidateBToken: string;

  let jobId: string;
  let resumeId: string;
  let applicationId: string;

  try {
    // 1. Setup DB and Server
    await connectDatabase(3, 1000);
    server = app.listen(TEST_PORT);
    console.log(`Test server started on port ${TEST_PORT}\n`);

    // =============================================
    // SETUP: Register test users
    // =============================================
    console.log('--- Setup: Creating test users ---');
    recruiterToken = await registerUser(
      'Admin Recruiter A',
      recruiterEmail,
      password,
      'ADMIN'
    );
    recruiterBToken = await registerUser(
      'Admin Recruiter B',
      recruiterBEmail,
      password,
      'ADMIN'
    );
    candidateAToken = await registerUser(
      'Candidate A',
      candidateAEmail,
      password,
      'USER'
    );
    candidateBToken = await registerUser(
      'Candidate B',
      candidateBEmail,
      password,
      'USER'
    );
    logPass('Registered 2 Recruiters and 2 Candidates');

    // =============================================
    // SETUP: Recruiter creates a Job
    // =============================================
    console.log('\n--- Setup: Creating job posting ---');
    const jobRes = await fetch(`${BASE_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterToken}`,
      },
      body: JSON.stringify({
        title: 'Senior Software Engineer',
        company: 'Google LLC',
        description:
          'We are looking for a Software Developer with Python and SQL. Kubernetes and AWS preferred.',
        requirements:
          'Expected skills: Python, SQL, Docker, AWS. Degree: Bachelor in Computer Science or Master. Experience: 3+ years.',
        responsibilities:
          'Design database systems, deploy with Docker, and construct cloud configurations on AWS.',
        location: 'Bangalore, IN',
        jobType: 'FULL_TIME',
        salaryMin: 1200000,
        salaryMax: 2000000,
        status: 'PUBLISHED',
      }),
    });
    const jobData: any = await jobRes.json();
    if (jobRes.status !== 201) {
      throw new Error(
        `Job creation failed: ${jobRes.status} ${JSON.stringify(jobData)}`
      );
    }
    jobId = jobData.data.job.id;
    logPass('Job posted successfully', `ID: ${jobId}`);

    // =============================================
    // SETUP: Candidate uploads a resume and gets analysis
    // =============================================
    console.log('\n--- Setup: Candidate uploads resume ---');
    const resumeTextContent = `%PDF-1.4
    John Doe
    Email: johndoe@google.com
    Phone: 123-456-7890
    GitHub: github.com/johndoe
    LinkedIn: linkedin.com/in/johndoe

    SKILLS
    Python, SQL, PostgreSQL, React, Next.js, Node.js, Docker, Git

    EDUCATION
    Stanford University
    Degree: Bachelor in Computer Science
    Graduation Year: 2022
    GPA: 3.9/4.0

    EXPERIENCE
    Google Inc. - Software Engineer
    Duration: Jan 2021 - Present (3 years)
    Achievements: Increased API performance by 45%. Built E-Commerce App.

    CERTIFICATIONS
    AWS Certified Solutions Architect, Coursera

    PROJECTS
    E-Commerce App
    Technologies: React, Node.js, PostgreSQL, Docker
    Link: github.com/johndoe/ecommerce
    `;

    const resumeForm = new FormData();
    const mockPdf = new Blob([Buffer.from(resumeTextContent)], {
      type: 'application/pdf',
    });
    resumeForm.append('file', mockPdf, 'john_doe_resume.pdf');
    resumeForm.append('resumeTitle', 'John Doe Resume');

    const resumeRes = await fetch(`${BASE_URL}/resumes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${candidateAToken}`,
      },
      body: resumeForm,
    });
    const resumeData: any = await resumeRes.json();
    if (resumeRes.status !== 201) {
      throw new Error(
        `Resume creation failed: ${resumeRes.status} ${JSON.stringify(resumeData)}`
      );
    }
    resumeId = resumeData.data.resume.id;
    logPass('Resume uploaded successfully', `ID: ${resumeId}`);

    // Wait for background Resume Extraction to complete
    console.log('Waiting for background resume analysis to complete...');
    let resumeExtracted = false;
    for (let i = 0; i < 10; i++) {
      await sleep(500);
      const res = await db.query(
        'SELECT id FROM ai_analysis WHERE resume_id = $1',
        [resumeId]
      );
      if (res.rows.length > 0) {
        resumeExtracted = true;
        break;
      }
    }
    if (!resumeExtracted) {
      throw new Error('Background resume extraction timed out.');
    }
    logPass('Background resume analysis completed');

    // =============================================
    // TEST 1: Candidate Applies & Match Score Auto-generates
    // =============================================
    console.log('\n--- Test 1: Candidate Applies & Auto Match Score ---');
    const applyRes = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateAToken}`,
      },
      body: JSON.stringify({
        jobId,
        resumeId,
        coverLetter:
          'Dear hiring team, I am writing to apply for the backend position...',
      }),
    });
    const applyData: any = await applyRes.json();
    if (applyRes.status !== 201) {
      throw new Error(
        `Application failed: ${applyRes.status} ${JSON.stringify(applyData)}`
      );
    }
    applicationId = applyData.data.application.id;
    logPass('Application submitted successfully', `ID: ${applicationId}`);

    // Poll EventBus background trigger
    console.log('Waiting for background match analysis trigger...');
    let matchEngineTriggered = false;
    for (let i = 0; i < 10; i++) {
      await sleep(500);
      const res = await db.query(
        'SELECT id FROM match_analysis WHERE application_id = $1',
        [applicationId]
      );
      if (res.rows.length > 0) {
        matchEngineTriggered = true;
        break;
      }
    }
    if (!matchEngineTriggered) {
      throw new Error('Background match analysis trigger timed out.');
    }
    logPass('Background match analysis generated successfully');

    // =============================================
    // TEST 2: Retrieve Match Scorecard (GET)
    // =============================================
    console.log('\n--- Test 2: Retrieve Match Scorecard (GET) ---');
    const getRes = await fetch(`${BASE_URL}/match-analysis/${applicationId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${candidateAToken}`,
      },
    });
    const getData: any = await getRes.json();

    if (getRes.status === 200) {
      logPass('Retrieve match analysis returned 200');
    } else {
      logFail(
        'Retrieve match analysis returned 200',
        `Status: ${getRes.status} ${JSON.stringify(getData)}`
      );
    }

    const report = getData.data;
    if (report && report.matchScore > 50) {
      logPass('Overall Match Score returned and high', `${report.matchScore}%`);
    } else {
      logFail(
        'Overall Match Score returned and high',
        `Score: ${report?.matchScore}`
      );
    }

    if (report && report.categoryScores && report.categoryScores.skills > 0) {
      logPass(
        'Category scores present and non-zero',
        JSON.stringify(report.categoryScores)
      );
    } else {
      logFail(
        'Category scores present and non-zero',
        JSON.stringify(report?.categoryScores)
      );
    }

    if (report && report.matchedSkills.includes('python')) {
      logPass('Matched skills correctly identified python');
    } else {
      logFail(
        'Matched skills correctly identified python',
        JSON.stringify(report?.matchedSkills)
      );
    }

    if (report && report.missingSkills.includes('kubernetes')) {
      logPass('Missing skills correctly identified kubernetes');
    } else {
      logFail(
        'Missing skills correctly identified kubernetes',
        JSON.stringify(report?.missingSkills)
      );
    }

    if (report && report.strengths && report.strengths.length > 0) {
      logPass('Strengths generated', JSON.stringify(report.strengths));
    } else {
      logFail('Strengths generated', JSON.stringify(report?.strengths));
    }

    if (report && report.recommendations && report.recommendations.length > 0) {
      logPass(
        'Actionable recommendations generated',
        JSON.stringify(report.recommendations)
      );
    } else {
      logFail(
        'Actionable recommendations generated',
        JSON.stringify(report?.recommendations)
      );
    }

    // =============================================
    // TEST 3: Caching & Retrieval speed (<300ms)
    // =============================================
    console.log('\n--- Test 3: Caching & Retrieval Speed ---');
    const start = Date.now();
    const cacheRes = await fetch(
      `${BASE_URL}/match-analysis/${applicationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${candidateAToken}`,
        },
      }
    );
    const duration = Date.now() - start;
    const cacheData: any = await cacheRes.json();

    if (cacheRes.status === 200 && duration < 300) {
      logPass('Cache retrieval returned quickly', `${duration}ms`);
    } else {
      logFail(
        'Cache retrieval returned quickly',
        `Status: ${cacheRes.status}, Duration: ${duration}ms`
      );
    }

    // Verify timestamp did not modify
    if (cacheData.data.updatedAt === report.updatedAt) {
      logPass('No recomputation: Timestamps match exactly');
    } else {
      logFail(
        'No recomputation: Timestamps match exactly',
        `Old: ${report.updatedAt}, New: ${cacheData.data.updatedAt}`
      );
    }

    // =============================================
    // TEST 4: Recruiter Retrieval Check
    // =============================================
    console.log('\n--- Test 4: Recruiter Retrieval Check ---');
    const recruiterRes = await fetch(
      `${BASE_URL}/match-analysis/${applicationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${recruiterToken}`,
        },
      }
    );
    const recruiterData: any = await recruiterRes.json();

    if (
      recruiterRes.status === 200 &&
      recruiterData.data.matchScore === report.matchScore
    ) {
      logPass('Recruiter who owns the job successfully retrieved match card');
    } else {
      logFail(
        'Recruiter who owns the job successfully retrieved match card',
        `Status: ${recruiterRes.status}`
      );
    }

    // =============================================
    // TEST 5: Security & Multi-tenant Access Blocks
    // =============================================
    console.log('\n--- Test 5: Security & Ownership Enforcement ---');
    // Candidate B fetches Candidate A's report
    const candBRes = await fetch(
      `${BASE_URL}/match-analysis/${applicationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${candidateBToken}`,
        },
      }
    );
    if (candBRes.status === 403) {
      logPass(
        "Unrelated candidate Candidate B blocked from accessing Candidate A's report (403)"
      );
    } else {
      logFail(
        "Unrelated candidate Candidate B blocked from accessing Candidate A's report (403)",
        `Status: ${candBRes.status}`
      );
    }

    // Recruiter B fetches Candidate A's report (unrelated job)
    const recruiterBRes = await fetch(
      `${BASE_URL}/match-analysis/${applicationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${recruiterBToken}`,
        },
      }
    );
    if (recruiterBRes.status === 403) {
      logPass(
        "Unrelated admin Recruiter B blocked from accessing Candidate A's report (403)"
      );
    } else {
      logFail(
        "Unrelated admin Recruiter B blocked from accessing Candidate A's report (403)",
        `Status: ${recruiterBRes.status}`
      );
    }

    // =============================================
    // TEARDOWN: Cleanup DB Records
    // =============================================
    console.log('\nCleaning up Match Engine test records...');
    await db.query('DELETE FROM match_analysis WHERE application_id = $1', [
      applicationId,
    ]);
    await db.query(
      'DELETE FROM application_timeline WHERE application_id = $1',
      [applicationId]
    );
    await db.query('DELETE FROM applications WHERE id = $1', [applicationId]);
    await db.query('DELETE FROM ai_analysis WHERE resume_id = $1', [resumeId]);
    await db.query('DELETE FROM resumes WHERE id = $1', [resumeId]);
    await db.query('DELETE FROM jobs WHERE id = $1', [jobId]);
    await db.query('DELETE FROM users WHERE email IN ($1, $2, $3, $4)', [
      recruiterEmail,
      recruiterBEmail,
      candidateAEmail,
      candidateBEmail,
    ]);
    logPass('Match Engine integration test clean up completed');
  } catch (err) {
    console.error('\n❌ Test execution failed:');
    console.error((err as Error).message);
    if ((err as Error).stack) console.error((err as Error).stack);
  } finally {
    if (server) {
      server.close();
      console.log('\nTest server stopped.');
    }
    await disconnectDatabase();
    console.log('='.repeat(80));
    console.log(
      `  Match Engine Integration Tests completed: ${passedTests} passed, ${failedTests} failed`
    );
    console.log('='.repeat(80));
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

runTests();
