/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
import { Server } from 'http';
import app from '../app';
import { db, connectDatabase, disconnectDatabase } from '../config/database';

const TEST_PORT = 8093;
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
  console.log(
    '  AI Job Portal — AI Career Advisor Integration Tests (Phase 14)'
  );
  console.log('='.repeat(80));

  const recruiterEmail = `advisor_recruiter_${Date.now()}@test.com`;
  const recruiterBEmail = `advisor_recruiterb_${Date.now()}@test.com`;
  const candidateAEmail = `advisor_cand_a_${Date.now()}@test.com`;
  const candidateBEmail = `advisor_cand_b_${Date.now()}@test.com`;
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
      'Advisor Recruiter A',
      recruiterEmail,
      password,
      'ADMIN'
    );
    recruiterBToken = await registerUser(
      'Advisor Recruiter B',
      recruiterBEmail,
      password,
      'ADMIN'
    );
    candidateAToken = await registerUser(
      'Advisor Candidate A',
      candidateAEmail,
      password,
      'USER'
    );
    candidateBToken = await registerUser(
      'Advisor Candidate B',
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
        title: 'Full Stack Developer',
        company: 'TechCorp Inc',
        description:
          'Looking for a Full Stack Developer with React, Node.js, and PostgreSQL. Docker and Kubernetes experience preferred. Must have 3+ years experience.',
        requirements:
          'Required: React, Node.js, TypeScript, PostgreSQL, Docker. Bachelor degree in Computer Science or related field.',
        responsibilities:
          'Build and maintain full-stack web applications. Deploy using Docker containers. Manage PostgreSQL databases.',
        location: 'Remote, US',
        jobType: 'FULL_TIME',
        salaryMin: 100000,
        salaryMax: 160000,
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
    // SETUP: Candidate uploads resume
    // =============================================
    console.log('\n--- Setup: Candidate uploads resume ---');
    const resumeTextContent = `%PDF-1.4
    Jane Smith
    Email: janesmith@email.com
    Phone: 555-123-4567
    GitHub: github.com/janesmith
    LinkedIn: linkedin.com/in/janesmith

    SKILLS
    React, Node.js, TypeScript, JavaScript, Python, PostgreSQL, Git, HTML, CSS

    EDUCATION
    MIT - Massachusetts Institute of Technology
    Degree: Bachelor in Computer Science
    Graduation Year: 2021
    GPA: 3.8/4.0

    EXPERIENCE
    Amazon Inc. - Software Developer
    Duration: June 2021 - Present (3 years)
    - Built microservices serving 10M+ daily requests
    - Reduced API response times by 35% through query optimization
    - Led migration of legacy monolith to React frontend

    CERTIFICATIONS
    AWS Certified Developer Associate, 2023

    PROJECTS
    Task Management App
    Technologies: React, Node.js, PostgreSQL
    Link: github.com/janesmith/taskmanager
    Built a full-stack task management application with real-time updates.

    Portfolio Website
    Technologies: Next.js, TypeScript
    Link: github.com/janesmith/portfolio
    `;

    const resumeForm = new FormData();
    const mockPdf = new Blob([Buffer.from(resumeTextContent)], {
      type: 'application/pdf',
    });
    resumeForm.append('file', mockPdf, 'jane_smith_resume.pdf');
    resumeForm.append('resumeTitle', 'Jane Smith Resume');

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
        `Resume upload failed: ${resumeRes.status} ${JSON.stringify(resumeData)}`
      );
    }
    resumeId = resumeData.data.resume.id;
    logPass('Resume uploaded successfully', `ID: ${resumeId}`);

    // Wait for background AI analysis
    console.log('Waiting for background resume analysis to complete...');
    await sleep(3000);

    // Verify analysis exists
    const analysisCheck = await db.query(
      'SELECT id FROM ai_analysis WHERE resume_id = $1',
      [resumeId]
    );
    if (analysisCheck.rows.length > 0) {
      logPass('Background resume analysis completed');
    } else {
      logFail('Background resume analysis completed', 'No analysis found');
    }

    // =============================================
    // TEST 1: Submit Application → Auto Career Advice
    // =============================================
    console.log('\n--- Test 1: Submit Application & Auto Career Advice ---');
    const appRes = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateAToken}`,
      },
      body: JSON.stringify({
        jobId: jobId,
        resumeId: resumeId,
        coverLetter:
          'I am excited about this Full Stack Developer opportunity.',
      }),
    });
    const appData: any = await appRes.json();
    if (appRes.status !== 201) {
      throw new Error(
        `Application submission failed: ${appRes.status} ${JSON.stringify(appData)}`
      );
    }
    applicationId = appData.data.application.id;
    logPass('Application submitted successfully', `ID: ${applicationId}`);

    // Wait for background match analysis + career advice generation
    console.log(
      'Waiting for background match analysis + career advice generation...'
    );
    await sleep(5000);

    // Verify career advice was auto-generated
    const adviceCheck = await db.query(
      'SELECT id FROM career_advice WHERE application_id = $1',
      [applicationId]
    );
    if (adviceCheck.rows.length > 0) {
      logPass('Background career advice auto-generated successfully');
    } else {
      logFail(
        'Background career advice auto-generated',
        'No advice found in DB'
      );
    }

    // =============================================
    // TEST 2: Retrieve Career Advice (GET)
    // =============================================
    console.log('\n--- Test 2: Retrieve Career Advice (GET) ---');
    const adviceRes = await fetch(
      `${BASE_URL}/career-advice/${applicationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${candidateAToken}`,
        },
      }
    );
    const adviceData: any = await adviceRes.json();
    const advice = adviceData.data;

    if (adviceRes.status === 200) {
      logPass('Retrieve career advice returned 200');
    } else {
      logFail(
        'Retrieve career advice returned 200',
        `Status: ${adviceRes.status}`
      );
    }

    // Verify summary is populated
    if (advice.overallSummary && advice.overallSummary.length > 10) {
      logPass(
        'Overall summary is populated',
        `${advice.overallSummary.substring(0, 80)}...`
      );
    } else {
      logFail('Overall summary is populated', `Got: ${advice.overallSummary}`);
    }

    // Verify confidence score
    if (
      typeof advice.confidenceScore === 'number' &&
      advice.confidenceScore > 0
    ) {
      logPass('Confidence score is present', `${advice.confidenceScore}%`);
    } else {
      logFail('Confidence score is present', `Got: ${advice.confidenceScore}`);
    }

    // Verify provider name
    if (advice.provider && advice.provider.length > 0) {
      logPass('Provider name is present', advice.provider);
    } else {
      logFail('Provider name is present', `Got: ${advice.provider}`);
    }

    // Verify career paths
    if (Array.isArray(advice.careerPaths) && advice.careerPaths.length > 0) {
      logPass(
        'Career paths generated',
        `${advice.careerPaths.length} paths (first: ${advice.careerPaths[0].title})`
      );
    } else {
      logFail('Career paths generated');
    }

    // Verify skill recommendations
    if (
      Array.isArray(advice.skillRecommendations) &&
      advice.skillRecommendations.length > 0
    ) {
      logPass(
        'Skill recommendations generated',
        `${advice.skillRecommendations.length} recommendations`
      );
    } else {
      logFail('Skill recommendations generated');
    }

    // Verify project suggestions
    if (
      Array.isArray(advice.projectSuggestions) &&
      advice.projectSuggestions.length > 0
    ) {
      logPass(
        'Project suggestions generated',
        `${advice.projectSuggestions.length} projects`
      );
    } else {
      logFail('Project suggestions generated');
    }

    // Verify interview tips
    if (
      Array.isArray(advice.interviewTips) &&
      advice.interviewTips.length > 0
    ) {
      logPass(
        'Interview tips generated',
        `${advice.interviewTips.length} tips`
      );
    } else {
      logFail('Interview tips generated');
    }

    // Verify salary insights
    if (advice.salaryInsights && advice.salaryInsights.estimatedRange) {
      logPass(
        'Salary insights generated',
        `Range: ${advice.salaryInsights.estimatedRange}`
      );
    } else {
      logFail('Salary insights generated');
    }

    // =============================================
    // TEST 3: Caching & Retrieval Speed
    // =============================================
    console.log('\n--- Test 3: Caching & Retrieval Speed ---');
    const cacheStart = Date.now();
    const cacheRes = await fetch(`${BASE_URL}/career-advice/${applicationId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${candidateAToken}`,
      },
    });
    const cacheElapsed = Date.now() - cacheStart;
    const cacheData: any = await cacheRes.json();

    if (cacheElapsed < 200) {
      logPass('Cache retrieval returned quickly', `${cacheElapsed}ms`);
    } else {
      logFail(
        'Cache retrieval returned quickly',
        `${cacheElapsed}ms (expected <200ms)`
      );
    }

    if (cacheData.data.createdAt === advice.createdAt) {
      logPass('No recomputation: Timestamps match exactly');
    } else {
      logFail('No recomputation: Timestamps match exactly');
    }

    // =============================================
    // TEST 4: Recruiter Retrieval (owns the job)
    // =============================================
    console.log('\n--- Test 4: Recruiter Retrieval Check ---');
    const recruiterAdviceRes = await fetch(
      `${BASE_URL}/career-advice/${applicationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${recruiterToken}`,
        },
      }
    );

    if (recruiterAdviceRes.status === 200) {
      logPass(
        'Recruiter who owns the job successfully retrieved career advice'
      );
    } else {
      logFail(
        'Recruiter who owns the job successfully retrieved career advice',
        `Status: ${recruiterAdviceRes.status}`
      );
    }

    // =============================================
    // TEST 5: Security & Ownership Enforcement
    // =============================================
    console.log('\n--- Test 5: Security & Ownership Enforcement ---');

    // Candidate B fetches Candidate A's advice
    const candBRes = await fetch(`${BASE_URL}/career-advice/${applicationId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${candidateBToken}`,
      },
    });
    if (candBRes.status === 403) {
      logPass(
        "Unrelated candidate blocked from accessing another's advice (403)"
      );
    } else {
      logFail(
        "Unrelated candidate blocked from accessing another's advice",
        `Status: ${candBRes.status}`
      );
    }

    // Recruiter B fetches advice for a job they didn't post
    const recruiterBAdviceRes = await fetch(
      `${BASE_URL}/career-advice/${applicationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${recruiterBToken}`,
        },
      }
    );
    if (recruiterBAdviceRes.status === 403) {
      logPass(
        "Unrelated admin blocked from accessing another recruiter's advice (403)"
      );
    } else {
      logFail(
        "Unrelated admin blocked from accessing another recruiter's advice",
        `Status: ${recruiterBAdviceRes.status}`
      );
    }

    // =============================================
    // TEARDOWN: Cleanup DB Records
    // =============================================
    console.log('\nCleaning up Career Advisor test records...');
    await db.query('DELETE FROM career_advice WHERE application_id = $1', [
      applicationId,
    ]);
    await db.query('DELETE FROM match_analysis WHERE application_id = $1', [
      applicationId,
    ]);
    await db.query(
      'DELETE FROM application_timeline WHERE application_id = $1',
      [applicationId]
    );
    await db.query(
      'DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2, $3, $4))',
      [recruiterEmail, recruiterBEmail, candidateAEmail, candidateBEmail]
    );
    await db.query('DELETE FROM applications WHERE id = $1', [applicationId]);
    await db.query('DELETE FROM ai_analysis WHERE resume_id = $1', [resumeId]);
    await db.query('DELETE FROM resumes WHERE id = $1', [resumeId]);
    await db.query('DELETE FROM jobs WHERE id = $1', [jobId]);
    await db.query(
      'DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2, $3, $4))',
      [recruiterEmail, recruiterBEmail, candidateAEmail, candidateBEmail]
    );
    await db.query('DELETE FROM users WHERE email IN ($1, $2, $3, $4)', [
      recruiterEmail,
      recruiterBEmail,
      candidateAEmail,
      candidateBEmail,
    ]);
    logPass('Career Advisor integration test clean up completed');
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
      `  Career Advisor Integration Tests completed: ${passedTests} passed, ${failedTests} failed`
    );
    console.log('='.repeat(80));
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

runTests();
