# AI Job Application Portal — Production Deployment Guide

Follow this guide to deploy the entire platform in one sitting.

---

## 1. Environment Variable Inventory

Configure the following variables in your production platforms:

| Variable | Platform | Description | Example / Recommended Value |
|---|---|---|---|
| `NODE_ENV` | Backend | Runtime mode | `production` |
| `PORT` | Backend | Port container binds to | `8080` |
| `DATABASE_URL` | Backend | Neon PostgreSQL connection URI | `postgresql://neondb_owner:...@ep-...` |
| `JWT_ACCESS_SECRET` | Backend | Signing key for short access JWTs | Random 32+ character hex string |
| `JWT_REFRESH_SECRET` | Backend | Signing key for refresh sessions | Random 32+ character hex string |
| `AI_PROVIDER` | Backend | Active AI provider (`mock` \| `openai` \| `gemini`) | `gemini` |
| `OPENAI_API_KEY` | Backend | OpenAI API token (if selected) | `sk-proj-...` |
| `GEMINI_API_KEY` | Backend | Google Gemini API token (if selected) | `AIzaSy...` |
| `SUPABASE_URL` | Backend | Supabase project API gateway | `https://yourproject.supabase.co` |
| `SUPABASE_SERVICE_KEY`| Backend | Supabase Service Role Key (not anon key) | Long service role token |
| `SUPABASE_BUCKET` | Backend | Supabase bucket ID | `resumes` |
| `FRONTEND_URL` | Backend | Root domain of frontend | `https://ai-job-portal.vercel.app` |
| `BACKEND_URL` | Backend | Root domain of API | `https://ai-job-portal-api.railway.app` |
| `NEXT_PUBLIC_API_URL` | Frontend | Target API gateway path | `https://ai-job-portal-api.railway.app/api/v1` |

---

## 2. Platform Setup Checklists

### ✅ Step 1: Neon Database Setup
1. Create a project on [Neon Console](https://console.neon.tech).
2. Grab the pooled connection URI from the dashboard (enable pooled connections for high availability).
3. Connect using a client (or terminal) and execute the SQL schema in order:
   - Execute all files inside `backend/src/db/migrations/` sequentially (`001_` to `009_`), or run the migrations script:
     ```bash
     npm run db:migrate
     ```

### ✅ Step 2: Supabase Storage Setup
1. Log in to [Supabase Console](https://supabase.com).
2. Create a new project.
3. Navigate to **Storage** in the sidebar.
4. Create a new storage bucket named exactly `resumes`.
5. **CRITICAL**: Configure the bucket to be **Private** (signed URLs will govern access). Do NOT make it public.
6. Retrieve your **Project URL** and **service_role API Key** (from Settings -> API) to use as `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.

### ✅ Step 3: Railway (Backend) Deployment
1. Log in to [Railway](https://railway.app).
2. Create a new project -> Deploy from GitHub Repository -> select your repo -> select `backend` subdirectory.
3. In **Variables**, enter all variables listed in the Inventory above.
4. Railway will automatically detect `backend/railway.json` and build the container using Nixpacks.
5. In settings, under **Networking**, generate a public domain (e.g. `https://your-api.up.railway.app`). This is your `BACKEND_URL`.

### ✅ Step 4: Vercel (Frontend) Deployment
1. Log in to [Vercel](https://vercel.com).
2. Create a new project -> Import your Git Repository.
3. Set the **Root Directory** option to `frontend`.
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = (Your Railway backend domain + `/api/v1`)
5. Click **Deploy**. Vercel will build and assign a domain (e.g. `https://your-app.vercel.app`). This is your `FRONTEND_URL`.
6. Add the frontend Vercel URL to your Railway backend's `FRONTEND_URL` variable to complete the CORS handshake configuration.

---

## 3. GitHub Actions CI Configuration

To automate linting, compilation, and testing, configure the following secrets in your GitHub Repository settings (**Settings -> Secrets and Variables -> Actions**):

- `DATABASE_URL` (optional: CI automatically runs a local Postgres service, but you can override it if you want tests to target staging).
- Add any required API credentials if running live integration tests, although mock mode is default in CI.
