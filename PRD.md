# Product Requirements Document (PRD)

## 1. Product Overview

### Problem Statement

The job application process is broken from both sides. Job seekers blindly submit resumes that never get read, with no feedback on why they were rejected or how to improve. Recruiters drown in unqualified applications, manually screening hundreds of resumes for a handful of relevant candidates.

Existing ATS solutions are either enterprise-grade ($$$) or feature-poor. There is no modern, AI-augmented, accessible platform that serves both sides of the market well.

### Target Users

**Primary — Job Seekers (Individual Contributors)**
- Recent graduates and career changers
- Mid-level professionals actively job hunting
- Freelancers building a professional profile

**Secondary — Recruiters and Hiring Managers**
- Startup founders hiring their first team
- HR professionals at SMBs
- Recruitment agencies managing multiple clients

### Value Proposition

| Pain Point | Our Solution |
|---|---|
| Resumes disappear into the void | Real-time application status tracking |
| No feedback on rejections | AI-powered resume match scores with actionable suggestions |
| Recruiters overwhelmed by volume | AI pre-screening and match scoring per job |
| Generic career advice | Personalized AI career advisor based on resume + job market |
| No visibility into skill gaps | Missing skills extracted per job description |

---

## 2. User Roles & RBAC Matrix

### Roles

| Role | Description |
|---|---|
| `ADMIN` | Recruiter / Hiring Manager — creates and manages jobs, reviews applications |
| `USER` | Job Seeker — browses jobs, applies, tracks status |

### Permissions Table

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

## 3. Functional Requirements

### 3.1 Authentication

- FR-AUTH-01: Users can register with name, email, password, and role selection (USER or ADMIN)
- FR-AUTH-02: Passwords are hashed using bcrypt (min 12 rounds)
- FR-AUTH-03: Login returns a short-lived JWT access token (15 min) and a long-lived refresh token (7 days)
- FR-AUTH-04: Refresh tokens are rotated on every use (token rotation pattern)
- FR-AUTH-05: Refresh tokens are stored in the database and invalidated on logout
- FR-AUTH-06: All protected routes validate JWT access token in `Authorization: Bearer <token>` header
- FR-AUTH-07: Role is encoded in JWT payload as `role: "ADMIN" | "USER"`
- FR-AUTH-08: Middleware validates role on every protected route
- FR-AUTH-09: Rate limiting on `/api/auth/*` routes (max 10 requests/minute per IP)

### 3.2 Profile Management

- FR-PROF-01: Users have a profile record linked to their user account
- FR-PROF-02: Profile fields: headline, bio, location, phone, website, LinkedIn URL, GitHub URL, skills (array), experience (JSON), education (JSON)
- FR-PROF-03: Profile is auto-created on user registration with empty fields
- FR-PROF-04: Users can update their profile at any time
- FR-PROF-05: Profile can be pre-populated from AI resume analysis
- FR-PROF-06: Skills are stored as a string array; UI renders them as tags

### 3.3 Job Management

- FR-JOB-01: Admins can create jobs with: title, company, description, requirements, location, salary range, job type (full-time/part-time/contract/remote), status (draft/published/closed)
- FR-JOB-02: Only the admin who created a job can edit or delete it
- FR-JOB-03: Published jobs are visible to all authenticated users
- FR-JOB-04: Jobs have a `closedAt` date after which applications are blocked
- FR-JOB-05: Job listings support search by title, keyword; filter by location, job type, salary range
- FR-JOB-06: Job listings are paginated (20 per page)
- FR-JOB-07: Admins can close/reopen jobs
- FR-JOB-08: Each job shows application count to admins only

### 3.4 Application Management

- FR-APP-01: Users can apply to a published, open job once (unique constraint)
- FR-APP-02: Application requires: cover letter (optional), resume ID (must own), consent checkbox
- FR-APP-03: Application statuses: `PENDING → REVIEWING → SHORTLISTED → REJECTED | HIRED`
- FR-APP-04: Admins can move applications through statuses
- FR-APP-05: Status changes trigger a notification to the applicant
- FR-APP-06: Users can view all their applications with status history
- FR-APP-07: Admins can view all applications for a job with sortable columns (date, match score, status)
- FR-APP-08: Admins can download applicant resume (signed URL or proxy download)
- FR-APP-09: Users cannot delete an application once submitted

### 3.5 Resume Management

- FR-RES-01: Users can upload one or more resumes (PDF only, max 5MB)
- FR-RES-02: Files are stored in a cloud bucket (Supabase Storage or Cloudinary)
- FR-RES-03: Each resume has a name, upload date, and file URL
- FR-RES-04: Users can set one resume as default
- FR-RES-05: Users can delete a resume (unless it is attached to an active application)
- FR-RES-06: File URL is a signed/private URL; access controlled server-side

### 3.6 AI Features

#### Resume Analyzer
- FR-AI-01: User uploads resume → backend extracts text → sends to OpenAI → returns structured JSON
- FR-AI-02: Extracted data: `skills[]`, `education[]`, `experience[]`, `summary` (3–4 sentences)
- FR-AI-03: User can confirm and sync extracted data to their profile
- FR-AI-04: Analysis is stored in `ai_analysis` table linked to `resume_id`

#### Resume Match Score
- FR-AI-05: User selects a resume and a job → backend sends both texts to OpenAI → returns structured response
- FR-AI-06: Response includes: `matchScore` (0–100), `matchedSkills[]`, `missingSkills[]`, `suggestions[]`
- FR-AI-07: Match score is displayed on the application card (visible to both user and admin)
- FR-AI-08: Analysis result is cached (do not re-call API if same resume+job combination exists)

#### AI Career Advisor
- FR-AI-09: Chatbot interface backed by OpenAI with a system prompt focused on career advice
- FR-AI-10: System prompt includes user's skills, experience, and target role (from profile)
- FR-AI-11: Bot suggests: skills to learn, projects to build, career paths
- FR-AI-12: Conversation history is maintained in component state (not persisted to DB)
- FR-AI-13: Max 20 messages per session to control API costs

### 3.7 Dashboard Features

#### Admin Dashboard
- FR-DASH-01: Total jobs posted, total applications received, shortlist rate, hire rate
- FR-DASH-02: Applications per job (bar chart)
- FR-DASH-03: Application status distribution (pie chart)
- FR-DASH-04: Recent applications list (last 10)
- FR-DASH-05: Top applicant skills across all applications (tag cloud)

#### User Dashboard
- FR-DASH-06: Applications submitted count, pending/shortlisted/rejected breakdown
- FR-DASH-07: Application timeline cards sorted by last status change
- FR-DASH-08: Profile completeness indicator (%)
- FR-DASH-09: Recommended jobs (simple keyword match against profile skills)

---

## 4. Non-Functional Requirements

### 4.1 Security
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

### 4.2 Scalability
- Stateless backend (JWT-based; no server-side session store)
- Database connection pooling (pg pool max: 10)
- File storage offloaded to cloud provider (not local disk)
- AI calls are async and non-blocking
- Pagination on all list endpoints

### 4.3 Performance
- API response time target: < 300ms for non-AI endpoints
- AI endpoints target: < 10 seconds (show loading state)
- Frontend Lighthouse score target: 90+ on desktop
- Images and static assets served via CDN
- Next.js ISR or SSR as appropriate per page

### 4.4 Accessibility
- WCAG 2.1 AA compliance
- All interactive elements keyboard navigable
- ARIA labels on icon-only buttons
- Color contrast ratio ≥ 4.5:1
- Focus-visible outlines on all focusable elements
- Skip-to-content link on all pages

### 4.5 Maintainability
- TypeScript strict mode on both frontend and backend
- ESLint + Prettier enforced via pre-commit hook (husky + lint-staged)
- All functions documented with JSDoc
- Environment variables documented in `.env.example`
- Error messages are structured and machine-readable
- Logging with Winston (backend), structured JSON in production
