# AI-Powered Job Application Portal

An enterprise-grade job application platform with AI-powered resume analysis, smart job matching, and career advisory. Built as a monorepo with a Next.js frontend, Express.js backend, and PostgreSQL database.

---

## 🚀 Target Production Architecture

- **Frontend**: Vercel (Next.js Application)
- **Backend**: Railway (Express.js API Service)
- **Database**: Neon (PostgreSQL Database Instance)
- **Storage**: Supabase (Private Storage Bucket)
- **AI Engine**: OpenAI GPT-4o-mini & Google Gemini 1.5 Flash (via abstraction factory)

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 & Vanilla CSS
- **UI Components**: Shadcn/UI
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod Validation
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js (v20)
- **Framework**: Express.js 5
- **Language**: TypeScript (Strict Mode, Target ES2022)
- **Database**: PostgreSQL (via pooled `pg` driver)
- **Validation**: Zod
- **Logging**: Winston Structured JSON Logging
- **Security**: Helmet, CORS, bcrypt, JWT cookie-sessions
- **Rate Limiting**: Configurable `express-rate-limit`

---

## 🗂️ Project Directory Layout

```
/
├── frontend/                  # Next.js App
│   ├── src/
│   │   ├── app/               # Pages & routing
│   │   ├── components/        # Interactive components
│   │   ├── hooks/             # Fetch hook utilities
│   │   └── lib/               # API clients
│   ├── Dockerfile             # Frontend container config
│   └── vercel.json            # Vercel security headers
│
├── backend/                   # Express.js REST API
│   ├── src/
│   │   ├── config/            # Database & AI providers
│   │   ├── core/              # Metrics, AI factory, EventBus
│   │   └── modules/           # Feature endpoints
│   ├── Dockerfile             # Backend container config
│   └── railway.json           # Railway build configuration
│
├── .github/workflows/         # CI Pipeline (GitHub Actions)
├── docker-compose.yml         # Container orchestrator
├── README.md                  # Main documentation
└── PROJECT.md                 # Technical blueprint
```

---

## 📦 Local Installation & Setup

### 1. Prerequisites
- **Node.js** >= 20.0.0
- **Docker** & **Docker Compose** (optional)
- **PostgreSQL** (optional if running locally)

### 2. Dependency Installation
Run the following from the root workspace directory:
```bash
# Install workspace dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 3. Environment Setup
Create environment files by copying the templates:
```bash
# Backend Config
cp backend/.env.example backend/.env

# Frontend Config
cp frontend/.env.example frontend/.env.local
```

---

## 🐳 Running with Docker

You can run the entire stack locally in containers using Docker Compose.

### Build and Start Stack
```bash
# Starts frontend, backend, and a local PostgreSQL container
docker-compose --profile db-local up --build
```
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Database**: Port 5432 (local-postgres)

---

## 🧪 Running Integration Tests

Our backend includes a comprehensive 12-module integration test suite covering register, login, profile, resumes, applications, matching, and career advice.

### Run All Tests
Navigate to `/backend` and execute:
```bash
npm run test
```

---

## 📖 Deployment Documentation

For step-by-step guides and instructions on Neon, Supabase, Railway, and Vercel setup, please read our dedicated guides:
- [System Architecture](file:///d:/ai%20job%20app/docs/ARCHITECTURE.md)
- [API Reference](file:///d:/ai%20job%20app/docs/API.md)
- [Production Deployment Guide](file:///d:/ai%20job%20app/docs/DEPLOYMENT.md)

---

## 📝 License
This project is licensed under the ISC License.
