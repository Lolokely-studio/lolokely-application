# Mini CRM (Admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only, company-centric mini CRM with full CRUD on `companies`, `prospects`, `company_emails`, and `company_financials`.

**Architecture:** Four Flask micro-blueprints under `/api/*`, Marshmallow validation, shared `require_admin` helper. React pages `/crm` (list + filters) and `/crm/:id` (tabs), wired with `crmService.js` and existing `AdminRoute`.

**Tech Stack:** Flask, Flask-JWT-Extended, Marshmallow, psycopg2, React 19, React Router 7, Axios, Tailwind (existing app styles).

**Spec:** `docs/superpowers/specs/2026-07-15-crm-design.md`

## Global Constraints

- Admin only: JWT + `users.is_admin`; UI via `AdminRoute`.
- No cascade delete on companies: return `409` if children exist.
- Status / type fields are free text (no enums) in V1.
- Follow existing patterns in `routes/jobs.py`, `routes/leaves.py`, `components/Jobs.jsx`.
- No automated test suite exists in this repo: verify each task with `curl` + manual UI checks.
- Do not invent PK conversions: use types from live DB introspection (Task 1).
- Do not commit unless the user explicitly asks during execution.

## File structure

| File | Responsibility |
|------|----------------|
| `backend/utils/auth_helpers.py` | Shared `is_admin` / `require_admin` |
| `backend/schemas/company_schema.py` | Company create/update validation |
| `backend/schemas/prospect_schema.py` | Prospect create/update validation |
| `backend/schemas/company_email_schema.py` | Email create/update validation |
| `backend/schemas/company_financial_schema.py` | Financials create/update validation |
| `backend/routes/companies.py` | `/api/companies` CRUD + search/filters/pagination |
| `backend/routes/prospects.py` | `/api/prospects` CRUD |
| `backend/routes/company_emails.py` | `/api/company-emails` CRUD |
| `backend/routes/company_financials.py` | `/api/company-financials` CRUD |
| `backend/app.py` | Register the four blueprints |
| `frontend/src/services/crmService.js` | Axios client for all CRM endpoints |
| `frontend/src/components/CrmCompanies.jsx` | List page |
| `frontend/src/components/CrmCompanyDetail.jsx` | Detail + tabs + child CRUD |
| `frontend/src/components/Navbar.jsx` | Admin CRM nav link |
| `frontend/src/App.jsx` | Routes `/crm` and `/crm/:id` |

---

### Task 1: Inspect live CRM table types

**Files:**
- Read-only: live Postgres via `backend/db.py` / `.env`
- Create (optional note only): none — record findings in plan comments / implementer notes

**Interfaces:**
- Produces: confirmed column types for `companies.id` and all `company_id` FKs (use these exact types in Tasks 2–6)

- [ ] **Step 1: Query information_schema for the four tables**

From `backend/` with env loaded:

```bash
cd backend && python - <<'PY'
from db import get_connection
from psycopg2.extras import RealDictCursor

tables = ("companies", "prospects", "company_emails", "company_financials")
with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
    for t in tables:
        cur.execute(
            """
            SELECT column_name, data_type, udt_name, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
            """,
            (t,),
        )
        rows = cur.fetchall()
        print(f"\\n=== {t} ({len(rows)} cols) ===")
        for r in rows:
            print(f"{r['column_name']:24} {r['data_type']:20} {r['udt_name']}")
PY
```

Expected: printed columns for all four tables. If a table is missing, stop and ask the user.

- [ ] **Step 2: Record PK/FK type mapping**

Write a short note (comment at top of upcoming route files is fine) with:

- `companies.id` type (e.g. `bigint` / `uuid`)
- child `company_id` type (must match for joins)

All later SQL and Marshmallow ID fields MUST use this mapping. If ERD mismatch exists in production, follow **live DB**, not the diagram.

---

### Task 2: Shared admin helper + Marshmallow schemas

**Files:**
- Create: `backend/utils/__init__.py` (empty)
- Create: `backend/utils/auth_helpers.py`
- Create: `backend/schemas/company_schema.py`
- Create: `backend/schemas/prospect_schema.py`
- Create: `backend/schemas/company_email_schema.py`
- Create: `backend/schemas/company_financial_schema.py`

**Interfaces:**
- Produces:
  - `is_admin(user_id: str) -> bool`
  - `require_admin() -> (user_id: str | None, error_response: tuple | None)` — if error_response is not None, return it from the route
  - Schemas: `CompanyCreateSchema`, `CompanyUpdateSchema`, `ProspectCreateSchema`, `ProspectUpdateSchema`, `CompanyEmailCreateSchema`, `CompanyEmailUpdateSchema`, `CompanyFinancialCreateSchema`, `CompanyFinancialUpdateSchema`

- [ ] **Step 1: Add `backend/utils/auth_helpers.py`**

```python
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from db import get_connection
from psycopg2.extras import RealDictCursor


def is_admin(user_id):
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        return bool(user and user.get("is_admin"))


def require_admin():
    """Return (user_id, None) if admin, else (None, (jsonify(...), status))."""
    user_id = get_jwt_identity()
    if not is_admin(user_id):
        return None, (jsonify({"error": "Administrator privileges required"}), 403)
    return user_id, None
```

- [ ] **Step 2: Add company schemas**

```python
# backend/schemas/company_schema.py
from marshmallow import Schema, fields, EXCLUDE

class CompanyCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    company_name = fields.Str(required=True)
    domain = fields.Str(allow_none=True, load_default=None)
    country = fields.Str(allow_none=True, load_default=None)
    city = fields.Str(allow_none=True, load_default=None)
    region = fields.Str(allow_none=True, load_default=None)
    website = fields.Str(allow_none=True, load_default=None)
    founded_year = fields.Integer(allow_none=True, load_default=None)
    company_type = fields.Str(allow_none=True, load_default=None)
    source = fields.Str(allow_none=True, load_default=None)
    source_id = fields.Str(allow_none=True, load_default=None)
    source_url = fields.Str(allow_none=True, load_default=None)
    notes = fields.Str(allow_none=True, load_default=None)
    status = fields.Str(allow_none=True, load_default=None)
    dedup_key = fields.Str(allow_none=True, load_default=None)


class CompanyUpdateSchema(CompanyCreateSchema):
    company_name = fields.Str(required=False)
```

- [ ] **Step 3: Add prospect / email / financial schemas**

Use Task 1 for `company_id` field type (`fields.Integer` if bigint, `fields.UUID` if uuid).

```python
# backend/schemas/prospect_schema.py
from marshmallow import Schema, fields, EXCLUDE

class ProspectCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    company_id = fields.Integer(required=True)  # or UUID — match Task 1
    sent_by = fields.Str(allow_none=True, load_default=None)
    contract_value = fields.Decimal(allow_none=True, load_default=None, as_string=True)
    contract_url = fields.Str(allow_none=True, load_default=None)
    contract_signed_at = fields.Date(allow_none=True, load_default=None)
    notes = fields.Str(allow_none=True, load_default=None)
    status = fields.Str(allow_none=True, load_default=None)
    sent_at = fields.DateTime(allow_none=True, load_default=None)
    contract_status = fields.Str(allow_none=True, load_default=None)
    contract_currency = fields.Str(allow_none=True, load_default=None)


class ProspectUpdateSchema(ProspectCreateSchema):
    company_id = fields.Integer(required=False)  # or UUID
```

```python
# backend/schemas/company_email_schema.py
from marshmallow import Schema, fields, EXCLUDE

class CompanyEmailCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    company_id = fields.Integer(required=True)  # or UUID — match Task 1
    email = fields.Email(required=True)
    email_type = fields.Str(allow_none=True, load_default=None)
    source_url = fields.Str(allow_none=True, load_default=None)
    scraped_at = fields.DateTime(allow_none=True, load_default=None)


class CompanyEmailUpdateSchema(CompanyEmailCreateSchema):
    company_id = fields.Integer(required=False)
    email = fields.Email(required=False)
```

```python
# backend/schemas/company_financial_schema.py
from marshmallow import Schema, fields, EXCLUDE

class CompanyFinancialCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    company_id = fields.Integer(required=True)  # or UUID — match Task 1
    ticker = fields.Str(allow_none=True, load_default=None)
    exchange = fields.Str(allow_none=True, load_default=None)
    matched_name = fields.Str(allow_none=True, load_default=None)
    currency = fields.Str(allow_none=True, load_default=None)
    market_cap = fields.Decimal(allow_none=True, load_default=None, as_string=True)
    total_revenue = fields.Decimal(allow_none=True, load_default=None, as_string=True)
    net_income = fields.Decimal(allow_none=True, load_default=None, as_string=True)
    gross_profit = fields.Decimal(allow_none=True, load_default=None, as_string=True)
    employees = fields.Integer(allow_none=True, load_default=None)
    sector = fields.Str(allow_none=True, load_default=None)
    industry = fields.Str(allow_none=True, load_default=None)
    match_confidence = fields.Str(allow_none=True, load_default=None)
    as_of = fields.Date(allow_none=True, load_default=None)
    source = fields.Str(allow_none=True, load_default=None)


class CompanyFinancialUpdateSchema(CompanyFinancialCreateSchema):
    company_id = fields.Integer(required=False)
```

- [ ] **Step 4: Smoke-import schemas**

```bash
cd backend && python -c "from utils.auth_helpers import require_admin; from schemas.company_schema import CompanyCreateSchema; print('ok')"
```

Expected: `ok`

---

### Task 3: Companies API

**Files:**
- Create: `backend/routes/companies.py`
- Modify: `backend/app.py` (register blueprint)

**Interfaces:**
- Consumes: `require_admin`, `CompanyCreateSchema`, `CompanyUpdateSchema`, DB types from Task 1
- Produces: `/api/companies` endpoints below

- [ ] **Step 1: Implement `backend/routes/companies.py`**

Serialize dates/timestamptz with `.isoformat()` when present. Pattern for every handler:

```python
@jwt_required()
def handler(...):
    _, err = require_admin()
    if err:
        return err
    ...
```

**Endpoints to implement:**

1. `GET /` — build dynamic WHERE from `q`, `status`, `country`, `company_type`; `ORDER BY updated_at DESC NULLS LAST, created_at DESC`; pagination with `page` (default 1) and `per_page` (default 20, max 100). Response:

```json
{
  "companies": [ /* rows */ ],
  "total": 123,
  "page": 1,
  "per_page": 20
}
```

Search SQL fragment for `q`:

```sql
AND (
  company_name ILIKE %s OR domain ILIKE %s OR city ILIKE %s OR country ILIKE %s
)
```

Use `%{q}%` for each.

2. `GET /<company_id>` — return company + counts:

```sql
SELECT
  (SELECT COUNT(*) FROM prospects WHERE company_id = c.id) AS prospects_count,
  (SELECT COUNT(*) FROM company_emails WHERE company_id = c.id) AS emails_count,
  (SELECT COUNT(*) FROM company_financials WHERE company_id = c.id) AS financials_count
```

404 if missing.

3. `POST /` — validate with `CompanyCreateSchema().load(request.get_json() or {})`; INSERT returning row; 201.

4. `PUT /<company_id>` — `CompanyUpdateSchema`; only update provided fields; set `updated_at = NOW()`; 404 if missing.

5. `DELETE /<company_id>` — before DELETE, count children:

```sql
SELECT
  (SELECT COUNT(*) FROM prospects WHERE company_id = %s) AS p,
  (SELECT COUNT(*) FROM company_emails WHERE company_id = %s) AS e,
  (SELECT COUNT(*) FROM company_financials WHERE company_id = %s) AS f
```

If any `> 0`, return `409` with:

```json
{"error": "Cannot delete company with related prospects, emails, or financials. Remove them first."}
```

Else DELETE and return `{"message": "Company deleted"}`.

Include a `_serialize_company(row)` helper that converts dates and Decimal if needed.

- [ ] **Step 2: Register blueprint in `app.py`**

```python
from routes.companies import companies_bp
app.register_blueprint(companies_bp, url_prefix='/api/companies')
```

- [ ] **Step 3: Verify with curl (admin token required)**

Login first, then:

```bash
# Replace TOKEN with JWT from POST /api/auth/login
curl -s -H "Authorization: Bearer TOKEN" "http://localhost:5000/api/companies/?page=1&per_page=5"
curl -s -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"company_name":"Test Co","country":"France","status":"lead"}' \
  http://localhost:5000/api/companies/
```

Expected: 200 list with `companies`/`total`; 201 create with `company`.

Non-admin token → 403.

---

### Task 4: Prospects API

**Files:**
- Create: `backend/routes/prospects.py`
- Modify: `backend/app.py`

**Interfaces:**
- Consumes: `require_admin`, prospect schemas, `company_id` type from Task 1
- Produces: `/api/prospects` CRUD

- [ ] **Step 1: Implement `backend/routes/prospects.py`**

- `GET /` — optional `?company_id=`; order by `updated_at DESC NULLS LAST, created_at DESC`
- `GET /<id>` — 404 if missing
- `POST /` — require `company_id`; verify company exists (else 400/404); INSERT (generate `uuid` for `id` if PK is uuid: `str(uuid.uuid4())`)
- `PUT /<id>` — partial update; `updated_at = NOW()`
- `DELETE /<id>` — hard delete; 404 if missing

All handlers: `@jwt_required()` + `require_admin()`.

- [ ] **Step 2: Register**

```python
from routes.prospects import prospects_bp
app.register_blueprint(prospects_bp, url_prefix='/api/prospects')
```

- [ ] **Step 3: Curl verify**

```bash
curl -s -H "Authorization: Bearer TOKEN" "http://localhost:5000/api/prospects/?company_id=COMPANY_ID"
curl -s -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"company_id":COMPANY_ID,"status":"sent","sent_by":"admin"}' \
  http://localhost:5000/api/prospects/
```

Expected: list + 201 create.

---

### Task 5: Company emails API

**Files:**
- Create: `backend/routes/company_emails.py`
- Modify: `backend/app.py`

**Interfaces:**
- Consumes: `require_admin`, email schemas
- Produces: `/api/company-emails` CRUD

- [ ] **Step 1: Implement routes**

Same shape as prospects:

- `GET /?company_id=`
- `GET /<id>`
- `POST /` — require `company_id` + `email`
- `PUT /<id>`
- `DELETE /<id>`

Generate UUID for `id` if needed. Admin-only.

- [ ] **Step 2: Register**

```python
from routes.company_emails import company_emails_bp
app.register_blueprint(company_emails_bp, url_prefix='/api/company-emails')
```

- [ ] **Step 3: Curl verify create + list**

```bash
curl -s -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"company_id":COMPANY_ID,"email":"contact@test.com","email_type":"general"}' \
  http://localhost:5000/api/company-emails/
```

Expected: 201.

---

### Task 6: Company financials API + company delete 409 check

**Files:**
- Create: `backend/routes/company_financials.py`
- Modify: `backend/app.py`

**Interfaces:**
- Consumes: `require_admin`, financial schemas
- Produces: `/api/company-financials` CRUD

- [ ] **Step 1: Implement routes** (same CRUD pattern as emails; `company_id` required on create)

- [ ] **Step 2: Register**

```python
from routes.company_financials import company_financials_bp
app.register_blueprint(company_financials_bp, url_prefix='/api/company-financials')
```

- [ ] **Step 3: Verify delete-blocked policy**

With a company that has at least one child:

```bash
curl -s -o /tmp/del.json -w "%{http_code}" -X DELETE -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/companies/COMPANY_ID
cat /tmp/del.json
```

Expected: HTTP `409` and error message about related records.

Delete children, then delete company → `200`.

---

### Task 7: Frontend `crmService.js`

**Files:**
- Create: `frontend/src/services/crmService.js`

**Interfaces:**
- Consumes: `api` from `./api`
- Produces: exported service objects used by UI tasks

- [ ] **Step 1: Create service**

```javascript
import api from './api';

export const companyService = {
  async getCompanies(params = {}) {
    const response = await api.get('/companies/', { params });
    return response.data;
  },
  async getCompany(id) {
    const response = await api.get(`/companies/${id}`);
    return response.data;
  },
  async createCompany(data) {
    const response = await api.post('/companies/', data);
    return response.data;
  },
  async updateCompany(id, data) {
    const response = await api.put(`/companies/${id}`, data);
    return response.data;
  },
  async deleteCompany(id) {
    const response = await api.delete(`/companies/${id}`);
    return response.data;
  },
};

export const prospectService = {
  async getProspects(params = {}) {
    const response = await api.get('/prospects/', { params });
    return response.data;
  },
  async createProspect(data) {
    const response = await api.post('/prospects/', data);
    return response.data;
  },
  async updateProspect(id, data) {
    const response = await api.put(`/prospects/${id}`, data);
    return response.data;
  },
  async deleteProspect(id) {
    const response = await api.delete(`/prospects/${id}`);
    return response.data;
  },
};

export const companyEmailService = {
  async getEmails(params = {}) {
    const response = await api.get('/company-emails/', { params });
    return response.data;
  },
  async createEmail(data) {
    const response = await api.post('/company-emails/', data);
    return response.data;
  },
  async updateEmail(id, data) {
    const response = await api.put(`/company-emails/${id}`, data);
    return response.data;
  },
  async deleteEmail(id) {
    const response = await api.delete(`/company-emails/${id}`);
    return response.data;
  },
};

export const companyFinancialService = {
  async getFinancials(params = {}) {
    const response = await api.get('/company-financials/', { params });
    return response.data;
  },
  async createFinancial(data) {
    const response = await api.post('/company-financials/', data);
    return response.data;
  },
  async updateFinancial(id, data) {
    const response = await api.put(`/company-financials/${id}`, data);
    return response.data;
  },
  async deleteFinancial(id) {
    const response = await api.delete(`/company-financials/${id}`);
    return response.data;
  },
};
```

- [ ] **Step 2: Confirm Axios base URL already points to `/api`** (see `frontend/src/services/api.js`) so paths above are correct.

---

### Task 8: CRM list page + nav + routes

**Files:**
- Create: `frontend/src/components/CrmCompanies.jsx`
- Modify: `frontend/src/components/Navbar.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `companyService`, `AdminRoute`, existing Jobs UI patterns (search, pagination)
- Produces: working `/crm` list for admins

- [ ] **Step 1: Build `CrmCompanies.jsx`**

Mirror structure of `Jobs.jsx`:

- State: `companies`, `total`, `loading`, `searchQuery`, `status`, `country`, `companyType`, `currentPage`, `selected`/`showForm` for create/edit modal
- `useEffect` loads via `companyService.getCompanies({ q, status, country, company_type, page, per_page: 10 })` when filters/page change
- Debounce search optionally with 300ms, or search on submit/button — either is fine; keep simple
- Table/cards: name, domain, country, city, company_type, status
- Row click → `navigate(\`/crm/${id}\`)`
- New company button → modal form with fields from `CompanyCreateSchema`
- Edit/delete on row; delete uses `window.confirm`; show API 409 message if present (`error.response?.data?.error`)
- Reuse existing Tailwind classes from Jobs (glass panels, primary buttons) — do not introduce a new design language

- [ ] **Step 2: Add nav link (admin only)**

In `Navbar.jsx`, next to Jobs:

```javascript
import { Building2 } from 'lucide-react';
// ...
navItems.push({ path: '/crm', label: 'CRM', icon: Building2 });
```

- [ ] **Step 3: Register routes in `App.jsx`**

```javascript
import CrmCompanies from './components/CrmCompanies';
import CrmCompanyDetail from './components/CrmCompanyDetail'; // stub ok if Task 9 not done yet — prefer implementing stub export in Task 8 only if needed

// Inside AppRoutes, after /jobs:
<Route
  path="/crm"
  element={
    <AdminRoute>
      <LayoutWrapper>
        <CrmCompanies />
      </LayoutWrapper>
    </AdminRoute>
  }
/>
```

If detail is not ready yet, add `/crm/:id` in Task 9. Prefer completing list first and navigate only after detail exists — or add a temporary placeholder component that shows "Loading detail…" until Task 9.

- [ ] **Step 4: Manual UI check**

- Login as admin → see **CRM** in sidebar → list loads
- Login as non-admin → no CRM link; `/crm` shows Access Denied
- Create company via modal → appears in list
- Search + filters change results

---

### Task 9: Company detail page with tabs + child CRUD

**Files:**
- Create: `frontend/src/components/CrmCompanyDetail.jsx`
- Modify: `frontend/src/App.jsx` (add `/crm/:id` if not already)

**Interfaces:**
- Consumes: all crm services
- Produces: full company-centric CRM UI

- [ ] **Step 1: Implement `CrmCompanyDetail.jsx`**

- `useParams().id` → `companyService.getCompany(id)`
- Header: name, domain, status, city/country; buttons Edit / Delete / Back to `/crm`
- Tabs state: `info | prospects | emails | financials`
- **Info tab:** show/edit company fields (same form as list modal)
- **Prospects tab:** list from `prospectService.getProspects({ company_id: id })`; add/edit modal; delete confirm
- **Emails tab:** same with `companyEmailService`
- **Financials tab:** same with `companyFinancialService`
- On company delete 409: show error text, do not navigate away
- On successful company delete: `navigate('/crm')`

Child create payloads must include `company_id: id` from the route.

- [ ] **Step 2: Wire `/crm/:id` under `AdminRoute` + `LayoutWrapper`**

- [ ] **Step 3: End-to-end manual test**

1. Create company  
2. Add prospect, email, financial on tabs  
3. Try delete company → must fail with message  
4. Delete children → delete company → back to list  
5. Non-admin cannot open `/crm/:id`

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Admin-only API + UI | 2, 3–6, 8 |
| Micro-blueprints ×4 | 3–6 |
| Companies list search + filters + pagination | 3, 8 |
| Company CRUD | 3, 8–9 |
| Prospects / emails / financials CRUD | 4–6, 9 |
| No cascade delete / 409 | 3, 6, 9 |
| PK type from live DB | 1 |
| Marshmallow schemas | 2 |
| `crmService` + routes + nav | 7–9 |
| Non-goals excluded | — |

No TBD placeholders. Schema `company_id` field types depend on Task 1 output (explicitly called out).

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-15-crm-implementation.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
