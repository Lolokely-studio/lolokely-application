# Mini CRM (Admin) — Design Spec

**Date:** 2026-07-15  
**Status:** Approved for planning  
**Context:** New DB tables (`companies`, `prospects`, `company_emails`, `company_financials`) exposed in Lolokely Admin, admin-only, like Jobs.

## Goals

- Give admins a company-centric CRM to browse and manage companies and related records.
- Support full CRUD on all four entities (manual entry in-app, in addition to existing external data ingestion).
- Preserve existing app patterns (Flask blueprints, JWT + `is_admin`, React `AdminRoute`, UI similar to Jobs).

## Non-goals (V1)

- CRM notifications
- CSV import/export
- Global prospects board (outside company detail)
- Sync logic with the external ingestion system
- Soft-delete / cascade delete of companies

## Access control

- **Admin only** (`users.is_admin = true`).
- Frontend: `AdminRoute` for `/crm` and `/crm/:id`; sidebar link only if admin.
- Backend: every CRM endpoint requires JWT + admin check (shared helper, e.g. leave-style `is_admin` or extracted `require_admin`).

## Data model (existing tables)

| Table | Role |
|-------|------|
| `companies` | Core entity (name, domain, location, type, source, status, notes, timestamps, dedup_key) |
| `prospects` | Outreach / contract tracking linked via `company_id` |
| `company_emails` | Emails linked via `company_id` |
| `company_financials` | Financial / market data linked via `company_id` |

**PK/FK alignment:** Diagram shows `companies.id` as `int8` while child FKs are typed `uuid`. Implementation must match the **actual** DB columns (inspect live schema / migrations if any). Do not invent a conversion layer unless required.

## Backend architecture

Micro-blueprints per entity (Approach 2):

| Prefix | Module | Responsibility |
|--------|--------|----------------|
| `/api/companies` | `routes/companies.py` | Company CRUD + filtered/paginated list |
| `/api/prospects` | `routes/prospects.py` | Prospect CRUD; list filterable by `company_id` |
| `/api/company-emails` | `routes/company_emails.py` | Email CRUD; list by `company_id` |
| `/api/company-financials` | `routes/company_financials.py` | Financials CRUD; list by `company_id` |

Register in `backend/app.py` alongside existing blueprints.

### Companies API

- `GET /` — query params: `q` (search name/domain/city/country), `status`, `country`, `company_type`, `page`, `per_page`
- `GET /<id>` — company detail; optionally include child counts (prospects / emails / financials)
- `POST /` — create
- `PUT /<id>` — update
- `DELETE /<id>` — delete **only if** no child rows exist; otherwise `409` with a clear message

### Child APIs (prospects, emails, financials)

- `GET /` — optional `company_id` filter (required for company-detail tabs)
- `GET /<id>`
- `POST /`
- `PUT /<id>`
- `DELETE /<id>` — hard delete allowed

### Validation

- Marshmallow schemas: `company_schema`, `prospect_schema`, `company_email_schema`, `company_financial_schema`
- Minimal required fields:
  - Company create: `company_name`
  - Email create: `company_id`, `email`
  - Prospect / financial create: `company_id` (+ other sensible required fields as needed)
- Status / type fields remain free text in V1 (no rigid enums until source values are stable)

### Errors

| Code | When |
|------|------|
| 401 | Missing/invalid JWT |
| 403 | Authenticated but not admin |
| 400 | Validation error |
| 404 | Resource not found |
| 409 | Company delete blocked by dependents |
| 500 | Unexpected server error |

## Frontend architecture

### Routes

- `/crm` — company list (search + filters + pagination)
- `/crm/:id` — company detail with tabs

### Navigation

- Admin sidebar item **CRM** (near Jobs)

### List page (`CrmCompanies.jsx`)

- Search bar (company name, domain, city, country)
- Filters: status, country, company type
- Pagination
- Create company button
- Row click → detail; edit / delete with confirmation

### Detail page (`CrmCompanyDetail.jsx`)

- Header: name, domain, status, location; edit / delete company
- Tabs:
  1. **Info** — company fields
  2. **Prospects** — list + CRUD modals/forms
  3. **Emails** — list + CRUD
  4. **Financials** — list + CRUD

### Services & wiring

- `crmService.js` (Axios via existing `api.js`)
- Register routes in `App.jsx` under `AdminRoute` + `LayoutWrapper`
- Reuse existing visual patterns from Jobs / forms (no new design system)

## Delete policy

1. Child entities: hard delete with UI confirmation.
2. Company: hard delete only when all related prospects, emails, and financials are gone; API returns 409 otherwise; UI surfaces the message so the admin cleans tabs first.

## Testing (light, V1)

- Manual: admin vs non-admin access
- Manual: create/update/delete company; create children; blocked company delete when children exist
- Manual: search + filters + pagination on list

## Success criteria

- Admin can fully manage companies and all three related entities from `/crm`
- Non-admins cannot access UI or APIs
- Company delete never silently cascades
- Feature fits existing Flask/React structure without coupling to Jobs beyond shared admin patterns
