# CRM AI Agents (Top 10 + Outreach Pack + Observability) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin CRM AI: rank top 10 `new` companies to contact, generate email + prestation pack on company detail, and expose AI run observability.

**Architecture:** Deterministic orchestrated pipelines in `services/crm_agents.py` call internal DB tools then `nvidia_llm.generate_text()` with structured JSON/markdown. Flask blueprint `routes/crm_ai.py` is admin-only. Frontend adds Top 10 panel, Outreach section on detail, and `/admin/ai-runs`.

**Tech Stack:** Flask, PostgreSQL (Supabase), LangChain NVIDIA (`generate_text`), React + existing CRM UI patterns.

**Spec:** `docs/superpowers/specs/2026-08-04-crm-ai-agents-design.md`

## Global Constraints

- Ranking eligibility: **only** `companies.status = 'new'`.
- Admin-only: every `/api/crm-ai/*` endpoint uses `require_admin()`.
- Reuse `backend/services/nvidia_llm.generate_text(system, user) -> (content, model)` — do not add a second LLM client.
- Outreach email language: **French** by default.
- Prestation output: **markdown** only (no PDF/SMTP in V1).
- Parse failures: fail with clear API error + `ai_runs.status='error'` (no repair loop).
- Candidate cap for ranking: max **80** `new` companies sent to the LLM.
- `companies.id` is **integer** (match existing routes `<int:company_id>`).
- No automated test suite in repo: verify with `curl` + UI (same as NVIDIA posts plan).
- Do not commit unless the user explicitly asks.
- Do not use `setup.sh` or invent `main` runner scripts.

## File structure

| File | Responsibility |
|------|----------------|
| `backend/schemas/db.sql` | Document `outreach_packs` + `ai_runs` |
| `backend/services/crm_tools.py` | DB read tools + `ai_runs` / pack persistence helpers |
| `backend/services/crm_agents.py` | Prompts, JSON parse, `suggest_top_companies`, `generate_outreach_pack` |
| `backend/routes/crm_ai.py` | Admin HTTP endpoints |
| `backend/app.py` | Register blueprint `/api/crm-ai` |
| `frontend/src/services/crmAiService.js` | API client |
| `frontend/src/components/crm/TopCompaniesPanel.jsx` | Top 10 UI panel/modal |
| `frontend/src/components/crm/OutreachPackPanel.jsx` | Email / prestation UI |
| `frontend/src/components/CrmCompanies.jsx` | Wire Top 10 button |
| `frontend/src/components/CrmCompanyDetail.jsx` | Wire Outreach section |
| `frontend/src/components/AiRuns.jsx` | Observability table |
| `frontend/src/App.jsx` | Route `/admin/ai-runs` |
| `frontend/src/components/Navbar.jsx` | Admin nav link |

---

### Task 1: Schema — `outreach_packs` + `ai_runs`

**Files:**
- Modify: `backend/schemas/db.sql`
- Apply: live DB via Python/`get_connection`

**Interfaces:**
- Produces: tables `outreach_packs`, `ai_runs` with indexes on `(company_id, created_at)` and `(run_type, created_at)`

- [ ] **Step 1: Append DDL to `backend/schemas/db.sql`**

```sql
-- CRM AI: outreach packs
create table if not exists public.outreach_packs (
  id uuid primary key default gen_random_uuid(),
  company_id bigint not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  email_subject text not null,
  email_body text not null,
  proposal_markdown text not null,
  model_used varchar(100),
  created_at timestamptz default now()
);

create index if not exists idx_outreach_packs_company_created
  on public.outreach_packs (company_id, created_at desc);

-- CRM AI: run observability
create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  run_type varchar(50) not null check (run_type in ('suggest_top', 'outreach_pack')),
  company_id bigint references public.companies(id) on delete set null,
  model_used varchar(100),
  duration_ms int,
  status varchar(20) not null check (status in ('success', 'error')),
  input_summary jsonb default '{}'::jsonb,
  output_summary jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz default now()
);

create index if not exists idx_ai_runs_created
  on public.ai_runs (created_at desc);

create index if not exists idx_ai_runs_type_created
  on public.ai_runs (run_type, created_at desc);
```

If live `companies.id` is `integer` rather than `bigint`, use the same type as the live PK (inspect first):

```bash
cd backend && python - <<'PY'
from db import get_connection
from psycopg2.extras import RealDictCursor
with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
    cur.execute("""
      SELECT data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='companies' AND column_name='id'
    """)
    print(cur.fetchone())
PY
```

- [ ] **Step 2: Migrate live database**

Run the `CREATE TABLE` / `CREATE INDEX` statements above via `get_connection()` and `conn.commit()`.

- [ ] **Step 3: Verify**

```bash
cd backend && python - <<'PY'
from db import get_connection
with get_connection() as conn, conn.cursor() as cur:
    cur.execute("""
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name IN ('outreach_packs','ai_runs')
      ORDER BY table_name
    """)
    print([r[0] for r in cur.fetchall()])
PY
```

Expected: `['ai_runs', 'outreach_packs']`

---

### Task 2: CRM tools — fetch context + persist runs/packs

**Files:**
- Create: `backend/services/crm_tools.py`

**Interfaces:**
- Produces:
  - `fetch_new_company_candidates(limit: int = 80) -> list[dict]`
  - `fetch_company_context(company_id: int) -> dict | None`
  - `insert_ai_run(...) -> str` (uuid as str)
  - `insert_outreach_pack(...) -> str`
  - `get_latest_outreach_pack(company_id: int) -> dict | None`
  - `get_latest_suggest_top_run() -> dict | None`
  - `list_ai_runs(limit: int = 50, offset: int = 0) -> tuple[list[dict], int]`

- [ ] **Step 1: Create `backend/services/crm_tools.py`**

```python
import json
from psycopg2.extras import RealDictCursor
from db import get_connection


def _serialize_row(row):
    if row is None:
        return None
    out = dict(row)
    for k, v in list(out.items()):
        if hasattr(v, 'isoformat'):
            out[k] = v.isoformat()
        elif hasattr(v, '__float__') and k in (
            'market_cap', 'total_revenue', 'net_income', 'gross_profit'
        ):
            out[k] = str(v)
    return out


def fetch_new_company_candidates(limit: int = 80) -> list[dict]:
    """Only status='new'. Pre-order by signal richness, cap at limit."""
    sql = """
      SELECT c.id, c.company_name, c.domain, c.country, c.city, c.region,
             c.company_type, c.source, c.notes, c.status, c.website,
             COALESCE(length(c.notes), 0) AS notes_len,
             (SELECT COUNT(*) FROM company_emails e WHERE e.company_id = c.id) AS emails_count,
             (SELECT COUNT(*) FROM company_financials f WHERE f.company_id = c.id) AS financials_count,
             (SELECT COUNT(*) FROM prospects p WHERE p.company_id = c.id) AS prospects_count,
             (
               SELECT json_agg(json_build_object(
                 'sector', f.sector, 'industry', f.industry,
                 'total_revenue', f.total_revenue::text,
                 'market_cap', f.market_cap::text,
                 'employees', f.employees
               ))
               FROM company_financials f WHERE f.company_id = c.id
             ) AS financials_preview
      FROM companies c
      WHERE c.status = 'new'
      ORDER BY
        (CASE WHEN c.notes IS NOT NULL AND length(trim(c.notes)) > 0 THEN 1 ELSE 0 END
         + (SELECT COUNT(*) FROM company_financials f WHERE f.company_id = c.id)
         + (SELECT COUNT(*) FROM company_emails e WHERE e.company_id = c.id)
         + (SELECT COUNT(*) FROM prospects p WHERE p.company_id = c.id)
        ) DESC,
        c.updated_at DESC NULLS LAST,
        c.id DESC
      LIMIT %s
    """
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, (limit,))
        return [_serialize_row(r) for r in cur.fetchall()]


def fetch_company_context(company_id: int) -> dict | None:
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM companies WHERE id = %s", (company_id,))
        company = cur.fetchone()
        if not company:
            return None
        cur.execute(
            "SELECT * FROM company_emails WHERE company_id = %s ORDER BY id DESC LIMIT 20",
            (company_id,),
        )
        emails = cur.fetchall()
        cur.execute(
            "SELECT * FROM company_financials WHERE company_id = %s ORDER BY id DESC LIMIT 10",
            (company_id,),
        )
        financials = cur.fetchall()
        cur.execute(
            "SELECT * FROM prospects WHERE company_id = %s ORDER BY id DESC LIMIT 20",
            (company_id,),
        )
        prospects = cur.fetchall()
        return {
            'company': _serialize_row(company),
            'emails': [_serialize_row(r) for r in emails],
            'financials': [_serialize_row(r) for r in financials],
            'prospects': [_serialize_row(r) for r in prospects],
        }


def insert_ai_run(
    *,
    user_id: str,
    run_type: str,
    company_id: int | None,
    model_used: str | None,
    duration_ms: int | None,
    status: str,
    input_summary: dict,
    output_summary: dict,
    error_message: str | None = None,
) -> str:
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO ai_runs (
              user_id, run_type, company_id, model_used, duration_ms,
              status, input_summary, output_summary, error_message
            ) VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s)
            RETURNING id
            """,
            (
                user_id,
                run_type,
                company_id,
                model_used,
                duration_ms,
                status,
                json.dumps(input_summary),
                json.dumps(output_summary),
                error_message,
            ),
        )
        row = cur.fetchone()
        conn.commit()
        return str(row['id'])


def insert_outreach_pack(
    *,
    company_id: int,
    user_id: str,
    email_subject: str,
    email_body: str,
    proposal_markdown: str,
    model_used: str | None,
) -> str:
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO outreach_packs (
              company_id, user_id, email_subject, email_body,
              proposal_markdown, model_used
            ) VALUES (%s,%s,%s,%s,%s,%s)
            RETURNING id
            """,
            (
                company_id,
                user_id,
                email_subject,
                email_body,
                proposal_markdown,
                model_used,
            ),
        )
        row = cur.fetchone()
        conn.commit()
        return str(row['id'])


def get_latest_outreach_pack(company_id: int) -> dict | None:
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT * FROM outreach_packs
            WHERE company_id = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (company_id,),
        )
        return _serialize_row(cur.fetchone())


def get_latest_suggest_top_run() -> dict | None:
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT * FROM ai_runs
            WHERE run_type = 'suggest_top' AND status = 'success'
            ORDER BY created_at DESC
            LIMIT 1
            """
        )
        return _serialize_row(cur.fetchone())


def list_ai_runs(limit: int = 50, offset: int = 0) -> tuple[list[dict], int]:
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT COUNT(*) AS total FROM ai_runs")
        total = int(cur.fetchone()['total'])
        cur.execute(
            """
            SELECT r.*, c.company_name
            FROM ai_runs r
            LEFT JOIN companies c ON c.id = r.company_id
            ORDER BY r.created_at DESC
            LIMIT %s OFFSET %s
            """,
            (limit, offset),
        )
        return [_serialize_row(r) for r in cur.fetchall()], total
```

- [ ] **Step 2: Smoke-import**

```bash
cd backend && python -c "from services.crm_tools import fetch_new_company_candidates; print(len(fetch_new_company_candidates(5)))"
```

Expected: integer (possibly `0`).

---

### Task 3: Agents — suggest top + outreach pack

**Files:**
- Create: `backend/services/crm_agents.py`

**Interfaces:**
- Consumes: `crm_tools.*`, `nvidia_llm.generate_text`
- Produces:
  - `suggest_top_companies(user_id: str) -> dict`
  - `generate_outreach_pack(user_id: str, company_id: int) -> dict`
  - Raises `ValueError` for not-found / bad parse; `RuntimeError` for LLM failure (caller maps to HTTP)

- [ ] **Step 1: Create `backend/services/crm_agents.py`**

```python
import json
import re
import time
from services.crm_tools import (
    fetch_new_company_candidates,
    fetch_company_context,
    insert_ai_run,
    insert_outreach_pack,
)
from services.nvidia_llm import generate_text

CANDIDATE_LIMIT = 80


def _extract_json(text: str):
    text = (text or '').strip()
    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
    return json.loads(text)


def suggest_top_companies(user_id: str) -> dict:
    started = time.monotonic()
    candidates = fetch_new_company_candidates(CANDIDATE_LIMIT)
    if not candidates:
        run_id = insert_ai_run(
            user_id=user_id,
            run_type='suggest_top',
            company_id=None,
            model_used=None,
            duration_ms=int((time.monotonic() - started) * 1000),
            status='success',
            input_summary={'candidates': 0},
            output_summary={'items': []},
        )
        return {
            'generated_at': None,
            'model_used': None,
            'run_id': run_id,
            'candidates_considered': 0,
            'message': 'Aucune société en statut new.',
            'items': [],
        }

    compact = []
    for c in candidates:
        compact.append({
            'id': c['id'],
            'company_name': c.get('company_name'),
            'domain': c.get('domain'),
            'country': c.get('country'),
            'city': c.get('city'),
            'company_type': c.get('company_type'),
            'source': c.get('source'),
            'notes': (c.get('notes') or '')[:800],
            'emails_count': c.get('emails_count'),
            'financials_count': c.get('financials_count'),
            'prospects_count': c.get('prospects_count'),
            'financials_preview': c.get('financials_preview'),
        })

    system = (
        "Tu es un assistant CRM B2B. Tu scores des sociétés à contacter en PRIORITÉ. "
        "Réponds UNIQUEMENT en JSON valide (pas de markdown). "
        "Schema: {\"items\":[{\"company_id\":number,\"score\":number,\"reasons\":[string]}]}. "
        "score entre 0 et 1. Max 10 items. Trie score décroissant. "
        "Ne choisis QUE parmi les IDs fournis. Raisons en français, 2 à 4 bullets."
    )
    user_prompt = (
        "Voici des sociétés status=new. Sélectionne les 10 meilleures à contacter "
        f"maintenant:\n{json.dumps(compact, ensure_ascii=False)}"
    )

    model_used = None
    try:
        raw, model_used = generate_text(system, user_prompt)
        parsed = _extract_json(raw)
        allowed = {c['id'] for c in candidates}
        by_id = {c['id']: c for c in candidates}
        items = []
        for row in parsed.get('items') or []:
            cid = int(row['company_id'])
            if cid not in allowed:
                continue
            company = by_id[cid]
            items.append({
                'company_id': cid,
                'rank': len(items) + 1,
                'score': float(row.get('score', 0)),
                'reasons': list(row.get('reasons') or [])[:4],
                'company': {
                    'id': company['id'],
                    'name': company.get('company_name'),
                    'company_name': company.get('company_name'),
                    'status': company.get('status'),
                    'domain': company.get('domain'),
                },
            })
            if len(items) >= 10:
                break
        # Re-rank 1..n after filter
        for i, it in enumerate(items, start=1):
            it['rank'] = i

        duration_ms = int((time.monotonic() - started) * 1000)
        run_id = insert_ai_run(
            user_id=user_id,
            run_type='suggest_top',
            company_id=None,
            model_used=model_used,
            duration_ms=duration_ms,
            status='success',
            input_summary={'candidates': len(candidates)},
            output_summary={'items': items, 'model_used': model_used},
        )
        from datetime import datetime, timezone
        return {
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'model_used': model_used,
            'run_id': run_id,
            'candidates_considered': len(candidates),
            'items': items,
        }
    except Exception as e:
        duration_ms = int((time.monotonic() - started) * 1000)
        insert_ai_run(
            user_id=user_id,
            run_type='suggest_top',
            company_id=None,
            model_used=model_used,
            duration_ms=duration_ms,
            status='error',
            input_summary={'candidates': len(candidates)},
            output_summary={},
            error_message=str(e)[:1000],
        )
        raise


def generate_outreach_pack(user_id: str, company_id: int) -> dict:
    started = time.monotonic()
    ctx = fetch_company_context(company_id)
    if not ctx:
        raise ValueError('Company not found')

    model_used = None
    try:
        email_system = (
            "Tu rédiges un email d'outreach B2B en français. "
            "Réponds UNIQUEMENT en JSON: {\"subject\":string,\"body\":string}. "
            "Ton professionnel, personnalisé, concis. Pas de placeholders du type [Nom]."
        )
        email_user = (
            "Contexte société (JSON):\n"
            f"{json.dumps(ctx, ensure_ascii=False)}\n"
            "Rédige un email de premier contact proposant un échange."
        )
        email_raw, model_used = generate_text(email_system, email_user)
        email = _extract_json(email_raw)
        subject = (email.get('subject') or '').strip()
        body = (email.get('body') or '').strip()
        if not subject or not body:
            raise ValueError('Invalid email JSON from model')

        proposal_system = (
            "Tu rédiges un document de prestation / proposition commerciale en français, "
            "au format Markdown. Sections: Contexte, Besoins perçus, Périmètre proposé, "
            "Livrables, Modalités & next steps. Pricing indicatif seulement si les données "
            "le permettent — n'invente pas de contrat signé."
        )
        proposal_user = (
            "Contexte société:\n"
            f"{json.dumps(ctx, ensure_ascii=False)}\n"
            f"Email prévu (pour cohérence):\nSujet: {subject}\n\n{body}"
        )
        proposal_md, model2 = generate_text(proposal_system, proposal_user)
        if model2:
            model_used = model2
        proposal_md = (proposal_md or '').strip()
        if not proposal_md:
            raise ValueError('Empty proposal from model')

        pack_id = insert_outreach_pack(
            company_id=company_id,
            user_id=user_id,
            email_subject=subject,
            email_body=body,
            proposal_markdown=proposal_md,
            model_used=model_used,
        )
        duration_ms = int((time.monotonic() - started) * 1000)
        run_id = insert_ai_run(
            user_id=user_id,
            run_type='outreach_pack',
            company_id=company_id,
            model_used=model_used,
            duration_ms=duration_ms,
            status='success',
            input_summary={'company_id': company_id},
            output_summary={'pack_id': pack_id},
        )
        from datetime import datetime, timezone
        return {
            'pack_id': pack_id,
            'company_id': company_id,
            'email_subject': subject,
            'email_body': body,
            'proposal_markdown': proposal_md,
            'model_used': model_used,
            'run_id': run_id,
            'created_at': datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        duration_ms = int((time.monotonic() - started) * 1000)
        insert_ai_run(
            user_id=user_id,
            run_type='outreach_pack',
            company_id=company_id,
            model_used=model_used,
            duration_ms=duration_ms,
            status='error',
            input_summary={'company_id': company_id},
            output_summary={},
            error_message=str(e)[:1000],
        )
        raise
```

- [ ] **Step 2: Import check**

```bash
cd backend && python -c "from services.crm_agents import suggest_top_companies, generate_outreach_pack; print('ok')"
```

---

### Task 4: API routes — `/api/crm-ai`

**Files:**
- Create: `backend/routes/crm_ai.py`
- Modify: `backend/app.py`

**Interfaces:**
- Consumes: `require_admin`, `crm_agents.*`, `crm_tools.get_latest_*`, `list_ai_runs`
- Produces: endpoints listed in spec

- [ ] **Step 1: Create `backend/routes/crm_ai.py`**

```python
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from utils.auth_helpers import require_admin, api_error_from_exception
from services.crm_agents import suggest_top_companies, generate_outreach_pack
from services.crm_tools import (
    get_latest_outreach_pack,
    get_latest_suggest_top_run,
    list_ai_runs,
)

crm_ai_bp = Blueprint('crm_ai', __name__)


@crm_ai_bp.route('/suggest-top', methods=['POST'])
@jwt_required()
def post_suggest_top():
    user_id, err = require_admin()
    if err:
        return err
    try:
        result = suggest_top_companies(user_id)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        msg = str(e)
        if 'API key' in msg or 'nvapi-' in msg:
            return jsonify({'error': msg}), 400
        return jsonify({'error': 'AI ranking failed', 'details': msg}), 503


@crm_ai_bp.route('/suggest-top/latest', methods=['GET'])
@jwt_required()
def get_suggest_top_latest():
    user_id, err = require_admin()
    if err:
        return err
    try:
        run = get_latest_suggest_top_run()
        if not run:
            return jsonify({'items': [], 'message': 'No ranking yet'}), 200
        summary = run.get('output_summary') or {}
        if isinstance(summary, str):
            import json
            summary = json.loads(summary)
        return jsonify({
            'generated_at': run.get('created_at'),
            'model_used': run.get('model_used'),
            'run_id': run.get('id'),
            'candidates_considered': (run.get('input_summary') or {}).get('candidates'),
            'items': summary.get('items') or [],
        }), 200
    except Exception as e:
        return api_error_from_exception(e, 'get_suggest_top_latest')


@crm_ai_bp.route('/companies/<int:company_id>/outreach-pack', methods=['POST'])
@jwt_required()
def post_outreach_pack(company_id):
    user_id, err = require_admin()
    if err:
        return err
    try:
        result = generate_outreach_pack(user_id, company_id)
        return jsonify(result), 201
    except ValueError as e:
        if 'not found' in str(e).lower():
            return jsonify({'error': str(e)}), 404
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        msg = str(e)
        if 'API key' in msg or 'nvapi-' in msg:
            return jsonify({'error': msg}), 400
        return jsonify({'error': 'Outreach generation failed', 'details': msg}), 503


@crm_ai_bp.route('/companies/<int:company_id>/outreach-pack', methods=['GET'])
@jwt_required()
def get_outreach_pack(company_id):
    user_id, err = require_admin()
    if err:
        return err
    try:
        pack = get_latest_outreach_pack(company_id)
        if not pack:
            return jsonify({'pack': None}), 200
        return jsonify({
            'pack_id': pack['id'],
            'company_id': pack['company_id'],
            'email_subject': pack['email_subject'],
            'email_body': pack['email_body'],
            'proposal_markdown': pack['proposal_markdown'],
            'model_used': pack.get('model_used'),
            'created_at': pack.get('created_at'),
        }), 200
    except Exception as e:
        return api_error_from_exception(e, 'get_outreach_pack')


@crm_ai_bp.route('/runs', methods=['GET'])
@jwt_required()
def get_runs():
    user_id, err = require_admin()
    if err:
        return err
    try:
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = max(int(request.args.get('offset', 0)), 0)
        rows, total = list_ai_runs(limit=limit, offset=offset)
        return jsonify({'runs': rows, 'total': total, 'limit': limit, 'offset': offset}), 200
    except Exception as e:
        return api_error_from_exception(e, 'get_runs')
```

- [ ] **Step 2: Register in `backend/app.py`**

Add import and:

```python
from routes.crm_ai import crm_ai_bp
app.register_blueprint(crm_ai_bp, url_prefix='/api/crm-ai')
```

- [ ] **Step 3: Manual API check (admin JWT)**

```bash
# Replace TOKEN
curl -s -X POST http://localhost:5000/api/crm-ai/suggest-top \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" | head -c 500
```

Expected: JSON with `items` array (or empty message). Non-admin → 403.

---

### Task 5: Frontend API client

**Files:**
- Create: `frontend/src/services/crmAiService.js`

**Interfaces:**
- Produces: `crmAiService.suggestTop()`, `getLatestSuggestTop()`, `generateOutreachPack(id)`, `getOutreachPack(id)`, `listRuns(params)`

- [ ] **Step 1: Create service**

```javascript
import api from './api';

export const crmAiService = {
  async suggestTop() {
    const response = await api.post('/crm-ai/suggest-top');
    return response.data;
  },
  async getLatestSuggestTop() {
    const response = await api.get('/crm-ai/suggest-top/latest');
    return response.data;
  },
  async generateOutreachPack(companyId) {
    const response = await api.post(`/crm-ai/companies/${companyId}/outreach-pack`);
    return response.data;
  },
  async getOutreachPack(companyId) {
    const response = await api.get(`/crm-ai/companies/${companyId}/outreach-pack`);
    return response.data;
  },
  async listRuns(params = {}) {
    const response = await api.get('/crm-ai/runs', { params });
    return response.data;
  },
};
```

---

### Task 6: UI — Top 10 panel on CRM list

**Files:**
- Create: `frontend/src/components/crm/TopCompaniesPanel.jsx`
- Modify: `frontend/src/components/CrmCompanies.jsx`

**Interfaces:**
- Consumes: `crmAiService.suggestTop`, `getLatestSuggestTop`
- Produces: modal/panel listing rank, score, reasons; navigate to `/crm/:id`

- [ ] **Step 1: Create `TopCompaniesPanel.jsx`**

Build a glass-panel modal matching existing `CompanyForm` overlay patterns in `CrmCompanies.jsx`:

- Props: `{ open, onClose }`
- On open: load `getLatestSuggestTop()`; show empty if none
- Buttons: **Régénérer** → `suggestTop()` (loading spinner, disable double-click)
- Each item: `#rank`, company name, score, reasons bullets, click → `navigate(\`/crm/${id}\`)`
- Empty `new` pool: show `message` from API

Keep styling consistent with CRM (`glass-panel`, `btn-primary`, status colors). Do not invent a new purple theme.

- [ ] **Step 2: Wire button in `CrmCompanies.jsx`**

Near the header actions (beside New Company / view toggles), add:

```jsx
<button type="button" className="btn-secondary" onClick={() => setShowTop10(true)}>
  Top 10 à contacter
</button>
```

Render `<TopCompaniesPanel open={showTop10} onClose={() => setShowTop10(false)} />`.

- [ ] **Step 3: Manual UI check**

Open `/crm` as admin → Top 10 → regenerate → click a row → lands on detail.

---

### Task 7: UI — Outreach pack on company detail

**Files:**
- Create: `frontend/src/components/crm/OutreachPackPanel.jsx`
- Modify: `frontend/src/components/CrmCompanyDetail.jsx`

**Interfaces:**
- Consumes: `crmAiService.getOutreachPack`, `generateOutreachPack`
- Produces: tabs Email | Prestation; copy; download `.md`

- [ ] **Step 1: Create `OutreachPackPanel.jsx`**

Props: `{ companyId }`

Behavior:

1. On mount: `getOutreachPack(companyId)`
2. If no pack: CTA **Générer le pack outreach**
3. If pack: tabs Email (subject+body) / Prestation (markdown `<pre>` or simple render)
4. Actions: Copier email, Copier markdown, Download `prestation-{companyId}.md`
5. **Régénérer** → `window.confirm` then POST
6. Show `model_used` + `created_at` under the panel
7. Loading/error states like other CRM panels

Copy helper:

```javascript
await navigator.clipboard.writeText(text);
```

Download helper:

```javascript
const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `prestation-${companyId}.md`;
a.click();
URL.revokeObjectURL(url);
```

- [ ] **Step 2: Insert into `CrmCompanyDetail.jsx`**

Place `<OutreachPackPanel companyId={companyId} />` above or below the existing tabs content (Info / Prospects / Emails / Financials) — preferred: dedicated section under header actions, always visible without needing a tab.

- [ ] **Step 3: Manual UI check**

Open a company → generate pack → copy email → download markdown → regenerate with confirm.

---

### Task 8: UI — AI Runs observability page

**Files:**
- Create: `frontend/src/components/AiRuns.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Navbar.jsx`

**Interfaces:**
- Consumes: `crmAiService.listRuns`
- Produces: admin page at `/admin/ai-runs`

- [ ] **Step 1: Create `AiRuns.jsx`**

Table columns: created_at, run_type, company_name, model_used, duration_ms, status, error_message (truncated).

Load on mount with `limit=50`. Simple pagination via offset if `total > limit`.

- [ ] **Step 2: Add route in `App.jsx`**

```jsx
import AiRuns from './components/AiRuns';
// inside Routes, admin:
<Route path="/admin/ai-runs" element={
  <AdminRoute>
    <Layout><AiRuns /></Layout>
  </AdminRoute>
} />
```

(Use the same Layout/Navbar wrapper pattern as `/crm`.)

- [ ] **Step 3: Navbar admin link**

```javascript
navItems.push({ path: '/admin/ai-runs', label: 'AI Runs', icon: Activity }); // or Sparkles from lucide-react
```

- [ ] **Step 4: Demo path check**

Top 10 → company pack → `/admin/ai-runs` shows both `suggest_top` and `outreach_pack` success rows with model + duration.

---

### Task 9: Docs touch-up

**Files:**
- Modify: `docs/06-backend-documentation.md` (short section CRM AI endpoints)
- Modify: `README.md` (feature bullet)

- [ ] **Step 1: Document the five `/api/crm-ai` endpoints and tables**
- [ ] **Step 2: README feature bullets for Top 10 + Outreach pack + AI Runs**

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Top 10 `status=new` only | 2, 3, 4, 6 |
| Outreach on company detail | 3, 4, 7 |
| Top 10 CTA → detail | 6 |
| Observability `/admin/ai-runs` | 4, 8 |
| Tables `outreach_packs`, `ai_runs` | 1 |
| Reuse `nvidia_llm.generate_text` | 3 |
| Admin-only | 4 |
| FR email + markdown prestation | 3, 7 |
| No SMTP/PDF/RAG/free-form agent | Global Constraints |

## Self-review notes

- No placeholders left in tasks.
- `company_id` typed as int/bigint consistently with existing CRM routes.
- Latest ranking cached via last successful `ai_runs` row (`GET /suggest-top/latest`).
- Commit steps omitted intentionally (user must request commits).
