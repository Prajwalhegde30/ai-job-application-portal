# AI-Powered Job Application Portal

An enterprise-grade job application platform with AI-powered resume analysis, smart job matching, and career advisory. Built as a monorepo with a Next.js frontend and Express.js backend.

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **UI Components:** Shadcn/UI
- **State Management:** Zustand + React Query
- **Forms:** React Hook Form + Zod validation
- **HTTP Client:** Axios

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js 5
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL (via `pg` driver)
- **Validation:** Zod
- **Logging:** Winston
- **Security:** Helmet, CORS, bcrypt, JWT

### Infrastructure
- **Frontend Hosting:** Vercel
- **Backend Hosting:** Render / Railway
- **Database:** Neon PostgreSQL
- **File Storage:** Supabase Storage
- **AI:** OpenAI GPT-4o

## Folder Structure

```
/
├── frontend/                  # Next.js application
│   ├── src/
│   │   ├── app/               # App Router pages
│   │   ├── components/        # UI components by feature
│   │   │   ├── ui/            # Shadcn/UI base components
│   │   │   ├── layout/        # Header, Sidebar, Footer
│   │   │   ├── auth/          # Login, Register, AuthGuard
│   │   │   ├── jobs/          # JobCard, JobList, JobFilters
│   │   │   ├── applications/  # ApplicationCard, StatusBadge
│   │   │   ├── resumes/       # ResumeUploader, ResumeCard
│   │   │   ├── ai/            # ChatInterface, MatchScore
│   │   │   ├── dashboard/     # StatCard, Charts
│   │   │   ├── profile/       # ProfileForm, SkillsInput
│   │   │   └── shared/        # Pagination, EmptyState
│   │   ├── hooks/             # React Query hooks per feature
│   │   ├── lib/               # API client, utils, validators
│   │   ├── providers/         # Auth, Query, Theme providers
│   │   ├── store/             # Zustand stores
│   │   └── types/             # TypeScript types and enums
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                   # Express.js API
│   ├── src/
│   │   ├── config/            # env validation, database, OpenAI
│   │   ├── db/                # Schema, seeds, migrations
│   │   ├── middleware/        # Auth, RBAC, validation, error
│   │   ├── modules/           # Feature modules (routes/controller/service)
│   │   │   ├── auth/
│   │   │   ├── profile/
│   │   │   ├── jobs/
│   │   │   ├── applications/
│   │   │   ├── resumes/
│   │   │   ├── ai/
│   │   │   ├── dashboard/
│   │   │   └── notifications/
│   │   ├── utils/             # Logger, AppError, response helpers
│   │   └── types/             # Express augmentation, model types
│   ├── server.ts              # Entry point
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
├── .github/workflows/         # CI/CD pipelines
├── .husky/                    # Git hooks (pre-commit)
├── PROJECT.md                 # Complete technical blueprint
├── README.md                  # This file
├── .gitignore
└── package.json               # Root (Husky, lint-staged)
```

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** (local or cloud via Neon/Supabase)

## Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd ai-job-portal
```

### 2. Install dependencies

```bash
# Root (Husky + lint-staged)
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Environment setup

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your database URL, JWT secrets, etc.

# Frontend
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your API URL
```

### Required Backend Environment Variables

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` / `production` / `test` |
| `PORT` | Server port (default: 8080) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret (min 256-bit) |
| `REFRESH_TOKEN_SECRET` | Refresh token signing secret |
| `OPENAI_API_KEY` | OpenAI API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `SUPABASE_BUCKET` | Storage bucket name |
| `ALLOWED_ORIGIN` | Frontend URL for CORS |

### Required Frontend Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

## Running the Application

### Development

```bash
# Start backend (from /backend)
npm run dev
# Server starts on http://localhost:8080

# Start frontend (from /frontend)
npm run dev
# App starts on http://localhost:3000
```

### Production Build

```bash
# Backend
cd backend
npm run build
npm run start

# Frontend
cd frontend
npm run build
npm run start
```

### Linting & Formatting

```bash
# Lint
cd backend && npm run lint
cd frontend && npm run lint

# Format
cd backend && npm run format
cd frontend && npm run format
```

## API Health Check

```bash
curl http://localhost:8080/api/v1/health
# Response: { "success": true, "data": { "status": "ok", "timestamp": "..." } }
```

## Architecture Decisions

- **Monorepo:** Frontend and backend coexist for shared understanding, but deploy independently
- **Zod env validation:** Application fails fast on startup if required variables are missing
- **pg Pool with retry:** Exponential backoff reconnection for database resilience
- **Winston logging:** Structured JSON in production, colorized console in development
- **Standard API envelope:** All responses use `{ success, data, error, meta }` format
- **AppError class:** Structured error handling with HTTP status codes and machine-readable codes
- **Husky + lint-staged:** Pre-commit hooks enforce code quality automatically

## License

ISC
