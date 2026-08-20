# Render + Vercel Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Flask backend deployable on Render (native Python runtime + uv + gunicorn) and the Vite/React frontend deployable on Vercel, with locked dependencies and a configuration that fails at startup rather than in production.

**Architecture:** Render native runtime (no Docker — no system dependency in the stack). `uv.lock` in `backend/` locks the full dependency tree; gunicorn serves `wsgi:app`; the database stays Supabase Postgres through the Supavisor pooler. The frontend is a static Vite build with an SPA rewrite.

**Tech Stack:** Python 3.11.9, uv, Flask 2.3.3, gunicorn, psycopg2-binary, Vite 7, React 19, Vercel, Render.

**Spec:** `docs/superpowers/specs/2026-08-19-deployment-render-vercel-design.md`

## Global Constraints

- **Block 1 of the spec (connection leak in `backend/db.py`) is already done and verified.** Do not reimplement it. `db.py` exposes `get_connection()` as a *context manager* and `close_pool()`.
- **Do not modify any file in `backend/routes/`, `backend/services/` or `backend/utils/`.** Those 65 DB call sites must stay intact; their appearance in a diff is a task failure.
- Python version: **3.11.9** exactly. Otherwise Render uses Python 3.13, on which `psycopg2-binary==2.9.7` has no wheel and the build fails.
- **Do not bump any version** of Flask / Werkzeug / marshmallow. We lock what exists as it runs locally.
- `DB_POOL_MAX` must stay **≥ the number of gunicorn threads per worker** (psycopg2 raises `PoolError` instead of waiting).
- Tests live in `backend/tests/` and run with `uv run pytest` (the pre-uv `backend/venv` has been deleted). `backend/tests/test_db.py` already exists: **14 tests, all green**. Do not break it.
- pytest is a **development-only** dependency. The Render build command must therefore be `uv sync --frozen --no-dev`, otherwise uv installs pytest in production.
- Deliberately narrow test scope: `db.py` and the configuration of `create_app()` (CORS guard, `/healthz`). **Do not** write tests for the business routes nor for the AI services — out of scope, see "Testing strategy" in the spec.
- A test must fail when the behavior it describes is broken. After writing a test, run it once against the unmodified code to see it fail.
- All backend commands run from `backend/`.
- Render root directory = `backend`, Vercel root directory = `frontend`, production branch = `develop`.

---

### Task 1: uv migration + gunicorn + Python pin — ✅ DONE

Replaces `requirements.txt` with a reproducible lockfile and adds the production WSGI server. This is the foundation: the following tasks use `uv run`.

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/uv.lock` (generated, to be committed)
- Create: `backend/.python-version`
- Delete: `backend/requirements.txt`

**Interfaces:**
- Consumes: nothing.
- Produces: a `backend/.venv` environment managed by uv, containing `gunicorn`. Tasks 2 and 3 run their checks through `uv run`.

- [x] **Step 1: Check that uv is installed**

Run: `uv --version`
Expected: a version number. Otherwise: `curl -LsSf https://astral.sh/uv/install.sh | sh`

- [x] **Step 2: Create `backend/.python-version`**

```
3.11.9
```

This file is read both by Render and by uv, which keeps the two consistent. On Render, the Python version **is not configured through uv**: neither `requires-python` nor `uv python pin` drives the runtime.

- [x] **Step 3: Create `backend/pyproject.toml`**

Versions taken from the existing local venv (`./venv/bin/pip freeze`), including `Werkzeug` which was absent from `requirements.txt` even though Flask 2.3.3 only declares `>=2.3.7`.

```toml
[project]
name = "lolokely-backend"
version = "0.1.0"
description = "Lolokely Flask backend"
requires-python = "==3.11.*"
dependencies = [
    "Flask==2.3.3",
    "Werkzeug==3.1.3",
    "Flask-Cors==4.0.0",
    "Flask-JWT-Extended==4.5.3",
    "Flask-Bcrypt==1.0.1",
    "bcrypt==5.0.0",
    "python-dotenv==1.0.0",
    "psycopg2-binary==2.9.7",
    "marshmallow==3.20.1",
    "email-validator==2.0.0",
    "langchain-core==1.5.3",
    "langchain-nvidia-ai-endpoints==1.4.3",
    "gunicorn==23.0.0",
]

[dependency-groups]
dev = [
    "pytest==9.1.1",
]

[tool.uv]
package = false

[tool.pytest.ini_options]
testpaths = ["tests"]
```

pytest is in the `dev` group: it will not be installed on Render thanks to the `--no-dev` in the build command.

`package = false` tells uv the project is not an installable library — the code is imported from the working directory, as it is today.

- [x] **Step 4: Generate the lockfile and install**

Run: `cd backend && uv lock && uv sync --frozen`
Expected: creation of `backend/uv.lock` and `backend/.venv`, with no resolution error.

If `gunicorn==23.0.0` does not resolve, replace it with the latest stable version returned by `uv add gunicorn`, then rerun `uv lock`.

- [x] **Step 5: Check that every dependency imports**

Run:
```bash
cd backend && uv run python -c "
from importlib.metadata import version
import flask, werkzeug, psycopg2, marshmallow, flask_jwt_extended, flask_bcrypt, flask_cors
import langchain_core, langchain_nvidia_ai_endpoints, gunicorn
print('flask', version('flask'))
print('werkzeug', version('werkzeug'))
print('all imports OK')
"
```
Expected:
```
flask 2.3.3
werkzeug 3.1.3
all imports OK
```

Use `importlib.metadata.version`, not `werkzeug.__version__`: Werkzeug 3.1 dropped that
attribute, so reading it raises `AttributeError` even when the import itself succeeded.

- [x] **Step 6: Check that the Python version is the expected one**

Run: `cd backend && uv run python --version`
Expected: `Python 3.11.9`

- [x] **Step 7: Check that the existing test suite passes under uv**

Run: `cd backend && uv run pytest -q`
Expected: `14 passed`

If pytest is not found, the `dev` group has not been synced: rerun `uv sync --frozen`.

- [x] **Step 8: Check that `--no-dev` does exclude pytest (what Render will do)**

Run:
```bash
cd backend && uv sync --frozen --no-dev && uv run --no-dev python -c "
import importlib.util
print('pytest absent (correct)' if importlib.util.find_spec('pytest') is None else 'FAILURE: pytest installed in prod')
"
uv sync --frozen
```
Expected: `pytest absent (correct)`, then restoration of the full environment.

The `--no-dev` on `uv run` is required, not decorative: `uv run` re-syncs the environment
before executing, so without it uv reinstalls pytest and the check reports a false failure.

- [x] **Step 9: Delete `requirements.txt`**

Run: `cd backend && rm requirements.txt`

- [x] **Step 10: Check that `.venv` is not tracked by git**

Run: `git status --short backend/ | grep -c '.venv' || echo "0 tracked .venv file"`
Expected: `0 tracked .venv file`

If `.venv` files show up, add `backend/.venv` to the root `.gitignore` (task 4 will do it anyway, but do not commit `.venv` here).

- [x] **Step 11: Commit**

```bash
git add backend/pyproject.toml backend/uv.lock backend/.python-version
git add -u backend/requirements.txt
git commit -m "build: migrate backend deps to uv with pinned lockfile and gunicorn"
```

---

### Task 2: WSGI entrypoint + /healthz endpoint

Without a module-level `app` object, `gunicorn wsgi:app` fails. We also add the health check that Render will poll.

**Files:**
- Create: `backend/wsgi.py`
- Create: `backend/tests/test_app.py`
- Modify: `backend/app.py` (imports + route registration in `create_app`)

**Interfaces:**
- Consumes: the uv environment from task 1.
- Produces: `backend/wsgi.py` exposing `app` (Flask instance). Route `GET /healthz` → `200 {"status": "ok"}`, and `GET /healthz?db=1` → `200 {"status": "ok", "db": "ok"}` or `503 {"status": "error", "db": "<message>"}`. The `env` and `client` fixtures defined here are reused by task 3.

- [ ] **Step 1: Create `backend/wsgi.py`**

```python
from app import create_app

app = create_app()
```

`app.py` keeps its `if __name__ == '__main__'` block: it remains the development entrypoint.

- [ ] **Step 2: Write the failing tests**

Create `backend/tests/test_app.py`:

```python
"""Application configuration: /healthz endpoint and CORS guard.

None of these tests touch the database or the network. The required variables
are set explicitly so the suite runs without a .env file.
"""

import contextlib

import pytest

import app as appmod

REQUIRED_ENV = {
    "SECRET_KEY": "test-secret",
    "JWT_SECRET_KEY": "test-jwt-secret",
    "CORS_ORIGINS": "http://localhost:5173",
}


@pytest.fixture
def env(monkeypatch):
    for key, value in REQUIRED_ENV.items():
        monkeypatch.setenv(key, value)
    monkeypatch.delenv("CORS_ALLOW_VERCEL_PREVIEWS", raising=False)
    return monkeypatch


@pytest.fixture
def client(env):
    return appmod.create_app().test_client()


@contextlib.contextmanager
def _unreachable_database():
    raise RuntimeError("could not connect to server")
    yield  # pragma: no cover


def test_healthz_returns_ok(client):
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_healthz_does_not_touch_the_database_by_default(client, monkeypatch):
    """A health check depending on Supabase would make a healthy backend
    restart in a loop during a provider outage."""
    import db as dbmod

    monkeypatch.setattr(dbmod, "get_connection", _unreachable_database)

    assert client.get("/healthz").status_code == 200


def test_healthz_deep_check_reports_database_failure(client, monkeypatch):
    import db as dbmod

    monkeypatch.setattr(dbmod, "get_connection", _unreachable_database)

    response = client.get("/healthz?db=1")

    assert response.status_code == 503
    assert response.get_json()["status"] == "error"
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `cd backend && uv run pytest tests/test_app.py -q`
Expected: 3 failures. `test_healthz_returns_ok` fails on `assert 404 == 200` — the route does not exist yet.

If the tests **pass** at this stage, a `/healthz` route already exists: check before continuing.

- [ ] **Step 4: Add the `request` import in `backend/app.py`**

Replace line 1:

```python
from flask import Flask
```

with:

```python
from flask import Flask, request
```

- [ ] **Step 5: Add the `/healthz` route in `create_app`**

In `backend/app.py`, just before the `# Error handlers` block, insert:

```python
    # Health check (no auth): does not touch the database by default, otherwise
    # a Supabase outage would make a healthy backend restart in a loop.
    @app.route('/healthz')
    def healthz():
        if request.args.get('db') != '1':
            return {'status': 'ok'}, 200
        try:
            from db import get_connection
            with get_connection() as conn, conn.cursor() as cur:
                cur.execute('SELECT 1')
                cur.fetchone()
        except Exception as exc:
            return {'status': 'error', 'db': str(exc)}, 503
        return {'status': 'ok', 'db': 'ok'}, 200
```

The `db` import is local to the function, for two reasons: the module must not be imported at startup if the DB configuration is missing, and it is what makes the tests' `monkeypatch` effective.

- [ ] **Step 6: Rerun the tests to see them pass**

Run: `cd backend && uv run pytest -q`
Expected: `17 passed` (14 from `test_db.py` + 3 new ones).

- [ ] **Step 7: Check the real startup under gunicorn**

The tests use the Flask test client; this step additionally validates the production command itself.

Run (in one terminal):
```bash
cd backend && uv run gunicorn wsgi:app --bind 0.0.0.0:5000 \
  --workers 2 --threads 4 --worker-class gthread --timeout 120
```
Expected: `[INFO] Booting worker with pid: ...` lines, with no traceback.

- [ ] **Step 8: Check `/healthz?db=1` against the real database**

Run (in a second terminal): `curl -s -w '\n%{http_code}\n' 'http://localhost:5000/healthz?db=1'`
Expected:
```
{"db":"ok","status":"ok"}
200
```

Then stop gunicorn (Ctrl-C).

- [ ] **Step 9: Check that no business route was touched**

Run: `git status --short backend/routes backend/services backend/utils`
Expected: no output.

- [ ] **Step 10: Commit**

```bash
git add backend/wsgi.py backend/app.py backend/tests/test_app.py
git commit -m "feat: add WSGI entrypoint and tested /healthz endpoint for Render"
```

---

### Task 3: CORS_ORIGINS guard + Vercel previews

`backend/app.py:41` does `os.getenv('CORS_ORIGINS').split(',')` with no guard: missing variable → `AttributeError` at boot, with a message that does not point to the cause.

**Files:**
- Modify: `backend/app.py` (`re` import + CORS block)
- Modify: `backend/tests/test_app.py` (add the CORS tests)

**Interfaces:**
- Consumes: `create_app()` and the `env` / `client` fixtures from task 2.
- Produces: an optional `CORS_ALLOW_VERCEL_PREVIEWS` environment variable (`1`/`true`/`yes` to enable, disabled by default), consumed by task 6 in `DEPLOY.md`.

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_app.py`:

```python
PREVIEW_ORIGIN = "https://lolokely-git-feat-abc123.vercel.app"


def _preflight(client, origin):
    return client.options(
        "/api/auth/login",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
        },
    )


def test_missing_cors_origins_fails_fast(env):
    env.setenv("CORS_ORIGINS", "")

    with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
        appmod.create_app()


def test_cors_origins_with_only_separators_fails_fast(env):
    env.setenv("CORS_ORIGINS", " , , ")

    with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
        appmod.create_app()


def test_configured_origin_is_allowed(client):
    response = _preflight(client, "http://localhost:5173")

    assert response.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"


def test_vercel_preview_origin_is_rejected_by_default(client):
    """Opening up the whole Vercel platform is a choice, not a default."""
    response = _preflight(client, PREVIEW_ORIGIN)

    assert "Access-Control-Allow-Origin" not in response.headers


def test_vercel_preview_origin_is_allowed_when_enabled(env):
    env.setenv("CORS_ALLOW_VERCEL_PREVIEWS", "true")
    client = appmod.create_app().test_client()

    response = _preflight(client, PREVIEW_ORIGIN)

    assert response.headers.get("Access-Control-Allow-Origin") == PREVIEW_ORIGIN
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `cd backend && uv run pytest tests/test_app.py -q`
Expected: `test_missing_cors_origins_fails_fast` fails on `AttributeError: 'NoneType' object has no attribute 'split'` instead of the expected `RuntimeError` — that is exactly the defect to fix. `test_vercel_preview_origin_is_allowed_when_enabled` also fails (variable not implemented).

- [ ] **Step 3: Add the `re` import in `backend/app.py`**

After `import os`, add:

```python
import re
```

- [ ] **Step 4: Replace the CORS block**

Replace:

```python
    # CORS: allow frontend origins (comma-separated via CORS_ORIGINS)
    cors_origins = [
        origin.strip()
        for origin in os.getenv('CORS_ORIGINS').split(',')
        if origin.strip()
    ]
```

with:

```python
    # CORS: allow frontend origins (comma-separated via CORS_ORIGINS)
    cors_raw = os.getenv('CORS_ORIGINS')
    if not cors_raw:
        raise RuntimeError('CORS_ORIGINS must be set in the environment')
    cors_origins = [origin.strip() for origin in cors_raw.split(',') if origin.strip()]
    if not cors_origins:
        raise RuntimeError('CORS_ORIGINS must contain at least one origin')

    # Vercel preview URLs change on every deployment and cannot be listed in
    # advance. Disabled by default: opening up the whole Vercel platform is a
    # choice, not a reasonable default.
    if os.getenv('CORS_ALLOW_VERCEL_PREVIEWS', '').strip().lower() in ('1', 'true', 'yes'):
        cors_origins.append(re.compile(r'^https://.*\.vercel\.app$'))
```

- [ ] **Step 5: Rerun the tests to see them pass**

Run: `cd backend && uv run pytest -q`
Expected: `22 passed` (14 + 3 + 5).

- [ ] **Step 6: Check that the app starts with the real configuration**

Run: `cd backend && uv run python -c "from wsgi import app; print('boot OK')"`
Expected: `boot OK`

This step uses the local `.env`, where the tests set their own variables — so it verifies that the real configuration does satisfy the new guard.

- [ ] **Step 7: Commit**

```bash
git add backend/app.py backend/tests/test_app.py
git commit -m "fix: fail fast on missing CORS_ORIGINS and support Vercel preview origins"
```

---

### Task 4: DB_* environment variables + repo hygiene

Aligns `.env.example` with the canonical names introduced in `db.py`, switches to the Supabase pooler, and closes the `.gitignore` gap.

**Files:**
- Modify: `backend/.env.example`
- Modify: `.gitignore`
- Modify: `backend/.env` (local, untracked — to be done manually, outside the commit)

**Interfaces:**
- Consumes: the variable names read by `backend/db.py` (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_POOL_MIN`, `DB_POOL_MAX`) and by `backend/app.py` (`CORS_ORIGINS`, `CORS_ALLOW_VERCEL_PREVIEWS`).
- Produces: the reference list of variables, reused as-is by `DEPLOY.md` in task 6.

- [ ] **Step 1: Fix the root `.gitignore`**

`.pytest_cache/` was already added to `.gitignore` along with the test suite. What remains is handling the `.env` files.

Replace the `.env` line with:

```
.env*
!.env.example
```

And add, under `backend/venv`:

```
backend/.venv
```

`.env.local`, `.env.production` and `.env.render` were covered nowhere, neither at the root nor in `backend/`.

- [ ] **Step 2: Check that the rule does catch the variants**

Run:
```bash
touch .env.local backend/.env.production
git status --short | grep -E '\.env' || echo "NO .env file visible to git"
rm .env.local backend/.env.production
```
Expected: `NO .env file visible to git`

- [ ] **Step 3: Check that `.env.example` stays tracked**

Run: `git check-ignore -v backend/.env.example || echo "backend/.env.example NOT ignored (correct)"`
Expected: `backend/.env.example NOT ignored (correct)`

- [ ] **Step 4: Rewrite `backend/.env.example`**

```bash
# CORS (comma-separated frontend origins)
# Production: put the Vercel URL here, e.g. https://lolokely.vercel.app
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
# Optional: allow all *.vercel.app preview URLs (1/true/yes)
CORS_ALLOW_VERCEL_PREVIEWS=

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database — Supabase Supavisor (transaction pooler)
# WARNING: do NOT use the PORT variable, reserved by Render for the service's
# HTTP port. The Postgres port is DB_PORT.
# Pooler: DB_PORT=6543 and DB_USER=postgres.<project-ref>
# Direct connection: DB_PORT=5432 and DB_USER=postgres
DB_USER=postgres.your_project_ref
DB_PASSWORD=your_database_password
DB_HOST=aws-0-<region>.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres

# Connection pool (per gunicorn process)
# DB_POOL_MAX must stay >= the number of threads per worker
DB_POOL_MIN=1
DB_POOL_MAX=5

# Security (generate with: python -c "import secrets; print(secrets.token_hex(32))")
SECRET_KEY=your-secret-key-here-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-here-change-in-production
# false = tokens never expire; set an integer for expiry in minutes (e.g. 60 = 1 hour)
JWT_ACCESS_TOKEN_EXPIRES=60

# NVIDIA BUILD API
NVIDIA_API_KEY=nvapi-your_key_here
NVIDIA_TEXT_MODELS=nvidia/nemotron-3-ultra-550b-a55b,minimaxai/minimax-m3,z-ai/glm-5.2,moonshotai/kimi-k2.6,stepfun-ai/step-3.7-flash
# Optional: NVIDIA_VISION_MODEL, NVIDIA_TEMPERATURE
```

- [ ] **Step 5: Audit git history for committed secrets**

Run: `git log --all --full-history --oneline -- backend/.env frontend/.env.local`
Expected: no output.

If commits show up: the Supabase and NVIDIA keys are to be considered compromised and rotated. History rewriting is a separate subject, to be decided separately — note it in `DEPLOY.md` in task 6, do not start it here.

- [ ] **Step 6: Check that no variable read by the code is missing from `.env.example`**

Run:
```bash
grep -rho "os.getenv(['\"][A-Z_]*['\"]" backend/app.py backend/db.py backend/services backend/routes backend/utils \
  | sed "s/.*[\"']\([A-Z_]*\)[\"'].*/\1/" | sort -u > /tmp/used.txt
grep -o '^[A-Z_]*=' backend/.env.example | tr -d '=' | sort -u > /tmp/documented.txt
comm -23 /tmp/used.txt /tmp/documented.txt
```
Expected: no output (every variable read by the code is documented).

The legacy names (`USER_DB`, `PASSWORD_DB`, `HOST`, `PORT`, `DBNAME`) will appear in `used.txt` because `db.py` still accepts them as a fallback — that is expected. If they show up here, ignore them explicitly rather than reintroducing them into `.env.example`.

- [ ] **Step 7: Update the local `backend/.env` (outside the commit)**

Manually rename in `backend/.env`: `USER_DB`→`DB_USER`, `PASSWORD_DB`→`DB_PASSWORD`, `HOST`→`DB_HOST`, `PORT`→`DB_PORT`, `DBNAME`→`DB_NAME`. The `db.py` fallback makes this step non-blocking locally, but it avoids keeping two conventions around.

Verification:
```bash
cd backend && uv run python -c "
from db import get_connection, close_pool
with get_connection() as conn, conn.cursor() as cur:
    cur.execute('SELECT 1'); print('DB OK ->', cur.fetchone()[0])
close_pool()
"
```
Expected: `DB OK -> 1`

- [ ] **Step 8: Commit**

```bash
git add .gitignore backend/.env.example
git commit -m "chore: document DB_* env vars, Supabase pooler and tighten .env ignore rules"
```

---

### Task 5: Frontend — Vercel SPA rewrite + VITE_API_URL guard

**Files:**
- Create: `frontend/vercel.json`
- Modify: `frontend/src/services/api.js:3`
- Modify: `frontend/.env.example`

**Interfaces:**
- Consumes: nothing from the backend (the contract is the `VITE_API_URL` URL).
- Produces: a `frontend/dist` static build served by Vercel with an SPA fallback.

- [ ] **Step 1: Create `frontend/vercel.json`**

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Existing static files (`/assets/*`) are served before the rewrites: only routes with no matching file fall back to `index.html`, which is exactly the behavior wanted for `react-router-dom`.

- [ ] **Step 2: Add the guard in `frontend/src/services/api.js`**

Replace line 3:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL;
```

with:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    'VITE_API_URL is not defined. Set it in frontend/.env.local for local dev, ' +
      'or in the Vercel project settings (Production and Preview) for deploys.',
  );
}
```

Without this guard, `baseURL` is `undefined`, axios falls back to relative URLs, and the calls go to the Vercel domain where they receive `index.html` — HTML where JSON is expected, with symptoms very far from the cause.

- [ ] **Step 3: Complete `frontend/.env.example`**

```
# API base URL, including the /api suffix
# Local: http://localhost:5000/api
# Production: https://<your-service>.onrender.com/api
VITE_API_URL=http://localhost:5000/api
```

- [ ] **Step 4: Check that the build passes with the variable defined**

Run: `cd frontend && npm run build`
Expected: `✓ built in ...`, and creation of `frontend/dist/index.html`.

- [ ] **Step 5: Check that the build fails explicitly without the variable**

Run:
```bash
cd frontend && mv .env.local .env.local.bak && VITE_API_URL= npm run build; \
  mv .env.local.bak .env.local
```
Expected: the build fails with the message `VITE_API_URL is not defined...`.

If the build **succeeds**, Vite inlined a value from another `.env` file — check which one before continuing.

- [ ] **Step 6: Check that a deep route renders locally**

Run:
```bash
cd frontend && npm run preview
```
Then open `http://localhost:4173/login` directly (not through a link) and reload.
Expected: the page loads, no 404.

`vite preview` already applies an SPA fallback; this test validates the router, while `vercel.json` brings the same behavior on the Vercel side. Stop the server afterwards.

- [ ] **Step 7: Commit**

```bash
git add frontend/vercel.json frontend/src/services/api.js frontend/.env.example
git commit -m "feat: add Vercel SPA rewrite and fail fast on missing VITE_API_URL"
```

---

### Task 6: DEPLOY.md

A single document making it possible to redo the deployment from scratch without rereading the code.

**Files:**
- Create: `DEPLOY.md`

**Interfaces:**
- Consumes: the settings and variables established in tasks 1 to 5.
- Produces: nothing (terminal document).

- [ ] **Step 1: Collect the real list of variables read by the code**

Run:
```bash
grep -rn "os.getenv" backend/app.py backend/db.py backend/services backend/routes backend/utils | sed 's/:.*getenv(/ -> /'
grep -rn "import.meta.env" frontend/src
```
Expected: the complete list to carry into the document's table. Every variable found here must appear in `DEPLOY.md`.

- [ ] **Step 2: Write `DEPLOY.md`**

The document must contain, in this order:

1. **Prerequisites** — a Render account, a Vercel account, the existing Supabase project, the GitHub repo with the `develop` branch.

2. **Deployment order and circular dependency.** The two services reference each other: `VITE_API_URL` points to Render, `CORS_ORIGINS` points to Vercel. Break the cycle as follows:
   1. deploy the backend on Render with a provisional `CORS_ORIGINS` (`http://localhost:5173`);
   2. note the `https://<service>.onrender.com` URL;
   3. deploy the frontend on Vercel with `VITE_API_URL=https://<service>.onrender.com/api`;
   4. note the Vercel URL, go back to Render, set `CORS_ORIGINS` to that URL, redeploy.

3. **Retrieving the Supabase pooler credentials** — Supabase dashboard → Project Settings → Database → Connection string → **Transaction pooler** tab. Extract the host (`aws-0-<region>.pooler.supabase.com`), the port `6543` and the user `postgres.<project-ref>`. Point out that the pooler user is **not** `postgres`.

4. **Render settings**:

   | Setting | Value |
   |---|---|
   | Language / Runtime | Python 3 (native, not Docker) |
   | Root Directory | `backend` |
   | Branch | `develop` |
   | Build Command | `uv sync --frozen --no-dev` |
   | Start Command | `uv run gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --worker-class gthread --timeout 120` |
   | Health Check Path | `/healthz` |
   | Instance Type | Free |

   Justify `--no-dev`: pytest is a development dependency; without that flag, uv installs it in production.

   Justify `--timeout 120`: the gunicorn default is 30 s and the `/api/crm-ai/*` routes call NVIDIA models whose latency regularly exceeds it — without this setting the worker is killed mid-LLM-call.

5. **Vercel settings**:

   | Setting | Value |
   |---|---|
   | Framework Preset | Vite |
   | Root Directory | `frontend` |
   | Production Branch | `develop` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

6. **Environment variables table** — one row per variable, with the columns: name, destination (Render / Vercel), secret (yes/no), example value. Must cover: `CORS_ORIGINS`, `CORS_ALLOW_VERCEL_PREVIEWS`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_POOL_MIN`, `DB_POOL_MAX`, `SECRET_KEY`, `JWT_SECRET_KEY`, `JWT_ACCESS_TOKEN_EXPIRES`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NVIDIA_API_KEY`, `NVIDIA_TEXT_MODELS` (Render) and `VITE_API_URL` (Vercel).

7. **Security warning** — anything prefixed with `VITE_` is inlined **in plaintext** into the JavaScript bundle delivered to the browser. `SUPABASE_SERVICE_ROLE_KEY` and `NVIDIA_API_KEY` must only exist on the Render side. Also mention the result of the history audit from task 4, and key rotation if a `.env` was found there.

8. **The `PORT` trap** — `PORT` is reserved by Render for the service's HTTP port. The Postgres port is `DB_PORT`. Never set `PORT` for the database on Render: `db.py` raises an explicit error in that case.

9. **Expected failures and symptoms**:

   | Symptom | Cause | Fix |
   |---|---|---|
   | Very slow first request (~1 min) then normal | Free tier spin-down after 15 min without traffic | Expected behavior; an external pinger avoids it but consumes ~744 h of the 750 h/month quota |
   | `FATAL: too many connections` | `DB_POOL_MAX` too high × number of workers | Lower `DB_POOL_MAX`, verify the `:6543` pooler is being used |
   | `PoolError: connection pool exhausted` | `DB_POOL_MAX` < gunicorn threads | Raise `DB_POOL_MAX` to ≥ `--threads` |
   | 404 on refresh on a deep route | `frontend/vercel.json` missing or ignored | Check that the Vercel Root Directory = `frontend` |
   | HTML responses where JSON is expected | `VITE_API_URL` not defined at build time | Set the variable on Production **and** Preview, then rebuild |
   | CORS errors from a preview URL | Preview not listed in `CORS_ORIGINS` | Enable `CORS_ALLOW_VERCEL_PREVIEWS=true` on Render |
   | Render build fails on `psycopg2` | Python 3.13 used instead of 3.11.9 | Check that `backend/.python-version` is committed |
   | Worker killed during an AI generation | gunicorn `--timeout` too low | Confirm `--timeout 120` in the Start Command |

- [ ] **Step 3: Check the completeness of the variables table**

Run:
```bash
grep -o '^[A-Z_]*=' backend/.env.example | tr -d '=' | sort -u > /tmp/env_ref.txt
while read v; do grep -q "\`$v\`" DEPLOY.md || echo "MISSING from DEPLOY.md: $v"; done < /tmp/env_ref.txt
echo "--- check complete ---"
```
Expected: no `MISSING` line, then `--- check complete ---`.

- [ ] **Step 4: Check that `VITE_API_URL` is documented**

Run: `grep -c 'VITE_API_URL' DEPLOY.md`
Expected: a number ≥ 2.

- [ ] **Step 5: Commit**

```bash
git add DEPLOY.md
git commit -m "docs: add Render and Vercel deployment guide"
```

---

## Final verification (after task 6)

- [ ] **No business file touched**

Run: `git diff --stat develop...HEAD -- backend/routes backend/services backend/utils`
Expected: no output.

- [ ] **The test suite passes**

Run: `cd backend && uv run pytest -q`
Expected: `22 passed`

- [ ] **The backend starts exactly as on Render**

Run:
```bash
cd backend && uv sync --frozen --no-dev && \
  PORT=5000 uv run gunicorn wsgi:app --bind 0.0.0.0:$PORT \
  --workers 2 --threads 4 --worker-class gthread --timeout 120
```
Then: `curl -s -w '\n%{http_code}\n' 'http://localhost:5000/healthz?db=1'`
Expected: `{"db":"ok","status":"ok"}` and `200`.

After this check, restore the development environment with `uv sync --frozen` (the `--no-dev` removed pytest).

This test also covers the `PORT`/`DB_PORT` guard: with `PORT=5000` set, the Postgres connection must keep using `DB_PORT` and not 5000.

- [ ] **The frontend builds**

Run: `cd frontend && npm run build`
Expected: `✓ built in ...`

- [ ] **No secret in the diff**

Run: `git diff develop...HEAD | grep -iE 'nvapi-|eyJ|service_role|password' | grep -v '.env.example'`
Expected: no output.
