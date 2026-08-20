# Setup & Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Running the Application](#running-the-application)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Security Checklist](#security-checklist)
8. [Maintenance](#maintenance)
9. [Support](#support)

> **Deploying?** `DEPLOY.md` at the repository root is the authoritative,
> step-by-step procedure for Render + Vercel. This guide covers local
> development; its Production Deployment section is a summary of that document.

## Prerequisites

### Required Software

- **Python 3.11.9**: For backend development — pinned by `backend/.python-version`
  (`psycopg2-binary 2.9.7` has no wheel for Python 3.13)
- **uv**: Python dependency manager — `curl -LsSf https://astral.sh/uv/install.sh | sh`
  (it can install the pinned Python for you)
- **Node.js 18+**: For frontend development
- **npm** or **yarn**: Package manager
- **PostgreSQL**: Database (or use Supabase cloud)
- **Git**: Version control

### Required Accounts

- **Supabase Account**: For PostgreSQL database (or self-hosted PostgreSQL)
- **NVIDIA Build Account**: For NVIDIA API key ([Get API Key](https://build.nvidia.com/))
- **Render Account** and **Vercel Account**: For deployment — see `DEPLOY.md`

## Local Development Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd lolokely-application
```

### Step 2: Backend Setup

#### 2.1 Navigate to Backend Directory

```bash
cd backend
```

#### 2.2 Install Dependencies

```bash
uv sync --frozen
```

uv creates `backend/.venv` from `uv.lock`, on the Python version pinned in
`.python-version`. There is no virtualenv to create or activate by hand and no
`requirements.txt` — prefix commands with `uv run` and uv uses that environment.

`--frozen` installs exactly what the lockfile says and fails rather than silently
re-resolving. To change a dependency, edit `pyproject.toml`, run `uv lock`, and
commit the updated `uv.lock`.

#### 2.3 Create Environment File

Create a `.env` file in the `backend/` directory:

Start from the template, which is the authoritative list:

```bash
cp .env.example .env
```

```env
# Database Configuration — Supabase Supavisor (transaction pooler)
# The pooler user is postgres.<project-ref>, NOT plain postgres
DB_USER=postgres.your_project_ref
DB_PASSWORD=your_database_password
DB_HOST=aws-0-<region>.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres

# Connection pool — keep DB_POOL_MAX >= the gunicorn threads per worker
DB_POOL_MIN=1
DB_POOL_MAX=5

# CORS — required; the app raises RuntimeError at startup if unset
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Security Keys
SECRET_KEY=your-secret-key-here-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-here-change-in-production

# NVIDIA API (LangChain ChatNVIDIA)
NVIDIA_API_KEY=nvapi-your_key_here
# Optional: NVIDIA_TEXT_MODELS, NVIDIA_VISION_MODEL, NVIDIA_TEMPERATURE, etc.
```

**Generate Secret Keys:**
```bash
# Generate SECRET_KEY
uv run python -c "import secrets; print(secrets.token_hex(32))"

# Generate JWT_SECRET_KEY
uv run python -c "import secrets; print(secrets.token_hex(32))"
```

### Step 3: Frontend Setup

#### 3.1 Navigate to Frontend Directory

```bash
cd ../frontend
```

#### 3.2 Install Dependencies

```bash
npm install
```

#### 3.3 Create Environment File

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### Step 4: Database Setup

#### 4.1 Create Database

If using Supabase:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Note your database credentials

If using local PostgreSQL:
```bash
createdb lolokely_db
```

#### 4.2 Run Database Schema

**Option 1: Using psql**
```bash
psql -h your_host -U your_user -d your_database -f schemas/db.sql
```

**Option 2: Using Supabase SQL Editor**
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `backend/schemas/db.sql`
3. Paste and execute

**Option 3: Using Database Client**
- Use pgAdmin, DBeaver, or similar tool
- Execute the SQL from `backend/schemas/db.sql`

#### 4.3 Verify Database Setup

Check that all tables are created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Expected tables:
- users
- tasks
- subtasks
- task_assignments
- subtask_assignments
- social_posts
- user_post_preferences
- notifications

## Environment Configuration

### Backend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DB_USER` | Database username | Yes | `postgres.abcdefghijklm` |
| `DB_PASSWORD` | Database password | Yes | `your_password` |
| `DB_HOST` | Database host | Yes | `aws-0-eu-west-3.pooler.supabase.com` |
| `DB_PORT` | Database port | Yes | `6543` (pooler) / `5432` (direct) |
| `DB_NAME` | Database name | Yes | `postgres` |
| `DB_POOL_MIN` | Pool minimum | No | `1` |
| `DB_POOL_MAX` | Pool maximum — keep `>=` gunicorn threads | No | `5` |
| `CORS_ORIGINS` | Comma-separated frontend origins | Yes | `http://localhost:5173` |
| `CORS_ALLOW_VERCEL_PREVIEWS` | Allow every `*.vercel.app` origin | No | empty / `true` |
| `SECRET_KEY` | Flask secret key | Yes | `generated_key` |
| `JWT_SECRET_KEY` | JWT secret key | Yes | `generated_key` |
| `NVIDIA_API_KEY` | NVIDIA API Catalog key | Yes | `nvapi-...` |

### Frontend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_API_URL` | Backend API URL | Yes | `http://localhost:5000/api` |

### Getting NVIDIA API Key

1. Go to [NVIDIA Build](https://build.nvidia.com/)
2. Sign in and create an API key
3. Copy the key (starts with `nvapi-`)
4. Add it to your `.env` file

**Note:** Keep your API key secure and never commit it to version control.

## Running the Application

### Development Mode

#### Start Backend Server

```bash
cd backend
uv run python app.py
```

Backend will run on `http://localhost:5000`. Check it with
`curl http://localhost:5000/healthz`, which answers `{"status": "ok"}`.

To run the tests: `uv run pytest`.

#### Start Frontend Server

In a new terminal:

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:5173`

#### Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

### Using Setup Script

If a `setup.sh` script is available:

```bash
chmod +x setup.sh
./setup.sh
```

## Production Deployment

### Backend Deployment

**This project deploys to Render, and `DEPLOY.md` at the repository root is the
authoritative procedure** — exact settings, the full environment variable table,
the Supabase pooler credentials, and the expected failure modes. What follows is
a summary only; where the two disagree, `DEPLOY.md` wins.

| Setting | Value |
|---|---|
| Runtime | Python 3 (native, not Docker) |
| Root Directory | `backend` |
| Branch | `main` |
| Build Command | `uv sync --frozen --no-dev` |
| Start Command | `uv run --no-dev gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --worker-class gthread --timeout 120` |
| Health Check Path | `/healthz` |

Three details that are easy to get wrong:

- **`wsgi:app`, not `app:create_app()`.** `app.py` builds the application only
  under `if __name__ == '__main__'`, so there is no module-level `app` for a WSGI
  server to import. `backend/wsgi.py` provides it.
- **`--no-dev` on both commands.** `uv run` re-syncs before executing and
  includes the dev group by default, so putting it only on the build command
  means pytest is reinstalled at every boot.
- **`PORT` is the platform's HTTP port**, not the database port. The Postgres
  port is `DB_PORT`; `db.py` raises an explicit error if you confuse the two.

Running under any other host (Heroku, Railway, Fly, a plain VM) works the same
way — the WSGI entrypoint and the gunicorn flags above are not Render-specific.

### Frontend Deployment

The frontend deploys to Vercel as a static Vite build. Again, `DEPLOY.md` holds
the authoritative settings.

```bash
cd frontend
npm run build     # produces dist/
```

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Production Branch | `main` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Two requirements for any static host, not only Vercel:

- **SPA fallback.** The app uses `react-router-dom`, so a direct hit on
  `/dashboard` must serve `index.html` rather than 404. `frontend/vercel.json`
  does this on Vercel; on another host, configure the equivalent rewrite.
- **`VITE_API_URL` must be set at build time**, on Production *and* Preview
  environments. It is baked into the bundle — setting it afterwards has no
  effect without a rebuild. The build fails with an explicit message if it is
  missing (the check lives in `frontend/vite.config.js`).

### Environment Variables in Production

`DEPLOY.md` carries the full table — every variable, which service it belongs to
(Render or Vercel), whether it is secret, and an example value. The essentials:

#### Backend (Render)

Set them in the service's **Environment** tab. Required: `CORS_ORIGINS`,
`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `SECRET_KEY`,
`JWT_SECRET_KEY`, and `NVIDIA_API_KEY` for the AI routes.

`CORS_ORIGINS` must hold the deployed frontend URL. It is read once at startup,
so changing it requires a redeploy to take effect.

#### Frontend (Vercel)

Only `VITE_API_URL`, set on **Production and Preview**, pointing at the backend
with the `/api` suffix:

```
VITE_API_URL=https://<your-service>.onrender.com/api
```

It is inlined into the bundle at build time, so a change requires a rebuild.

**Anything prefixed `VITE_` is public** — it ships in plaintext inside the
JavaScript delivered to browsers. Never put a secret behind that prefix;
`NVIDIA_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` belong on Render only.

#### Deployment order

The two services reference each other, so break the cycle: deploy the backend
first with a placeholder `CORS_ORIGINS`, deploy the frontend using the resulting
Render URL, then set `CORS_ORIGINS` to the Vercel URL and redeploy the backend.

### Database Setup in Production

1. **Use Managed PostgreSQL:**
   - Supabase (recommended)
   - AWS RDS
   - Google Cloud SQL
   - Azure Database for PostgreSQL

2. **Connection String:**
   - Use connection pooling
   - Enable SSL/TLS
   - Use strong passwords

3. **Backup Strategy:**
   - Automated daily backups
   - Point-in-time recovery
   - Test restore procedures

### SSL/TLS Configuration

On Render and Vercel this is handled for you: both terminate TLS and serve HTTPS
on their default domains, including for custom domains added through their
dashboards. There is no certificate to obtain or renew, and no HTTP→HTTPS
redirect to configure.

The database connection is separately encrypted — `db.py` always sets
`sslmode="require"`.

### Reverse Proxy Setup (self-hosting only)

Not needed on Render or Vercel — the platform is the proxy. gunicorn binds the
port given in `$PORT` and the platform routes to it.

If you self-host instead, put a reverse proxy in front of gunicorn and terminate
TLS there:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

In that setup you also serve the frontend's `dist/` yourself, with the SPA
fallback described under Frontend Deployment.

## Troubleshooting

### Common Issues

#### Backend Issues

**1. Database Connection Error**
```
Error: could not connect to server
```
**Solution:**
- Check database credentials in `.env`
- Verify database is running
- Check firewall/network settings
- Verify SSL mode if using Supabase

**2. Module Not Found Error**
```
ModuleNotFoundError: No module named 'flask'
```
**Solution:**
- Run commands through `uv run` (`uv run python app.py`, `uv run pytest`), which
  uses `backend/.venv` automatically
- Re-sync the environment: `uv sync --frozen`
- If it only affects pytest, the environment was last synced with `--no-dev`;
  `uv sync --frozen` restores the dev group

**3. JWT Token Error**
```
Error: Invalid token
```
**Solution:**
- Check `JWT_SECRET_KEY` is set correctly
- Verify token is being sent in Authorization header
- Check token expiration settings

**4. NVIDIA API Error**
```
Error: NVIDIA API key not configured
```
**Solution:**
- Verify `NVIDIA_API_KEY` in `.env`
- Check API key is valid and starts with `nvapi-`
- Confirm models are available on https://build.nvidia.com/

#### Frontend Issues

**1. API Connection Error**
```
Network Error: Failed to fetch
```
**Solution:**
- Check `VITE_API_URL` in `.env`
- Verify backend server is running
- Check CORS configuration
- Verify network connectivity

**2. Build Errors**
```
Error: Cannot find module
```
**Solution:**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Check Node.js version compatibility

**3. Routing Issues**
```
404 on page refresh
```
**Solution:**
- Configure server to serve `index.html` for all routes
- Use history mode in React Router
- Configure redirects in hosting platform

### Debugging Tips

1. **Check Logs:**
   - Backend: Check console output
   - Frontend: Check browser console
   - Database: Check database logs

2. **Verify Environment Variables:**
   ```bash
   # Backend
   python -c "from dotenv import load_dotenv; import os; load_dotenv(); print(os.getenv('SECRET_KEY'))"
   
   # Frontend
   echo $VITE_API_URL
   ```

3. **Test Database Connection:**
   ```python
   from db import get_connection
   conn = get_connection()
   print("Connected successfully!")
   conn.close()
   ```

4. **Test API Endpoints:**
   ```bash
   # Test health endpoint (if available)
   curl http://localhost:5000/api/auth/me
   
   # Test with token
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/tasks/
   ```

## Security Checklist

### Before Deployment

- [ ] Change default secret keys
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for production domain only
- [ ] Set up database backups
- [ ] Enable database SSL connections
- [ ] Use environment variables (never commit secrets)
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting (if needed)
- [ ] Review and update dependencies
- [ ] Enable security headers
- [ ] Set up error tracking (Sentry, etc.)

## Maintenance

### Regular Tasks

1. **Update Dependencies:**
   ```bash
   # Backend — edit the pin in pyproject.toml, then re-lock
   cd backend
   uv lock --upgrade-package <package_name>
   uv sync --frozen
   uv run pytest          # confirm nothing broke
   # commit the updated uv.lock

   # Frontend
   cd ../frontend
   npm outdated
   npm update
   ```

   Always commit `backend/uv.lock` alongside `pyproject.toml`: the deploy runs
   `uv sync --frozen`, which installs exactly what the lockfile pins and fails
   rather than re-resolving.

2. **Database Maintenance:**
   - Regular backups
   - Monitor database size
   - Optimize queries
   - Review indexes

3. **Security Updates:**
   - Monitor security advisories
   - Update dependencies regularly
   - Review access logs
   - Audit user permissions

## Support

For additional help:
- Check the main [README.md](../README.md)
- Review other documentation files
- Check GitHub issues
- Contact the development team

