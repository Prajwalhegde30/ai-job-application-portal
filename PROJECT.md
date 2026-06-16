# AI-Powered Job Application Portal with Resume Analysis
## PROJECT.md — Complete Technical Blueprint

> **Audience:** AI coding agents, developers, and technical leads.  
> **Purpose:** This document is self-contained. Every design decision, schema, endpoint, and workflow is specified with enough detail to implement the full application without further clarification.

---

# 1. Product Overview

## Problem Statement

The job application process is broken from both sides. Job seekers blindly submit resumes that never get read, with no feedback on why they were rejected or how to improve. Recruiters drown in unqualified applications, manually screening hundreds of resumes for a handful of relevant candidates.

Existing ATS solutions are either enterprise-grade ($$$) or feature-poor. There is no modern, AI-augmented, accessible platform that serves both sides of the market well.

## Target Users

**Primary — Job Seekers (Individual Contributors)**
- Recent graduates and career changers
- Mid-level professionals actively job hunting
- Freelancers building a professional profile

**Secondary — Recruiters and Hiring Managers**
- Startup founders hiring their first team
- HR professionals at SMBs
- Recruitment agencies managing multiple clients

## Value Proposition

| Pain Point | Our Solution |
|---|---|
| Resumes disappear into the void | Real-time application status tracking |
| No feedback on rejections | AI-powered resume match scores with actionable suggestions |
| Recruiters overwhelmed by volume | AI pre-screening and match scoring per job |
| Generic career advice | Personalized AI career advisor based on resume + job market |
| No visibility into skill gaps | Missing skills extracted per job description |

---

# 2. User Roles & RBAC Matrix

## Roles

| Role | Description |
|---|---|
| `ADMIN` | Recruiter / Hiring Manager — creates and manages jobs, reviews applications |
| `USER` | Job Seeker — browses jobs, applies, tracks status |

## Permissions Table

| Feature / Endpoint | ADMIN | USER |
|---|---|---|
| **Auth** | | |
| Register | ✅ | ✅ |
| Login | ✅ | ✅ |
| Logout | ✅ | ✅ |
| Refresh Token | ✅ | ✅ |
| **Profile** | | |
| View own profile | ✅ | ✅ |
| Edit own profile | ✅ | ✅ |
| View any user profile | ✅ | ❌ |
| **Job Management** | | |
| Create job | ✅ | ❌ |
| Edit job | ✅ (own) | ❌ |
| Delete job | ✅ (own) | ❌ |
| View all jobs (public) | ✅ | ✅ |
| View job details | ✅ | ✅ |
| View jobs they posted | ✅ | ❌ |
| **Application Management** | | |
| Apply to a job | ❌ | ✅ |
| View own applications | ❌ | ✅ |
| View applications per job | ✅ | ❌ |
| View all applications (global) | ✅ | ❌ |
| Shortlist candidate | ✅ | ❌ |
| Reject candidate | ✅ | ❌ |
| Download applicant resume | ✅ | ❌ |
| **Resume Management** | | |
| Upload resume | ❌ | ✅ |
| View own resume | ❌ | ✅ |
| Delete own resume | ❌ | ✅ |
| **AI Features** | | |
| Analyze resume (extract) | ❌ | ✅ |
| Resume match score | ❌ | ✅ |
| AI career advisor chat | ❌ | ✅ |
| View AI analysis results | ✅ (per applicant) | ✅ (own) |
| **Dashboard** | | |
| Admin analytics dashboard | ✅ | ❌ |
| User application dashboard | ❌ | ✅ |
| **Notifications** | | |
| Receive notifications | ✅ | ✅ |
| Mark notification as read | ✅ | ✅ |

---

# 3. Functional Requirements

## 3.1 Authentication

- FR-AUTH-01: Users can register with name, email, password, and role selection (USER or ADMIN)
- FR-AUTH-02: Passwords are hashed using bcrypt (min 12 rounds)
- FR-AUTH-03: Login returns a short-lived JWT access token (15 min) and a long-lived refresh token (7 days)
- FR-AUTH-04: Refresh tokens are rotated on every use (token rotation pattern)
- FR-AUTH-05: Refresh tokens are stored in the database and invalidated on logout
- FR-AUTH-06: All protected routes validate JWT access token in `Authorization: Bearer <token>` header
- FR-AUTH-07: Role is encoded in JWT payload as `role: "ADMIN" | "USER"`
- FR-AUTH-08: Middleware validates role on every protected route
- FR-AUTH-09: Rate limiting on `/api/auth/*` routes (max 10 requests/minute per IP)

## 3.2 Profile Management

- FR-PROF-01: Users have a profile record linked to their user account
- FR-PROF-02: Profile fields: headline, bio, location, phone, website, LinkedIn URL, GitHub URL, skills (array), experience (JSON), education (JSON)
- FR-PROF-03: Profile is auto-created on user registration with empty fields
- FR-PROF-04: Users can update their profile at any time
- FR-PROF-05: Profile can be pre-populated from AI resume analysis
- FR-PROF-06: Skills are stored as a string array; UI renders them as tags

## 3.3 Job Management

- FR-JOB-01: Admins can create jobs with: title, company, description, requirements, location, salary range, job type (full-time/part-time/contract/remote), status (draft/published/closed)
- FR-JOB-02: Only the admin who created a job can edit or delete it
- FR-JOB-03: Published jobs are visible to all authenticated users
- FR-JOB-04: Jobs have a `closedAt` date after which applications are blocked
- FR-JOB-05: Job listings support search by title, keyword; filter by location, job type, salary range
- FR-JOB-06: Job listings are paginated (20 per page)
- FR-JOB-07: Admins can close/reopen jobs
- FR-JOB-08: Each job shows application count to admins only

## 3.4 Application Management

- FR-APP-01: Users can apply to a published, open job once (unique constraint)
- FR-APP-02: Application requires: cover letter (optional), resume ID (must own), consent checkbox
- FR-APP-03: Application statuses: `PENDING → REVIEWING → SHORTLISTED → REJECTED | HIRED`
- FR-APP-04: Admins can move applications through statuses
- FR-APP-05: Status changes trigger a notification to the applicant
- FR-APP-06: Users can view all their applications with status history
- FR-APP-07: Admins can view all applications for a job with sortable columns (date, match score, status)
- FR-APP-08: Admins can download applicant resume (signed URL or proxy download)
- FR-APP-09: Users cannot delete an application once submitted

## 3.5 Resume Management

- FR-RES-01: Users can upload one or more resumes (PDF only, max 5MB)
- FR-RES-02: Files are stored in a cloud bucket (Supabase Storage or Cloudinary)
- FR-RES-03: Each resume has a name, upload date, and file URL
- FR-RES-04: Users can set one resume as default
- FR-RES-05: Users can delete a resume (unless it is attached to an active application)
- FR-RES-06: File URL is a signed/private URL; access controlled server-side

## 3.6 AI Features

### Resume Analyzer
- FR-AI-01: User uploads resume → backend extracts text → sends to OpenAI → returns structured JSON
- FR-AI-02: Extracted data: `skills[]`, `education[]`, `experience[]`, `summary` (3–4 sentences)
- FR-AI-03: User can confirm and sync extracted data to their profile
- FR-AI-04: Analysis is stored in `ai_analysis` table linked to `resume_id`

### Resume Match Score
- FR-AI-05: User selects a resume and a job → backend sends both texts to OpenAI → returns structured response
- FR-AI-06: Response includes: `matchScore` (0–100), `matchedSkills[]`, `missingSkills[]`, `suggestions[]`
- FR-AI-07: Match score is displayed on the application card (visible to both user and admin)
- FR-AI-08: Analysis result is cached (do not re-call API if same resume+job combination exists)

### AI Career Advisor
- FR-AI-09: Chatbot interface backed by OpenAI with a system prompt focused on career advice
- FR-AI-10: System prompt includes user's skills, experience, and target role (from profile)
- FR-AI-11: Bot suggests: skills to learn, projects to build, career paths
- FR-AI-12: Conversation history is maintained in component state (not persisted to DB)
- FR-AI-13: Max 20 messages per session to control API costs

## 3.7 Dashboard Features

### Admin Dashboard
- FR-DASH-01: Total jobs posted, total applications received, shortlist rate, hire rate
- FR-DASH-02: Applications per job (bar chart)
- FR-DASH-03: Application status distribution (pie chart)
- FR-DASH-04: Recent applications list (last 10)
- FR-DASH-05: Top applicant skills across all applications (tag cloud)

### User Dashboard
- FR-DASH-06: Applications submitted count, pending/shortlisted/rejected breakdown
- FR-DASH-07: Application timeline cards sorted by last status change
- FR-DASH-08: Profile completeness indicator (%)
- FR-DASH-09: Recommended jobs (simple keyword match against profile skills)

---

# 4. Non-Functional Requirements

## 4.1 Security
- All passwords hashed with bcrypt (12+ salt rounds)
- JWT signed with RS256 (asymmetric keys in production) or HS256 with a 256-bit secret
- HTTP-only cookies for refresh tokens; access tokens in memory/Authorization header
- Input validation with Zod on all API routes (backend) and React Hook Form + Zod on frontend
- File upload validation: MIME type check + file size check + virus scan (optional)
- SQL injection protection via parameterized queries (Drizzle ORM)
- CORS restricted to known frontend origin
- Rate limiting on auth endpoints (express-rate-limit)
- Helmet.js for security headers
- Environment variables for all secrets (never hardcoded)

## 4.2 Scalability
- Stateless backend (JWT-based; no server-side session store)
- Database connection pooling (pg pool max: 10)
- File storage offloaded to cloud provider (not local disk)
- AI calls are async and non-blocking
- Pagination on all list endpoints

## 4.3 Performance
- API response time target: < 300ms for non-AI endpoints
- AI endpoints target: < 10 seconds (show loading state)
- Frontend Lighthouse score target: 90+ on desktop
- Images and static assets served via CDN
- Next.js ISR or SSR as appropriate per page

## 4.4 Accessibility
- WCAG 2.1 AA compliance
- All interactive elements keyboard navigable
- ARIA labels on icon-only buttons
- Color contrast ratio ≥ 4.5:1
- Focus-visible outlines on all focusable elements
- Skip-to-content link on all pages

## 4.5 Maintainability
- TypeScript strict mode on both frontend and backend
- ESLint + Prettier enforced via pre-commit hook (husky + lint-staged)
- All functions documented with JSDoc
- Environment variables documented in `.env.example`
- Error messages are structured and machine-readable
- Logging with Winston (backend), structured JSON in production

---

# 5. Complete Database Design

## 5.1 ER Diagram (Mermaid)

```mermaid
erDiagram
    users {
        uuid id PK
        string email UK
        string password_hash
        string name
        enum role
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    profiles {
        uuid id PK
        uuid user_id FK
        string headline
        text bio
        string location
        string phone
        string website
        string linkedin_url
        string github_url
        jsonb skills
        jsonb experience
        jsonb education
        int profile_completion
        timestamp created_at
        timestamp updated_at
    }

    jobs {
        uuid id PK
        uuid posted_by FK
        string title
        string company
        text description
        text requirements
        string location
        int salary_min
        int salary_max
        enum job_type
        enum status
        timestamp closed_at
        timestamp created_at
        timestamp updated_at
    }

    applications {
        uuid id PK
        uuid job_id FK
        uuid user_id FK
        uuid resume_id FK
        text cover_letter
        enum status
        int ai_match_score
        timestamp created_at
        timestamp updated_at
    }

    resumes {
        uuid id PK
        uuid user_id FK
        string name
        string file_url
        string file_key
        boolean is_default
        timestamp created_at
    }

    ai_analysis {
        uuid id PK
        uuid resume_id FK
        uuid job_id FK "nullable"
        enum analysis_type
        jsonb result
        timestamp created_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        string title
        text message
        boolean is_read
        string link
        timestamp created_at
    }

    refresh_tokens {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        timestamp expires_at
        boolean is_revoked
        timestamp created_at
    }

    users ||--o| profiles : "has one"
    users ||--o{ jobs : "posts"
    users ||--o{ applications : "submits"
    users ||--o{ resumes : "owns"
    users ||--o{ notifications : "receives"
    users ||--o{ refresh_tokens : "has"
    jobs ||--o{ applications : "receives"
    resumes ||--o{ applications : "used in"
    resumes ||--o{ ai_analysis : "analyzed by"
    jobs ||--o{ ai_analysis : "matched in"
```

## 5.2 Table Schemas (SQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM types
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');
CREATE TYPE job_type AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'REMOTE', 'INTERNSHIP');
CREATE TYPE job_status AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
CREATE TYPE application_status AS ENUM ('PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED');
CREATE TYPE analysis_type AS ENUM ('RESUME_EXTRACT', 'MATCH_SCORE');

-- USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PROFILES
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    headline VARCHAR(255),
    bio TEXT,
    location VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    linkedin_url VARCHAR(255),
    github_url VARCHAR(255),
    skills JSONB NOT NULL DEFAULT '[]',
    experience JSONB NOT NULL DEFAULT '[]',
    education JSONB NOT NULL DEFAULT '[]',
    profile_completion INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- JOBS
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    posted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    salary_min INT,
    salary_max INT,
    job_type job_type NOT NULL DEFAULT 'FULL_TIME',
    status job_status NOT NULL DEFAULT 'DRAFT',
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RESUMES
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_key VARCHAR(500) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- APPLICATIONS
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES resumes(id),
    cover_letter TEXT,
    status application_status NOT NULL DEFAULT 'PENDING',
    ai_match_score INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_application UNIQUE (job_id, user_id)
);

-- AI ANALYSIS
CREATE TABLE ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    analysis_type analysis_type NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- REFRESH TOKENS
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_posted_by ON jobs(posted_by);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_ai_analysis_resume_id ON ai_analysis(resume_id);
CREATE INDEX idx_ai_analysis_type ON ai_analysis(analysis_type);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 5.3 JSONB Schema Definitions

**`profiles.skills`** — `string[]`
```json
["React", "TypeScript", "Node.js"]
```

**`profiles.experience`** — `ExperienceEntry[]`
```json
[
  {
    "company": "Acme Corp",
    "title": "Frontend Developer",
    "startDate": "2022-01",
    "endDate": "2023-06",
    "current": false,
    "description": "Built dashboards using React and D3."
  }
]
```

**`profiles.education`** — `EducationEntry[]`
```json
[
  {
    "institution": "MIT",
    "degree": "B.Tech",
    "field": "Computer Science",
    "startYear": 2018,
    "endYear": 2022
  }
]
```

**`ai_analysis.result` for `RESUME_EXTRACT`**
```json
{
  "skills": ["Python", "Machine Learning"],
  "education": [{ "institution": "...", "degree": "..." }],
  "experience": [{ "company": "...", "title": "...", "duration": "2 years" }],
  "summary": "Experienced backend engineer with 3 years..."
}
```

**`ai_analysis.result` for `MATCH_SCORE`**
```json
{
  "matchScore": 78,
  "matchedSkills": ["Python", "REST APIs"],
  "missingSkills": ["Kubernetes", "Go"],
  "suggestions": ["Learn Docker basics", "Build a CI/CD project"]
}
```

---

# 6. API Design

**Base URL:** `https://api.yourdomain.com/api/v1`  
**Auth Header:** `Authorization: Bearer <access_token>`  
**Content-Type:** `application/json`

**Standard Response Envelope:**
```json
{
  "success": true,
  "data": {},
  "message": "Optional success message",
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

**Standard Error Envelope:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": []
  }
}
```

---

## 6.1 Auth Endpoints

### POST /api/v1/auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "StrongPass123!",
  "role": "USER"
}
```
**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com", "role": "USER" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```
**Authorization:** Public

---

### POST /api/v1/auth/login
Authenticate and receive tokens.

**Request Body:**
```json
{ "email": "jane@example.com", "password": "StrongPass123!" }
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "name": "Jane Doe", "role": "USER" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```
**Authorization:** Public

---

### POST /api/v1/auth/refresh
Exchange refresh token for a new access token.

**Request Body:**
```json
{ "refreshToken": "eyJ..." }
```
**Response 200:**
```json
{
  "success": true,
  "data": { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
}
```
**Authorization:** Public

---

### POST /api/v1/auth/logout
Revoke refresh token.

**Request Body:**
```json
{ "refreshToken": "eyJ..." }
```
**Response 200:** `{ "success": true, "message": "Logged out" }`  
**Authorization:** Any authenticated user

---

### GET /api/v1/auth/me
Get current authenticated user.

**Response 200:**
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Jane", "email": "jane@example.com", "role": "USER" }
}
```
**Authorization:** Any authenticated user

---

## 6.2 Profile Endpoints

### GET /api/v1/profile
Get own profile.

**Response 200:** Full profile object.  
**Authorization:** Any authenticated user

---

### PUT /api/v1/profile
Update own profile.

**Request Body:**
```json
{
  "headline": "Full Stack Developer",
  "bio": "Passionate about clean code.",
  "location": "Bengaluru, India",
  "phone": "+91-9876543210",
  "website": "https://janedoe.dev",
  "linkedinUrl": "https://linkedin.com/in/janedoe",
  "githubUrl": "https://github.com/janedoe",
  "skills": ["React", "Node.js", "PostgreSQL"],
  "experience": [],
  "education": []
}
```
**Response 200:** Updated profile object.  
**Authorization:** Any authenticated user

---

### GET /api/v1/profile/:userId
Get any user's profile (admin only).

**Response 200:** Full profile object.  
**Authorization:** ADMIN only

---

## 6.3 Job Endpoints

### POST /api/v1/jobs
Create a new job.

**Request Body:**
```json
{
  "title": "Senior React Developer",
  "company": "TechCorp",
  "description": "Full job description...",
  "requirements": "5+ years React...",
  "location": "Remote",
  "salaryMin": 80000,
  "salaryMax": 120000,
  "jobType": "REMOTE",
  "status": "PUBLISHED",
  "closedAt": "2025-12-31T00:00:00Z"
}
```
**Response 201:** Created job object.  
**Authorization:** ADMIN only

---

### GET /api/v1/jobs
List published jobs with filters and pagination.

**Query Params:** `?search=react&location=remote&jobType=REMOTE&salaryMin=50000&page=1&limit=20`

**Response 200:**
```json
{
  "success": true,
  "data": [ { "id": "uuid", "title": "...", "company": "...", "applicationCount": 12 } ],
  "meta": { "page": 1, "limit": 20, "total": 87 }
}
```
**Authorization:** Any authenticated user

---

### GET /api/v1/jobs/:id
Get full job details.

**Response 200:** Full job object including `postedBy` user (name only).  
**Authorization:** Any authenticated user

---

### PUT /api/v1/jobs/:id
Update a job.

**Request Body:** Same as POST, all fields optional.  
**Response 200:** Updated job object.  
**Authorization:** ADMIN who created the job

---

### DELETE /api/v1/jobs/:id
Delete a job (soft delete recommended — set status to CLOSED and `deleted_at`).

**Response 200:** `{ "success": true, "message": "Job deleted" }`  
**Authorization:** ADMIN who created the job

---

### GET /api/v1/jobs/mine
List jobs created by authenticated admin.

**Response 200:** Array of job objects with application counts.  
**Authorization:** ADMIN only

---

## 6.4 Application Endpoints

### POST /api/v1/applications
Apply to a job.

**Request Body:**
```json
{
  "jobId": "uuid",
  "resumeId": "uuid",
  "coverLetter": "I am excited to apply..."
}
```
**Response 201:** Created application object.  
**Authorization:** USER only

---

### GET /api/v1/applications/mine
Get authenticated user's applications.

**Response 200:** Array of applications with job details and status.  
**Authorization:** USER only

---

### GET /api/v1/applications/job/:jobId
Get all applications for a specific job.

**Query Params:** `?status=PENDING&sortBy=createdAt&order=desc&page=1`

**Response 200:** Array of applications with applicant profile and match score.  
**Authorization:** ADMIN who owns the job

---

### PATCH /api/v1/applications/:id/status
Update application status.

**Request Body:**
```json
{ "status": "SHORTLISTED" }
```
**Response 200:** Updated application object. Also creates a notification for the applicant.  
**Authorization:** ADMIN who owns the job

---

### GET /api/v1/applications/:id/resume
Download/proxy applicant resume.

**Response:** Redirect to signed file URL (or stream file).  
**Authorization:** ADMIN who owns the job

---

## 6.5 Resume Endpoints

### POST /api/v1/resumes
Upload a resume. Multipart form data.

**Request:** `multipart/form-data` — field `resume` (PDF), field `name` (string)

**Response 201:**
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "My Resume 2025", "fileUrl": "https://...", "isDefault": false }
}
```
**Authorization:** USER only

---

### GET /api/v1/resumes
Get own resumes list.

**Response 200:** Array of resume objects.  
**Authorization:** USER only

---

### DELETE /api/v1/resumes/:id
Delete a resume.

**Response 200:** `{ "success": true }` (error if attached to active application)  
**Authorization:** USER who owns the resume

---

### PATCH /api/v1/resumes/:id/default
Set a resume as default.

**Response 200:** Updated resume object.  
**Authorization:** USER who owns the resume

---

## 6.6 AI Endpoints

### POST /api/v1/ai/analyze-resume
Analyze a resume and extract structured data.

**Request Body:**
```json
{ "resumeId": "uuid" }
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "analysisId": "uuid",
    "skills": ["React", "TypeScript"],
    "education": [],
    "experience": [],
    "summary": "Experienced full-stack developer..."
  }
}
```
**Authorization:** USER who owns the resume

---

### POST /api/v1/ai/match-score
Get resume-to-job match score.

**Request Body:**
```json
{ "resumeId": "uuid", "jobId": "uuid" }
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "matchScore": 82,
    "matchedSkills": ["React", "REST APIs"],
    "missingSkills": ["Docker"],
    "suggestions": ["Add Docker to your skillset"]
  }
}
```
**Authorization:** USER only

---

### POST /api/v1/ai/sync-profile
Sync AI analysis results to user profile.

**Request Body:**
```json
{ "analysisId": "uuid" }
```
**Response 200:** Updated profile object.  
**Authorization:** USER who owns the analysis

---

### POST /api/v1/ai/career-advisor
Send a message to the career advisor chatbot.

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "What skills should I learn as a junior developer?" }
  ]
}
```
**Response 200:**
```json
{
  "success": true,
  "data": { "reply": "As a junior developer, I'd recommend..." }
}
```
**Authorization:** USER only

---

## 6.7 Dashboard / Analytics Endpoints

### GET /api/v1/dashboard/admin
Admin analytics data.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalJobs": 14,
    "totalApplications": 203,
    "shortlistRate": 22.3,
    "hireRate": 4.9,
    "applicationsByJob": [],
    "statusDistribution": {},
    "recentApplications": []
  }
}
```
**Authorization:** ADMIN only

---

### GET /api/v1/dashboard/user
User dashboard summary.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalApplications": 8,
    "pending": 3,
    "shortlisted": 2,
    "rejected": 3,
    "profileCompletion": 75,
    "recentApplications": []
  }
}
```
**Authorization:** USER only

---

## 6.8 Notification Endpoints

### GET /api/v1/notifications
Get own notifications.

**Query Params:** `?unreadOnly=true&page=1`

**Response 200:** Array of notification objects.  
**Authorization:** Any authenticated user

---

### PATCH /api/v1/notifications/:id/read
Mark notification as read.

**Response 200:** Updated notification.  
**Authorization:** User who owns the notification

---

### PATCH /api/v1/notifications/read-all
Mark all notifications as read.

**Response 200:** `{ "success": true }`.  
**Authorization:** Any authenticated user

---

# 7. Folder Structure

## 7.1 Monorepo Root

```
/
├── frontend/          # Next.js App Router application
├── backend/           # Express.js REST API
├── .github/
│   └── workflows/     # CI/CD GitHub Actions
├── .gitignore
├── README.md
└── PROJECT.md
```

## 7.2 Frontend Structure (`/frontend`)

```
frontend/
├── public/
│   └── icons/                  # Favicon, PWA icons
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Route group — unauthenticated layout
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (protected)/        # Route group — authenticated layout
│   │   │   ├── layout.tsx      # Sidebar/header layout with auth guard
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx    # Redirects to /admin or /user dashboard
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx    # Job listings
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx  # Job detail + apply button
│   │   │   ├── applications/
│   │   │   │   └── page.tsx    # User's applications tracker
│   │   │   ├── profile/
│   │   │   │   └── page.tsx    # User profile editor
│   │   │   ├── resumes/
│   │   │   │   └── page.tsx    # Resume manager + AI analysis
│   │   │   ├── ai/
│   │   │   │   ├── advisor/
│   │   │   │   │   └── page.tsx  # Career advisor chatbot
│   │   │   │   └── match/
│   │   │   │       └── page.tsx  # Resume match score tool
│   │   │   └── admin/
│   │   │       ├── dashboard/
│   │   │       │   └── page.tsx  # Admin analytics
│   │   │       ├── jobs/
│   │   │       │   ├── page.tsx       # Manage my jobs
│   │   │       │   ├── new/
│   │   │       │   │   └── page.tsx   # Create job form
│   │   │       │   └── [id]/
│   │   │       │       ├── edit/
│   │   │       │       │   └── page.tsx  # Edit job form
│   │   │       │       └── applications/
│   │   │       │           └── page.tsx  # Applicants for job
│   │   │       └── applications/
│   │   │           └── [id]/
│   │   │               └── page.tsx  # Single applicant review
│   │   ├── layout.tsx          # Root layout (providers, fonts, metadata)
│   │   ├── page.tsx            # Landing page
│   │   ├── not-found.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                 # Shadcn/UI auto-generated components
│   │   ├── layout/             # Header, Sidebar, Footer, MobileNav
│   │   ├── auth/               # LoginForm, RegisterForm, AuthGuard
│   │   ├── jobs/               # JobCard, JobList, JobForm, JobFilters
│   │   ├── applications/       # ApplicationCard, StatusBadge, ApplicationTable
│   │   ├── resumes/            # ResumeUploader, ResumeCard, ResumeList
│   │   ├── ai/                 # ChatInterface, AnalysisResult, MatchScoreCard
│   │   ├── dashboard/          # StatCard, BarChart, PieChart, RecentList
│   │   ├── profile/            # ProfileForm, SkillsInput, ExperienceEditor
│   │   └── shared/             # Pagination, EmptyState, LoadingSkeleton, ErrorBoundary
│   ├── hooks/
│   │   ├── useAuth.ts          # Auth state, login, logout helpers
│   │   ├── useJobs.ts          # React Query hooks for job endpoints
│   │   ├── useApplications.ts
│   │   ├── useResumes.ts
│   │   ├── useAI.ts
│   │   └── useNotifications.ts
│   ├── lib/
│   │   ├── api.ts              # Axios instance with interceptors and token refresh
│   │   ├── auth.ts             # Token storage and decode helpers
│   │   ├── validators/         # Zod schemas for all forms
│   │   │   ├── auth.ts
│   │   │   ├── job.ts
│   │   │   └── profile.ts
│   │   └── utils.ts            # cn(), formatDate(), formatSalary(), etc.
│   ├── providers/
│   │   ├── AuthProvider.tsx    # React context for auth state
│   │   ├── QueryProvider.tsx   # React Query client provider
│   │   └── ThemeProvider.tsx   # Dark/light mode
│   ├── store/                  # Zustand stores (if used instead of Context)
│   │   └── authStore.ts
│   └── types/
│       ├── api.ts              # API response types
│       ├── models.ts           # User, Job, Application, Resume, etc.
│       └── enums.ts            # UserRole, JobType, ApplicationStatus, etc.
├── .env.local
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── eslint.config.ts
└── package.json
```

## 7.3 Backend Structure (`/backend`)

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts         # pg Pool instance, connection config
│   │   ├── env.ts              # Zod-validated environment config (fail fast on startup)
│   │   ├── openai.ts           # OpenAI client initialization
│   │   └── storage.ts          # Cloud storage client (Supabase Storage or Cloudinary)
│   ├── db/
│   │   ├── schema.sql          # Complete SQL schema (source of truth)
│   │   ├── seed.sql            # Sample data for development
│   │   └── migrations/         # Numbered SQL migration files
│   │       ├── 001_init.sql
│   │       └── 002_indexes.sql
│   ├── middleware/
│   │   ├── auth.middleware.ts  # verifyToken() — validates JWT, attaches req.user
│   │   ├── role.middleware.ts  # requireRole('ADMIN') factory middleware
│   │   ├── validate.middleware.ts  # Zod validation middleware factory
│   │   ├── upload.middleware.ts    # multer config for file uploads
│   │   ├── rateLimit.middleware.ts
│   │   └── error.middleware.ts     # Global error handler
│   ├── modules/                # Feature modules (controller + service + routes)
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.validators.ts
│   │   ├── profile/
│   │   │   ├── profile.routes.ts
│   │   │   ├── profile.controller.ts
│   │   │   └── profile.service.ts
│   │   ├── jobs/
│   │   │   ├── jobs.routes.ts
│   │   │   ├── jobs.controller.ts
│   │   │   ├── jobs.service.ts
│   │   │   └── jobs.validators.ts
│   │   ├── applications/
│   │   │   ├── applications.routes.ts
│   │   │   ├── applications.controller.ts
│   │   │   └── applications.service.ts
│   │   ├── resumes/
│   │   │   ├── resumes.routes.ts
│   │   │   ├── resumes.controller.ts
│   │   │   └── resumes.service.ts
│   │   ├── ai/
│   │   │   ├── ai.routes.ts
│   │   │   ├── ai.controller.ts
│   │   │   └── ai.service.ts       # All OpenAI prompt logic lives here
│   │   ├── dashboard/
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   └── dashboard.service.ts
│   │   └── notifications/
│   │       ├── notifications.routes.ts
│   │       ├── notifications.controller.ts
│   │       └── notifications.service.ts
│   ├── utils/
│   │   ├── jwt.ts              # signToken(), verifyToken(), signRefreshToken()
│   │   ├── hash.ts             # hashPassword(), comparePassword()
│   │   ├── pdfParser.ts        # pdf-parse wrapper to extract text from PDF buffer
│   │   ├── response.ts         # sendSuccess(), sendError() response helpers
│   │   ├── pagination.ts       # getPaginationParams() helper
│   │   └── logger.ts           # Winston logger instance
│   ├── types/
│   │   ├── express.d.ts        # Augment Express Request with req.user
│   │   └── models.ts           # Shared model interfaces
│   └── app.ts                  # Express app setup (middleware, routes, error handler)
├── server.ts                   # Entry point — starts HTTP server
├── .env
├── .env.example
├── tsconfig.json
├── eslint.config.ts
└── package.json
```

---

# 8. UI/UX Design System

## 8.1 Design Tokens

### Color Palette

```css
/* Tailwind config extensions */
:root {
  --brand-primary:     #4F46E5;  /* Indigo 600 — primary actions, links */
  --brand-secondary:   #7C3AED;  /* Violet 600 — accent, AI features */
  --success:           #059669;  /* Emerald 600 — shortlisted, success */
  --warning:           #D97706;  /* Amber 600 — reviewing, pending */
  --danger:            #DC2626;  /* Red 600 — rejected, delete */
  --neutral-900:       #111827;  /* Headings */
  --neutral-600:       #4B5563;  /* Body text */
  --neutral-200:       #E5E7EB;  /* Borders */
  --surface:           #F9FAFB;  /* Page background */
  --card:              #FFFFFF;  /* Card background */
}
```

### Typography

```
Display:  Inter — 700, 36–48px, tight tracking
Heading:  Inter — 600, 20–28px
Body:     Inter — 400, 16px, 1.6 line-height
Caption:  Inter — 400, 12px, neutral-600
Code:     JetBrains Mono — 400, 14px
```

### Spacing Scale (Tailwind defaults — document key usages)
- Component padding: `p-6`
- Section gap: `gap-8`
- Card border-radius: `rounded-xl`
- Input height: `h-10`

### Status Badge Colors

| Status | Background | Text |
|---|---|---|
| PENDING | amber-100 | amber-700 |
| REVIEWING | blue-100 | blue-700 |
| SHORTLISTED | green-100 | green-700 |
| REJECTED | red-100 | red-700 |
| HIRED | purple-100 | purple-700 |

## 8.2 Page Wireframe Descriptions

### Landing Page (`/`)
- **Hero:** Full-width gradient banner (indigo→violet). Left: headline "Land your dream job with AI." + two CTA buttons (Post a Job / Browse Jobs). Right: 3D mock ATS dashboard screenshot.
- **Feature strip:** 3-column grid — Resume Analysis, Smart Matching, Career Advisor — with icon + heading + 2-line description.
- **Stats bar:** Animated counters — X jobs posted, Y applications, Z companies.
- **CTA section:** Dark background, centered "Get started today" button.
- **Footer:** Links, copyright.

### Login / Register (`/login`, `/register`)
- Centered card (max-w-md) on a subtle dot-grid background.
- Logo at top.
- Form fields with inline Zod validation errors.
- Role toggle (Job Seeker / Recruiter) on register only — rendered as segmented control.
- Social proof: "Trusted by 500+ recruiters" below card.

### User Dashboard (`/dashboard`)
- Top: 4 stat cards in a row (Applications, Pending, Shortlisted, Rejected).
- Middle: "Profile Completion" card with progress bar and checklist of missing fields.
- Right panel: "Recommended Jobs" list (3 items).
- Bottom: "Recent Applications" table with job name, date applied, status badge.

### Admin Dashboard (`/admin/dashboard`)
- Top row: 4 KPI stat cards.
- Row 2: Bar chart (Applications per Job) full width.
- Row 3: Pie chart (Status Distribution) left, Recent Applications table right.

### Job Listings (`/jobs`)
- Left sidebar: filter controls (location, job type, salary range, search input).
- Right: responsive grid of JobCard components.
- JobCard: Company logo placeholder, title, company, location, salary, job type badge, posted date, "View Details" button.
- Pagination at bottom.

### Job Details (`/jobs/:id`)
- Full-width header: job title, company, location, badges.
- Two-column layout: left = description + requirements; right = sticky apply card (resume selector, cover letter textarea, submit button, match score trigger).
- Match score panel appears after clicking "Check Match" — inline result with score ring, matched skills, missing skills.

### Profile (`/profile`)
- Tabs: Overview / Experience / Education / Skills.
- Overview: avatar (initials-based), name, headline, bio, contact links.
- Skills: tag input with add/remove.
- AI sync button: "Sync from Resume Analysis" — pre-fills fields from latest analysis.

### Resumes (`/resumes`)
- Upload zone (drag and drop): PDF only, max 5MB, with file validation.
- Resume list: cards with name, upload date, default badge, "Analyze with AI" button, delete icon.
- Analysis result drawer: slides in from right with extracted data, "Sync to Profile" button.

### Applications (`/applications`) — User
- List of application cards with job title, company, status badge, match score badge, date.
- Click to expand: shows cover letter, resume used, timeline of status changes.

### Admin — Applicants (`/admin/jobs/:id/applications`)
- Sortable data table: Applicant name, email, match score bar, status, applied date, actions.
- Row actions: View Profile, Change Status (dropdown), Download Resume.
- Bulk actions: Shortlist selected, Reject selected.

### AI Career Advisor (`/ai/advisor`)
- Chat interface: message bubbles (user right, AI left), input bar at bottom.
- Context panel (collapsible): shows skills and experience pulled from profile.
- Session disclaimer: "Conversation is not saved."

---

# 9. Development Roadmap

## Phase 1 — Project Setup (Week 1)
- [ ] Init monorepo with `/frontend` and `/backend` folders
- [ ] Set up Next.js with TypeScript, Tailwind, Shadcn/UI
- [ ] Set up Express.js with TypeScript, ts-node-dev
- [ ] Configure ESLint, Prettier, Husky, lint-staged
- [ ] Create PostgreSQL database on Neon/Supabase
- [ ] Run schema migrations
- [ ] Set up environment variable files
- [ ] Create GitHub repo, push initial commit, configure branch protection

## Phase 2 — Authentication (Week 1–2)
- [ ] Implement `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`
- [ ] JWT access token (15min) + refresh token (7 days) with rotation
- [ ] `verifyToken` and `requireRole` middleware
- [ ] Auto-create profile on registration trigger
- [ ] Frontend: Login and Register forms with validation
- [ ] Frontend: `AuthProvider`, token storage, axios interceptor for token refresh
- [ ] Frontend: Protected route wrapper

## Phase 3 — Core RBAC (Week 2)
- [ ] Attach `req.user` to all protected routes
- [ ] Test all role checks with Postman / Thunder Client
- [ ] Admin-only and User-only page guards on frontend

## Phase 4 — Job Management (Week 2–3)
- [ ] Backend: Full CRUD for jobs
- [ ] Backend: Pagination, search, filter query
- [ ] Frontend: Job listings page with filters
- [ ] Frontend: Job detail page
- [ ] Frontend: Admin — Create/Edit/Delete job forms
- [ ] Frontend: Admin — My Jobs list

## Phase 5 — Applications & Resumes (Week 3)
- [ ] Backend: File upload (multer + Supabase Storage)
- [ ] Backend: Resume CRUD endpoints
- [ ] Backend: Apply to job, prevent duplicate applications
- [ ] Backend: Status update + notification creation
- [ ] Frontend: Resume manager (upload, list, default, delete)
- [ ] Frontend: Apply modal on job detail page
- [ ] Frontend: User applications tracker
- [ ] Frontend: Admin applicants table with status actions

## Phase 6 — AI Integration (Week 4)
- [ ] Backend: pdf-parse to extract text from uploaded PDF
- [ ] Backend: Resume Analyzer prompt + OpenAI call + store result
- [ ] Backend: Match Score prompt + caching logic
- [ ] Backend: Career Advisor streaming endpoint
- [ ] Frontend: AI analysis result drawer on resumes page
- [ ] Frontend: Match score display on job detail and application cards
- [ ] Frontend: Career advisor chat interface

## Phase 7 — Dashboards & Notifications (Week 4)
- [ ] Backend: Admin analytics queries
- [ ] Backend: User dashboard summary
- [ ] Backend: Notification CRUD
- [ ] Frontend: Admin dashboard with charts (Recharts or Chart.js)
- [ ] Frontend: User dashboard
- [ ] Frontend: Notification bell with unread count

## Phase 8 — Testing (Week 5)
- [ ] Unit tests for auth service, JWT utils, AI service
- [ ] Integration tests for all API endpoints (Supertest)
- [ ] E2E tests: register → apply → status update flow (Playwright)

## Phase 9 — Deployment (Week 5)
- [ ] Deploy backend to Render/Railway
- [ ] Deploy frontend to Vercel (connect GitHub repo)
- [ ] Set all production environment variables
- [ ] Test full flow on production URLs
- [ ] Production checklist (see Section 12)

---

# 10. Git Workflow

## Branch Strategy

```
main          ← production-ready, protected, deploys to Vercel/Render
develop       ← integration branch, all features merge here first
feature/*     ← one branch per task
fix/*         ← bug fixes
chore/*       ← config, tooling, dependency updates
```

## Branch Rules
- `main` and `develop` are protected — no direct pushes
- All work goes through Pull Requests (minimum 1 approval for team projects)
- Feature branches are deleted after merge

## Commit Naming Convention

Format: `type(scope): subject`

| Type | Use Case |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Build config, deps, tooling |
| `docs` | Documentation |
| `test` | Tests only |
| `refactor` | No functional change |
| `style` | Formatting, whitespace |
| `perf` | Performance improvement |

## Commit Examples

```
feat(auth): implement JWT refresh token rotation
feat(jobs): add paginated job listings endpoint
feat(ai): integrate OpenAI resume extraction
fix(applications): prevent duplicate application submission
chore(deps): upgrade to drizzle-orm 0.31
docs(api): add OpenAPI spec for auth routes
test(auth): add integration tests for login flow
refactor(profile): extract profile completion calculator
```

---

# 11. Testing Strategy

## 11.1 Unit Tests (Jest)

**Auth Service**
- `hashPassword()` returns bcrypt hash
- `comparePassword()` matches correct password
- `signToken()` returns valid JWT with correct payload
- `verifyToken()` throws on expired token
- `verifyToken()` throws on tampered token

**AI Service**
- `buildResumeExtractPrompt()` includes resume text in prompt
- `buildMatchScorePrompt()` includes both resume and JD
- `parseAIResponse()` returns valid JSON for well-formed AI output
- `parseAIResponse()` throws gracefully for malformed output

**Utilities**
- `getPaginationParams()` clamps page and limit values
- `formatSalary()` formats numbers as currency strings

## 11.2 Integration Tests (Supertest)

**Auth Endpoints**
- POST /auth/register — 201 with token pair
- POST /auth/register — 409 on duplicate email
- POST /auth/login — 200 with correct credentials
- POST /auth/login — 401 on wrong password
- POST /auth/refresh — 200 with valid refresh token
- POST /auth/refresh — 401 on revoked token
- POST /auth/logout — 200 and token is revoked

**Job Endpoints**
- POST /jobs — 201 for ADMIN, 403 for USER
- GET /jobs — 200 with pagination meta
- GET /jobs — filters by jobType correctly
- PUT /jobs/:id — 200 for owner, 403 for non-owner admin
- DELETE /jobs/:id — 200 for owner, 404 for non-existent

**Application Endpoints**
- POST /applications — 201 on first apply
- POST /applications — 409 on duplicate apply
- PATCH /applications/:id/status — 200 and notification created
- GET /applications/job/:jobId — 403 if not job owner

**Resume Endpoints**
- POST /resumes — 201 with PDF upload
- POST /resumes — 400 on non-PDF file
- DELETE /resumes/:id — 400 if attached to active application

## 11.3 End-to-End Tests (Playwright)

**Flow 1 — User Registration to Application**
1. Visit `/register`
2. Fill form with USER role
3. Redirect to `/dashboard`
4. Visit `/profile`, fill all fields
5. Visit `/resumes`, upload a PDF
6. Visit `/jobs`, open a job
7. Click Apply, select resume, submit
8. Visit `/applications`, confirm application appears with PENDING status

**Flow 2 — Admin Job Posting to Candidate Review**
1. Register with ADMIN role
2. Visit `/admin/jobs/new`, fill and publish job
3. Job appears in `/jobs` listing
4. Visit `/admin/jobs/:id/applications`
5. Shortlist an applicant — confirm status changes to SHORTLISTED

**Flow 3 — AI Resume Analysis**
1. Log in as USER
2. Upload resume on `/resumes`
3. Click "Analyze with AI"
4. Confirm extracted skills/summary appear
5. Click "Sync to Profile"
6. Visit `/profile` — confirm skills populated

---

# 12. Deployment Guide

## 12.1 Database — Neon/Supabase PostgreSQL

1. Create a new PostgreSQL project on [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com)
2. Copy the connection string (`DATABASE_URL`)
3. Run migrations: connect with `psql $DATABASE_URL -f backend/src/db/schema.sql`
4. (Optional) Run seed: `psql $DATABASE_URL -f backend/src/db/seed.sql`
5. Enable SSL mode on connection string: `?sslmode=require`

## 12.2 Backend — Render or Railway

### Render
1. New → Web Service → Connect GitHub repo → select `/backend` as root
2. Build Command: `npm install && npm run build`
3. Start Command: `node dist/server.js`
4. Set environment variables (see below)
5. Health Check Path: `/api/v1/health`

### Railway
1. New Project → Deploy from GitHub → `/backend` directory
2. Add `npm run build && node dist/server.js` as start command
3. Set env vars via Railway dashboard

## 12.3 Frontend — Vercel

1. Import GitHub repository on [vercel.com](https://vercel.com)
2. Root Directory: `frontend`
3. Framework Preset: Next.js
4. Environment variables: set `NEXT_PUBLIC_API_URL` to backend URL
5. Auto-deploys on push to `main`

## 12.4 Environment Variables

### Backend `.env`
```
NODE_ENV=production
PORT=8080

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# JWT
JWT_SECRET=<min-256-bit-random-string>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=<min-256-bit-random-string>
REFRESH_TOKEN_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=sk-...

# File Storage (Supabase)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_BUCKET=resumes

# CORS
ALLOWED_ORIGIN=https://yourapp.vercel.app
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=https://yourbackend.onrender.com/api/v1
```

## 12.5 Production Checklist

- [ ] `NODE_ENV=production` set on backend
- [ ] JWT_SECRET and REFRESH_TOKEN_SECRET are cryptographically random (use `openssl rand -hex 64`)
- [ ] `ALLOWED_ORIGIN` is the exact Vercel URL (no trailing slash)
- [ ] Database connection pool size appropriate for plan (Neon free tier: max 5)
- [ ] File size limits configured on multer (5MB PDF)
- [ ] OpenAI API key has spending limits set in OpenAI dashboard
- [ ] Logging is structured JSON (Winston) — no `console.log` in production
- [ ] Error responses never expose stack traces (`NODE_ENV !== 'development'`)
- [ ] Health check endpoint (`GET /api/v1/health → 200`) live
- [ ] Backend auto-restart on crash (Render/Railway handles this)
- [ ] Vercel custom domain configured (optional)

---

# 13. Future Enhancements

1. **Video Resume Upload** — Applicants record a 60-second intro; AI transcribes and evaluates
2. **AI Interview Prep** — Generates job-specific mock interview questions from JD
3. **Calendly-style Interview Scheduling** — Admin books interview slots; applicant confirms
4. **Multi-company Support** — Companies register separately; each admin belongs to one company
5. **Applicant Referral System** — Users refer friends; track referral conversion
6. **Resume Builder** — In-app resume editor with AI suggestions and PDF export
7. **Email Notifications** — SendGrid integration; digest emails for application status changes
8. **Saved Jobs** — Users bookmark jobs and get notified before they close
9. **Advanced Analytics** — Funnel visualization, time-to-hire, source attribution
10. **Talent Pipeline** — Admins create pools of pre-vetted candidates for future roles
11. **Team Collaboration** — Multiple recruiters per company; internal notes on applicants
12. **Public Company Profiles** — Company pages with culture info, team size, funding stage
13. **Skill Assessments** — Attach 3rd-party skill tests (HackerRank API); score shown on application
14. **CSV Import/Export** — Bulk import jobs from CSV; export applicant data
15. **Webhook Integrations** — Trigger Slack DMs or Zapier flows on status changes
16. **Candidate Messaging** — In-app DM between recruiter and applicant
17. **Job Alerts** — Users subscribe to keyword/location alerts; daily email digest
18. **AI Cover Letter Generator** — One-click cover letter tailored to each job
19. **Diversity & Inclusion Reports** — Anonymized demographic breakdown of applicant pool
20. **Mobile App** — React Native wrapper around the same API for iOS and Android

---

# 14. Architecture Diagrams

## 14.1 System Architecture

```mermaid
graph TB
    subgraph Client["Client Layer"]
        Browser["Browser (Next.js App)"]
        Mobile["Mobile Browser"]
    end

    subgraph Frontend["Frontend — Vercel"]
        NextJS["Next.js App Router"]
        ReactQuery["React Query Cache"]
        Zustand["Zustand State"]
    end

    subgraph Backend["Backend — Render/Railway"]
        Express["Express.js API"]
        AuthMW["Auth Middleware"]
        RoleMW["RBAC Middleware"]
        AIService["AI Service"]
        FileService["File Service"]
    end

    subgraph AI["AI Layer"]
        OpenAI["OpenAI GPT-4o"]
    end

    subgraph Storage["Storage Layer"]
        Neon["Neon PostgreSQL"]
        Supabase["Supabase Storage (PDFs)"]
    end

    Browser --> NextJS
    Mobile --> NextJS
    NextJS --> Express
    Express --> AuthMW --> RoleMW
    RoleMW --> AIService
    RoleMW --> FileService
    AIService --> OpenAI
    FileService --> Supabase
    Express --> Neon
```

## 14.2 Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Express API
    participant DB as PostgreSQL

    C->>API: POST /auth/login {email, password}
    API->>DB: SELECT user WHERE email = ?
    DB-->>API: user record
    API->>API: bcrypt.compare(password, hash)
    API->>API: sign accessToken (15min)
    API->>API: sign refreshToken (7d)
    API->>DB: INSERT refresh_tokens (token_hash, expires_at)
    API-->>C: { accessToken, refreshToken }

    Note over C,API: Later — access token expires

    C->>API: POST /auth/refresh {refreshToken}
    API->>DB: SELECT refresh_token WHERE token_hash = hash
    DB-->>API: token record
    API->>API: verify not expired, not revoked
    API->>DB: UPDATE refresh_tokens SET is_revoked = true (old)
    API->>API: sign new accessToken + refreshToken
    API->>DB: INSERT new refresh_token
    API-->>C: { accessToken, refreshToken }

    Note over C,API: Logout

    C->>API: POST /auth/logout {refreshToken}
    API->>DB: UPDATE refresh_tokens SET is_revoked = true
    API-->>C: 200 OK
```

## 14.3 Application Flow

```mermaid
sequenceDiagram
    participant U as Job Seeker
    participant FE as Frontend
    participant API as Backend
    participant AI as OpenAI
    participant DB as Database

    U->>FE: Browse jobs
    FE->>API: GET /jobs?search=react&page=1
    API->>DB: SELECT jobs WHERE status=PUBLISHED
    DB-->>API: jobs[]
    API-->>FE: { data: jobs[], meta }
    FE-->>U: Job listings

    U->>FE: Click "Check Match" on job
    FE->>API: POST /ai/match-score { resumeId, jobId }
    API->>DB: SELECT resume text
    API->>DB: SELECT job description
    API->>AI: prompt with resume + JD
    AI-->>API: { matchScore, skills, suggestions }
    API->>DB: INSERT ai_analysis
    API-->>FE: analysis result
    FE-->>U: Match score displayed

    U->>FE: Click Apply
    FE->>API: POST /applications { jobId, resumeId, coverLetter }
    API->>DB: INSERT application
    API->>DB: INSERT notification (admin)
    API-->>FE: { application }
    FE-->>U: "Application submitted"
```

## 14.4 Database ERD

(See Section 5.1 for the full Mermaid ERD diagram)

---

# 15. Instructions for Antigravity

> This section is the canonical implementation guide for AI coding agents building this project from scratch. Follow every instruction in order. Do not skip steps or reorder phases.

## 15.1 Exact Implementation Order

```
1.  Bootstrap backend: Express + TypeScript + ts-node-dev
2.  Create backend config/env.ts — validate all env vars with Zod at startup
3.  Create database connection (pg Pool) with retry logic
4.  Run schema.sql against your Neon/Supabase database
5.  Implement auth module end-to-end (register → login → refresh → logout → /me)
6.  Test auth with Postman before proceeding
7.  Implement profile module
8.  Implement jobs module
9.  Implement resumes module (file upload last — most complex)
10. Implement applications module
11. Implement notifications service (called from applications module)
12. Implement AI module (add pdf-parse text extraction before OpenAI calls)
13. Implement dashboard module
14. Bootstrap frontend: Next.js + TypeScript + Tailwind + Shadcn/UI
15. Create API client (axios instance with interceptors)
16. Implement AuthProvider + useAuth hook
17. Build Login and Register pages
18. Implement protected route layout with role guard
19. Build Job Listings and Job Detail pages
20. Build Resume manager and AI analysis pages
21. Build Apply flow (modal on Job Detail)
22. Build Application tracker (User Dashboard)
23. Build Admin pages (Jobs CRUD, Applicants table, Analytics)
24. Build AI Career Advisor chat
25. Write tests (unit → integration → E2E)
26. Deploy backend, then frontend
27. Smoke test all flows on production
```

## 15.2 Coding Standards

- **TypeScript strict mode** (`"strict": true` in tsconfig) — no `any` without a comment explaining why
- All async functions use `async/await` — no `.then()` chains
- No raw `console.log` — always use the Winston logger
- Functions are small and single-purpose (max 40 lines). Extract helpers mercilessly
- All new files export from an `index.ts` barrel where the folder has multiple exports
- Use named exports everywhere — default exports only for Next.js pages and React components
- Database queries are parameterized — never string-interpolate user input into SQL
- Every service function has a JSDoc comment with `@param`, `@returns`, `@throws`

## 15.3 Error Handling Standards

**Backend:**
- All route handlers are wrapped in `try/catch`
- Errors propagate to the global error middleware via `next(error)`
- Use a custom `AppError` class: `new AppError('User not found', 404, 'USER_NOT_FOUND')`
- Global error middleware formats all errors into the standard error envelope
- In production, never expose `error.stack` to the client
- Validation errors from Zod return `400` with `details` array
- Auth errors: `401` (not authenticated), `403` (not authorized)
- Not found: `404`
- Conflict (duplicate): `409`
- Server errors: `500`

```typescript
// AppError class
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

**Frontend:**
- All API calls inside React Query `queryFn` or `mutationFn`
- React Query handles loading and error states
- Display user-friendly messages from `error.response.data.error.message`
- Global toast notification for API errors (use Shadcn/UI `<Toast />`)
- Never crash the whole page — wrap sections in `<ErrorBoundary>`

## 15.4 API Standards

- All routes are prefixed `/api/v1/`
- Method semantics: GET=read, POST=create, PUT=full update, PATCH=partial update, DELETE=remove
- All responses use the standard success/error envelope (Section 6)
- `200` for success, `201` for created, `204` for no-content delete (or `200` with message)
- Pagination: always return `meta: { page, limit, total }` on list endpoints
- Sort parameters: `?sortBy=createdAt&order=desc`
- Filter parameters: snake_case query params matching field names
- File endpoints use `multipart/form-data`; all others use `application/json`

## 15.5 Security Standards

- Never log passwords, tokens, or API keys
- bcrypt minimum 12 salt rounds: `bcrypt.hash(password, 12)`
- JWT secret minimum 256 bits: `openssl rand -hex 64`
- Refresh tokens stored as SHA-256 hash in database (never plaintext)
- File uploads: validate MIME type server-side (check `file.mimetype`), not just extension
- All user inputs sanitized through Zod before touching the database
- CORS: `origin: process.env.ALLOWED_ORIGIN` — not `*` in production
- Rate limiting on all auth routes: 10 requests/minute per IP
- Helmet.js applied globally: `app.use(helmet())`
- SQL: always use parameterized queries `db.query('SELECT * FROM users WHERE id = $1', [id])`

## 15.6 Database Standards

- All primary keys are UUIDs (`uuid_generate_v4()`)
- All tables have `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- All mutable tables have `updated_at` with auto-trigger
- All foreign keys have `ON DELETE CASCADE` or `ON DELETE SET NULL` (deliberate choice per table)
- All enum types are defined as PostgreSQL `ENUM` types (not varchar)
- All indexes documented in schema.sql with a comment explaining the query they optimize
- Never delete records unless explicitly required — add `is_active` flag or `deleted_at`
- All JSONB columns have a defined schema (documented in Section 5.3)
- Connection pool: `max: 10` connections; `idleTimeoutMillis: 30000`

## 15.7 Testing Standards

- Test file naming: `*.test.ts` for unit/integration, `*.spec.ts` for E2E
- Unit test coverage target: 80% on service files
- Every API endpoint has at least one happy-path and one error-path integration test
- Integration tests use a separate test database (set `DATABASE_URL_TEST` env var)
- Integration tests run schema migration before each test suite; truncate tables between tests
- E2E tests run against a local dev server (not production)
- Tests are deterministic — no `Math.random()` or `Date.now()` without mocking
- Test data is created through factories, not hardcoded UUIDs

## 15.8 Deployment Standards

- All environment variables set via platform dashboard — never committed to Git
- `.env.example` is committed with all key names but no values
- Build artifacts (`/dist`, `/.next`) are in `.gitignore`
- Backend has a health check endpoint (`GET /api/v1/health → 200 { status: 'ok' }`)
- Frontend `next.config.ts` sets `output: 'standalone'` if self-hosting; default for Vercel
- Database migrations run as a deploy step before server starts (add to build command)
- Zero-downtime: Render/Railway replace instances after health check passes
- Monitor: Render/Railway dashboard for server logs; Vercel for build logs
- After every deploy: manually test register → login → post job → apply → status update flow

---

*End of PROJECT.md — This document is the single source of truth for the AI-Powered Job Application Portal. All implementation decisions should reference this file.*
