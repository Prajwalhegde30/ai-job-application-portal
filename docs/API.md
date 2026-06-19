# AI Job Application Portal — API Reference Documentation

All endpoints are prefixed with the base path `/api/v1`.

---

## 1. Authentication Module (`/auth`)

### `POST /auth/register`
Creates a candidate user account.
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password123!"
  }
  ```
- **Response (201 Created)**:
  - Header: `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=None; Path=/api/v1/auth; Max-Age=604800`
  - Body:
    ```json
    {
      "success": true,
      "message": "Registration successful",
      "data": {
        "user": {
          "id": "uuid",
          "name": "John Doe",
          "email": "john@example.com",
          "role": "USER"
        },
        "accessToken": "jwt-token"
      }
    }
    ```

### `POST /auth/login`
Authenticates a user and starts a session.
- **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK)**:
  - Header: `Set-Cookie: refreshToken=...`
  - Body: same as registration payload.

### `POST /auth/refresh`
Rotates refresh tokens and issues a new access token.
- **Request Headers**: Expects `refreshToken` HTTP-only cookie.
- **Response (200 OK)**:
  - Header: `Set-Cookie: refreshToken=...` (Rotated token)
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "accessToken": "new-jwt-token"
      }
    }
    ```

### `POST /auth/logout`
Revokes the active refresh token session and clears the cookie.
- **Response (200 OK)**:
  - Header: Clears `refreshToken` cookie.

### `GET /auth/me`
Gets the logged-in user's profile summary.
- **Request Headers**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**: User details object.

---

## 2. Profile Module (`/profile`)

- **Auth Required**: User or Admin.

### `GET /profile`
Gets the candidate profile of the authenticated user.

### `PUT /profile`
Updates candidate profile (headline, bio, location, phone, website, URLs, skills, experience, education).
- **Request Body**:
  ```json
  {
    "headline": "Full Stack Engineer",
    "bio": "Building node apps",
    "location": "Boston, MA",
    "phone": "+15550199",
    "website": "https://example.com",
    "linkedinUrl": "https://linkedin.com/in/johndoe",
    "githubUrl": "https://github.com/johndoe",
    "skills": [{ "name": "React", "category": "Frontend", "level": "advanced" }],
    "experience": [{ "company": "Tech Corp", "title": "Developer", "duration": "2 years" }],
    "education": [{ "institution": "University A", "degree": "B.S. CS", "year": 2024 }]
  }
  ```

---

## 3. Jobs Module (`/jobs`)

### `GET /jobs`
Lists published job postings with query pagination.
- **Query Params**:
  - `page` (default 1)
  - `limit` (default 10)
  - `search` (filter title, company, location)
  - `jobType` (`FULL_TIME`, `PART_TIME`, `CONTRACT`, `REMOTE`, `INTERNSHIP`)

### `GET /jobs/:jobId`
Retrieves details of a single job.

### `POST /jobs`
*(Admin Only)* Creates a job posting (starts in `DRAFT`).
- **Request Body**:
  ```json
  {
    "title": "Node Developer",
    "company": "NodeCo",
    "description": "Develop APIs...",
    "requirements": "3+ years Node.js...",
    "responsibilities": "Writing clean code...",
    "location": "Remote",
    "salaryMin": 90000,
    "salaryMax": 120000,
    "jobType": "REMOTE"
  }
  ```

### `PATCH /jobs/:jobId/publish`
*(Admin Only)* Publishes a job posting, moving status from `DRAFT` to `PUBLISHED`.

### `PATCH /jobs/:jobId/close`
*(Admin Only)* Closes a job posting.

---

## 4. Resume Module (`/resumes`)

- **Auth Required**: Candidate owner.

### `POST /resumes`
Uploads a new PDF resume.
- **Content-Type**: `multipart/form-data`
- **Payload**: `file` (PDF, max 5MB), `resumeTitle` (string).

### `GET /resumes`
Lists all uploaded resumes for the candidate.

### `GET /resumes/:resumeId`
Generates a 15-minute secure signed Supabase storage download URL.

### `PATCH /resumes/:resumeId/activate`
Sets the specified resume as the default active resume.

### `PUT /resumes/:resumeId`
Replaces the PDF binary of an existing resume record.

### `DELETE /resumes/:resumeId`
Deletes the resume metadata from the database and raw binary file from Supabase storage.

---

## 5. Application Module (`/applications` & `/admin/applications`)

### `POST /applications`
Submits a job application.
- **Request Body**:
  ```json
  {
    "jobId": "uuid",
    "resumeId": "uuid",
    "coverLetter": "Dear hiring manager..."
  }
  ```

### `GET /applications/mine`
Lists candidate's submitted applications.

### `GET /applications/job/:jobId`
*(Admin Only)* Lists applicants for a specific job.

### `PATCH /admin/applications/:applicationId/status`
*(Admin Only)* Transitions application stage.
- **Request Body**:
  ```json
  {
    "status": "SHORTLISTED",
    "notes": "Excellent resume match"
  }
  ```

---

## 6. Notification Module (`/notifications`)

- **Auth Required**: User owner.

### `GET /notifications`
Retrieves in-app notifications.

### `PATCH /notifications/:notificationId/read`
Marks a single notification as read.

---

## 7. Analytics Module (`/analytics`)

- **Auth Required**: Admin.

### `GET /analytics/summary`
Total counts of jobs, applications, active candidate users, and unread notifications.

---

## 8. AI Analysis Module (`/ai-analysis`)

- **Auth Required**: User owner or Admin.

### `GET /ai-analysis/resume/:resumeId`
Retrieves detailed extracted summary of resume PDF (skills, experience, projects, education). Runs in the background on upload.

---

## 9. Match Engine Module (`/match-analysis`)

- **Auth Required**: User owner or Admin.

### `GET /match-analysis/application/:applicationId`
Retrieves resume-to-job description match comparison (skills matching, missing skills, scoring, suggestions).

---

## 10. AI Career Advisor Module (`/career-advice`)

- **Auth Required**: User owner or Admin.

### `GET /career-advice/:applicationId`
Retrieves or triggers generative career advisor guidance roadmap.

---

## 11. System Health & Telemetry

### `GET /live`
Processes basic HTTP ping.

### `GET /ready`
Validates DB connection and Supabase Storage bucket listing.

### `GET /health`
Detailed system statistics (memory, uptime, versions).

### `GET /api/v1/metrics`
*(Admin Only)* Telemetry metrics dashboard JSON.
