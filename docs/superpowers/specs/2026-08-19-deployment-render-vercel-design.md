# Render (backend) + Vercel (frontend) Deployment — Design Spec

**Date:** 2026-08-19
**Status:** Approved
**Context:** Make the application deployable on free tiers: Flask backend on Render (native Python runtime), Vite/React frontend on Vercel, code on GitHub (`develop` branch). The repo audit shows code that is already portable (no hardcoded URLs, no disk writes, DB already external on Supabase) but four blocking issues: a Postgres connection leak, the absence of any backend deployment artifact, the absence of SPA configuration on the Vercel side, and incomplete secret hygiene.

**Block 1 (connection leak) has been fixed and verified in the commit for this spec.** It remains documented below because its environment configuration — Supabase pooler and the `PORT` → `DB_PORT` rename — conditions the following blocks.

## Goals

- The backend starts on Render on the native Python runtime, served by gunicorn, with locked dependencies.
- The backend handles a demo's load without saturating the Postgres connection quota of Supabase free.
- The frontend deploys on Vercel with correct SPA routing (no 404 on refresh).
- A missing configuration fails **at startup with an explicit message**, never silently in production.
- A single document (`DEPLOY.md`) makes it possible to redo the deployment from scratch without rereading the code.

## Non-goals

- Docker / `render.yaml` (blueprint) — decision made: native runtime. The Dockerfile remains the escape hatch if a system dependency ever appears.
- Version upgrades for Flask, Werkzeug or marshmallow — we **lock** what exists, we do not modernize it in this effort.
- CI/CD, custom domain, external monitoring.
- Tests for HTTP routes, AI services and the frontend. Only `db.py` is covered — see "Testing strategy".
- Rework of the routes or the business logic. The 65 DB call sites must **not** be modified.
- Migration to an ORM or to the Supabase SDK.

## Architecture decision

**Native Python runtime + uv + gunicorn.**

The stack has no system dependency: `psycopg2-binary` ships prebuilt wheels, `langchain-*` is pure Python, and PDF generation is client-side (`html2pdf.js`). Docker would only add build time on a limited free quota. uv is chosen because the current weak point is precisely reproducibility: `langchain-core` and `langchain-nvidia-ai-endpoints` are unpinned, and `Werkzeug` (3.1.3 locally) is absent from `requirements.txt`.

```
GitHub (develop branch)
   │
   ├──> Render — root directory: backend/
   │      build : uv sync --frozen --no-dev
   │      start : uv run gunicorn wsgi:app --bind 0.0.0.0:$PORT ...
   │      health: /healthz
   │        │
   │        └──> Supabase Postgres (Supavisor, transaction pooler :6543)
   │
   └──> Vercel — root directory: frontend/
          build : npm run build  →  dist/
          SPA rewrite : /(.*) → /index.html
          env : VITE_API_URL = https://<service>.onrender.com/api
```

---

## Block 1 — Postgres connection leak — ✅ DONE

### Problem

`backend/db.py` opens one connection per call. The repo has **65 `with get_connection()` and zero `conn.close()`**.

In psycopg2, `with conn:` manages the **transaction** (commit on normal exit, rollback on exception) — it does **not** close the connection. Locally, with the single-process dev server restarted often, this goes unnoticed. On Render with multi-worker gunicorn and Supabase free (60 direct connections), saturation happens within a few dozen requests: `FATAL: too many connections`.

### Chosen and applied solution

The 65 calls only use **two syntactic forms**:

```python
with get_connection() as conn:
with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
```

Both consume only the value produced by `__enter__`. We can therefore replace the connection object with a **context manager** that yields that same connection and takes care of releasing it — **without touching a single call site**. That is what makes this block low-risk despite its scale.

`db.py` is rewritten around:

- a psycopg2 `ThreadedConnectionPool`, **created lazily, once per process** (compatible with gunicorn's fork: no pool pre-exists the fork);
- `get_connection()` decorated with `@contextmanager`, which borrows from the pool, yields the connection, then on exit:
  - normal exit → `commit()`,
  - exception → `rollback()` then propagate,
  - in all cases → return the connection to the pool (`putconn`), including via `finally`.

**Preserved semantics:** a `return` inside the `with` (a very common pattern, e.g. `routes/auth.py:34` which returns a 409 from inside the block) is a normal exit and **commits**, exactly as before. The explicit `conn.commit()` calls already present in the routes remain valid — a commit with no pending transaction is a no-op.

A detail settled along the way: `DB_POOL_MAX` must stay **greater than or equal to the number of gunicorn threads per worker**, because psycopg2 raises `PoolError` when the pool is exhausted instead of waiting for a free connection. Default set to 5, for the 4-thread start command of block 2.

### Side fix: `PORT` collision

`db.py` read `os.getenv("PORT")` for the Postgres port. But `PORT` is the variable **reserved by Render** for the service's HTTP port — the one gunicorn uses in `--bind 0.0.0.0:$PORT`. A single variable cannot carry both meanings.

The canonical names therefore become `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`, with a fallback to the legacy names (`USER_DB`, `PASSWORD_DB`, `HOST`, `PORT`, `DBNAME`) so the local `.env` keeps working unmodified. Only `DB_PORT` refuses that fallback when the `RENDER` variable is present, and raises an error explicitly naming the conflict.

### Verification performed

Covered by `backend/tests/test_db.py` (14 tests, simulated pool, no network access): normal exit → commit; early `return` → commit; exception → rollback then propagation; commit failure → connection returned anyway; dead connection → closed instead of recycled; both real call syntaxes; precedence of canonical names over legacy names; `DB_PORT`/`RENDER` guard; `sslmode` always set to `require`.

The suite was validated by mutation: removing the final commit, removing the `putconn`, recycling a dead connection and dropping the `RENDER` guard each make at least one test fail. A test that never fails protects nothing.

Additionally validated against the real Supabase database: after two successive borrows, the internal pool holds only **a single connection**, which demonstrates effective reuse and the absence of a leak.

### Remaining work on this block (configuration, not code)

Switch from the direct connection to Supabase's **Supavisor transaction pooler**, to be handled in `.env.example` and `DEPLOY.md` (block 4):

- `DB_PORT` = `6543` instead of `5432`;
- `DB_USER` takes the form `postgres.<project-ref>` and not `postgres`.

Transaction mode is compatible with psycopg2: the driver interpolates parameters client-side and does not use server-side *prepared statements* by default, which is the only known incompatibility of that mode.

---

## Block 2 — Backend deployment artifacts

### WSGI entrypoint

`backend/app.py:80` only instantiates the application under `if __name__ == '__main__'`. No `app` object exists at module level, so `gunicorn app:app` fails. We add `backend/wsgi.py`:

```python
from app import create_app
app = create_app()
```

`app.py` is not modified: the `__main__` block remains the development entrypoint.

### Dependencies and Python version

`backend/requirements.txt` is replaced by `backend/pyproject.toml` + `backend/uv.lock`. **`uv.lock` must live in `backend/`**, not at the repo root: the Render service's root directory is what counts, and it is the presence of that file which triggers uv detection.

Versions to lock — the ones running locally, verified through the venv:

| Package | Version | Note |
|---|---|---|
| Flask | 2.3.3 | unchanged |
| Werkzeug | 3.1.3 | **absent** from `requirements.txt` today; Flask 2.3.3 declares `>=2.3.7`, so unpinned the resolution can break |
| Flask-Cors | 4.0.0 | unchanged |
| Flask-JWT-Extended | 4.5.3 | unchanged |
| Flask-Bcrypt | 1.0.1 | + `bcrypt` 5.0.0 |
| psycopg2-binary | 2.9.7 | **no cp313 wheel** — hence the Python pin below |
| marshmallow | 3.20.1 | unchanged |
| email-validator | 2.0.0 | unchanged |
| langchain-core | 1.5.3 | **unpinned** today |
| langchain-nvidia-ai-endpoints | 1.4.3 | **unpinned** today |
| python-dotenv | 1.0.0 | unchanged |
| gunicorn | to add | absent from the project |

`backend/.python-version` pins **3.11.9** (the local version). Otherwise Render uses a default Python 3.13, on which `psycopg2-binary==2.9.7` has no wheel and the build fails at compilation. This file is read both by Render and by uv, which keeps the two consistent. Documented point of caution: on Render, **the Python version is not configured through uv** — neither `requires-python` nor `uv python pin` drives the runtime.

### Render commands

- Root directory: `backend`
- Build: `uv sync --frozen --no-dev`
- Start: `uv run gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --worker-class gthread --timeout 120`

The `--timeout 120` is not decorative: the gunicorn default is 30 s, and the `/api/crm-ai/*` routes call NVIDIA models whose latency regularly exceeds that threshold. Without this setting, the worker is killed mid-LLM-call and the client receives an incomprehensible error. `gthread` + 4 threads absorbs those I/O waits without multiplying processes, which matters on the free tier's 512 MB.

### `CORS_ORIGINS` guard

`backend/app.py:41` does `os.getenv('CORS_ORIGINS').split(',')` with no guard: if the variable is missing, it is an `AttributeError` at boot, with a message that does not point to the cause. We align the behavior with the already-correct one of `SECRET_KEY` / `JWT_SECRET_KEY`: a `RuntimeError` explicitly naming the missing variable.

Vercel preview URLs change on every deployment and cannot be listed in advance. We therefore add an optional `CORS_ALLOW_VERCEL_PREVIEWS` variable (default: disabled) which, when enabled, adds a `^https://.*\.vercel\.app$` regex pattern to the origins list — flask-cors accepts regexes in `origins`. Disabled by default, because opening up the whole Vercel platform in production is a choice, not a reasonable default.

### Health endpoint

`GET /healthz`, unauthenticated, registered directly in `create_app()`:

- by default: `200 {"status": "ok"}` response without touching the database — a health check must not depend on a third-party service, otherwise Render restarts a healthy backend in a loop during a Supabase outage;
- with `?db=1`: additionally performs a `SELECT 1` and returns `503` on failure — useful for manual diagnosis.

Set in Render's *Health Check Path* field.

### Free tier spin-down

The service goes to sleep after 15 min without inbound traffic; waking up takes ~1 min. Two implications:

- On the frontend side, the default axios timeout (none) leaves the user in front of a frozen interface. We document the behavior without working around it in code.
- An external pinger can keep the service awake, but the free quota is 750 instance hours per month for the workspace, and a service awake 24/7 consumes ~744. It is doable, but it leaves no headroom for a second free service. To document as a trade-off, not as a recommendation.

---

## Block 3 — Vercel frontend

### SPA routing

The application uses `react-router-dom`. Without configuration, a direct access or a refresh on `/dashboard` returns a Vercel 404: the file does not exist on the static disk. We add `frontend/vercel.json` with a rewrite of all routes to `/index.html`, letting the client router take over.

### `VITE_API_URL` guard

`frontend/src/services/api.js:3` reads `import.meta.env.VITE_API_URL` with no fallback. If the variable is forgotten in Vercel, `baseURL` is `undefined`, axios falls back to relative URLs, and the calls go to the Vercel domain where they return `index.html` — HTML received where JSON is expected, with symptoms very far from the cause.

We add a module-load check that raises an explicit error if the variable is missing. Same principle as on the backend side: fail early and name the variable.

### Vercel settings

- Root directory: `frontend`
- Framework preset: Vite — Build `npm run build`, Output `dist`
- Production branch: `develop` (and not `main`)
- `VITE_API_URL` variable = `https://<service>.onrender.com/api`, to be set on both the Production **and** Preview environments

Security reminder to write into `DEPLOY.md`: anything prefixed with `VITE_` is inlined in plaintext into the bundle. `SUPABASE_SERVICE_ROLE_KEY` and `NVIDIA_API_KEY` must only exist on the Render side. That is correct today; the point is not to break it.

---

## Block 4 — Repo and secret hygiene

### `.gitignore`

The root rule only covers `.env`. The `.env.local`, `.env.production` or `.env.render` files are not ignored at the root nor in `backend/` (the frontend is covered by its local `*.local`, but by accident rather than by intent). We replace it with an explicit rule: ignore `.env*`, re-allow `.env.example`.

### History audit

`backend/.env` contains real secrets (Supabase and NVIDIA keys) and is correctly ignored today. It remains to verify that it was never committed in history: `git log --all --full-history -- backend/.env`. A `.gitignore` added after the fact removes nothing from history. If a commit is found, the keys are to be considered compromised and rotated — history rewriting is a separate subject, to be decided separately.

### `DEPLOY.md`

A single document at the root, containing: the exact settings of both services (root directory, commands, branch, health check path), the complete table of environment variables with their destination (Render vs Vercel) and which ones are secret, the procedure for retrieving the Supabase pooler credentials, the deployment order (backend first, then `CORS_ORIGINS` updated with the obtained Vercel URL), and the symptoms of the expected failures (cold start, `too many connections`, 404 on refresh).

Note on ordering: the two services reference each other (`VITE_API_URL` points to Render, `CORS_ORIGINS` points to Vercel). There is therefore a circular dependency to break by deploying the backend first, then coming back to complete `CORS_ORIGINS` once the Vercel URL is known.

---

## Testing strategy

The project had no test framework. We introduce **pytest**, as a development dependency only, with a deliberately narrow scope.

**What is tested:**

- `backend/db.py` — the only module where a regression is both silent and destructive: a missing commit or a transaction left open raises no visible error. The pool is systematically replaced there by a double.
- The application configuration of `create_app()` — `CORS_ORIGINS` guard and `/healthz` endpoint — via the Flask test client.

None of these tests touch the database or the network: the suite runs without access to Supabase and without a single secret, which makes it executable in CI the day there is one.

**What is not tested:** the business routes (`auth`, `tasks`, `companies`…), the AI services and the frontend. Covering them would require application fixtures, a test database and a doubling strategy for the NVIDIA calls — a standalone effort, unrelated to going to production. Claiming it covered would be worse than owning it.

**Consequence for Render:** since pytest is in the `dev` group, the build command must be `uv sync --frozen --no-dev`. Without `--no-dev`, uv installs the development dependencies in production.

## Files touched

**Already done:** `backend/db.py` (rewritten), `backend/tests/test_db.py` + `backend/tests/conftest.py` (14 tests), `.gitignore` (`.pytest_cache/`)

**To create:** `backend/wsgi.py`, `backend/pyproject.toml`, `backend/uv.lock`, `backend/.python-version`, `frontend/vercel.json`, `DEPLOY.md`

**To modify:** `backend/app.py` (CORS guard + `/healthz`), `backend/.env.example` (`DB_*` names + pooler), `frontend/src/services/api.js` (guard), `frontend/.env.example`, `.gitignore`

**To delete:** `backend/requirements.txt`

**Explicitly untouched:** the 12 files in `backend/routes/`, `backend/services/crm_tools.py` and `backend/utils/auth_helpers.py`, i.e. the 65 DB call sites.

## Acceptance criteria

1. ✅ `backend/db.py` returns every borrowed connection to the pool, on all three paths: success, exception, early `return`.
1bis. ✅ `pytest` passes green, and each test fails if the behavior it describes is deliberately broken.
1ter. The guards added in the following blocks (CORS, `/healthz`) are covered by a test, not only by a manual check.
2. ✅ No file from `backend/routes/`, `backend/services/` or `backend/utils/` appears in the diff.
3. The backend starts through the production gunicorn command locally, and `/healthz` answers `200`.
4. Each missing required environment variable produces a startup error naming the variable.
5. The frontend build passes, and a deep route reloaded directly resolves through the rewrite.
6. `DEPLOY.md` lists every environment variable read by the code — verifiable by a `grep` of `os.getenv` and `import.meta.env`.
