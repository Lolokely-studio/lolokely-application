# CRM UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre l'UI/UX du CRM admin avec pipeline de prospection (`new` → `contacted` → `in_discussion` → `won` / `lost`), chips + Kanban, dropdown status inline, et fiche société enrichie — en conservant la charte verte.

**Architecture:** Approche 1 — extensions backend sur `routes/companies.py` (enum status, counts, PATCH status, tri) + module React partagé `components/crm/` consommé par `CrmCompanies.jsx` et `CrmCompanyDetail.jsx`. Kanban via `@dnd-kit/core`.

**Tech Stack:** Flask, Marshmallow, psycopg2, React 19, React Router 7, Axios, Tailwind 4, `@dnd-kit/core` + `@dnd-kit/utilities`.

**Spec:** `docs/superpowers/specs/2026-07-30-crm-ux-redesign.md`

## Global Constraints

- Admin only: JWT + `users.is_admin`; UI via `AdminRoute` (inchangé).
- Status enum strict: `new`, `contacted`, `in_discussion`, `won`, `lost` — labels UI en français.
- Charte graphique: tokens existants (`primary-*`, `glass-card`, `btn-primary`, `--chip-*`, `--danger-*`).
- Pas de bulk actions, CSV, notifications CRM (V2).
- Kanban: max 50 cartes/colonne + « Charger plus » (perf 5 000+ sociétés).
- `per_page` default frontend: 25 (API max 100 inchangé).
- Pas de suite de tests automatisée — vérifier avec `curl` + UI manuelle après chaque task.
- Ne pas committer sauf demande explicite de l'utilisateur.

## File structure

| File | Responsibility |
|------|----------------|
| `backend/schemas/company_schema.py` | Enum status + `CompanyStatusPatchSchema` |
| `backend/routes/companies.py` | status-counts, PATCH status, tri liste, filtre exact |
| `frontend/package.json` | `@dnd-kit/core`, `@dnd-kit/utilities` |
| `frontend/src/services/crmService.js` | `getStatusCounts`, `updateCompanyStatus` |
| `frontend/src/components/crm/crmConstants.js` | Pipeline, labels FR, styles badge |
| `frontend/src/components/crm/StatusBadge.jsx` | Chip read-only |
| `frontend/src/components/crm/StatusSelect.jsx` | Dropdown réutilisable |
| `frontend/src/components/crm/StatusFilterChips.jsx` | Barre chips + compteurs |
| `frontend/src/components/crm/CompanyCard.jsx` | Carte Kanban |
| `frontend/src/components/crm/KanbanBoard.jsx` | 5 colonnes + DnD |
| `frontend/src/components/crm/PipelineStepper.jsx` | Stepper fiche détail |
| `frontend/src/components/crm/CompanyAvatar.jsx` | Initiale colorée |
| `frontend/src/components/CrmCompanies.jsx` | Liste refondue (chips, table, kanban, pagination) |
| `frontend/src/components/CrmCompanyDetail.jsx` | Header enrichi + Info sections |

---

### Task 1: Backend — status enum validation

**Files:**
- Modify: `backend/schemas/company_schema.py`
- Modify: `backend/routes/companies.py` (filtre status exact dans `get_companies`)

**Interfaces:**
- Produces: `COMPANY_STATUSES` list, validated `status` on create/update

- [ ] **Step 1: Add status constants and validation to schema**

In `backend/schemas/company_schema.py`:

```python
from marshmallow import Schema, fields, EXCLUDE, validate

COMPANY_STATUSES = ['new', 'contacted', 'in_discussion', 'won', 'lost']

class CompanyCreateSchema(Schema):
    # ... existing fields ...
    status = fields.Str(
        allow_none=True,
        load_default='new',
        validate=validate.OneOf(COMPANY_STATUSES),
    )

class CompanyStatusPatchSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    status = fields.Str(required=True, validate=validate.OneOf(COMPANY_STATUSES))
```

- [ ] **Step 2: Change status filter from ILIKE to exact match**

In `get_companies`, replace:

```python
if status:
    where_clauses.append("status ILIKE %s")
    params.append(status)
```

with:

```python
if status:
    if status not in COMPANY_STATUSES:
        return jsonify({'error': 'Invalid status filter'}), 400
    where_clauses.append("status = %s")
    params.append(status)
```

Import `COMPANY_STATUSES` from schema.

- [ ] **Step 3: Verify with curl**

```bash
# Login first to get JWT, then:
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/companies/?status=new&per_page=1" | head
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"invalid"}' "http://localhost:5000/api/companies/" 
# Expected: 400 validation error
```

---

### Task 2: Backend — status-counts + PATCH status + sort

**Files:**
- Modify: `backend/schemas/company_schema.py` (export patch schema)
- Modify: `backend/routes/companies.py`

**Interfaces:**
- Produces:
  - `GET /api/companies/status-counts` → `{ total, counts: { new, contacted, ... } }`
  - `PATCH /api/companies/<id>/status` body `{ status }` → `{ company }`
  - `GET /api/companies/?sort=company_name&order=asc`

- [ ] **Step 1: Add helper to build shared WHERE (no status filter)**

Extract filter building from `get_companies` into `_company_list_filters(request)` returning `(where_sql, params)` applying `q`, `country`, `company_type` only.

- [ ] **Step 2: Implement status-counts route**

Register **before** `/<int:company_id>` to avoid route clash:

```python
@companies_bp.route('/status-counts', methods=['GET'])
@jwt_required()
def get_company_status_counts():
    _, err = require_admin()
    if err:
        return err
    try:
        where_sql, params = _company_list_filters(request)
        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT status, COUNT(*) AS count
                FROM companies
                {where_sql}
                GROUP BY status
                """,
                params,
            )
            rows = cur.fetchall()
        counts = {s: 0 for s in COMPANY_STATUSES}
        for row in rows:
            if row['status'] in counts:
                counts[row['status']] = row['count']
        total = sum(counts.values())
        return jsonify({'total': total, 'counts': counts}), 200
    except Exception as e:
        return api_error_from_exception(e, 'get_company_status_counts')
```

- [ ] **Step 3: Implement PATCH status**

```python
company_status_patch_schema = CompanyStatusPatchSchema()

@companies_bp.route('/<int:company_id>/status', methods=['PATCH'])
@jwt_required()
def patch_company_status(company_id):
    _, err = require_admin()
    if err:
        return err
    try:
        try:
            data = company_status_patch_schema.load(request.get_json() or {})
        except ValidationError as ve:
            return jsonify({'error': 'Validation error', 'details': ve.messages}), 400
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    UPDATE companies
                    SET status = %s, updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (data['status'], company_id),
                )
                company = cur.fetchone()
                if not company:
                    conn.rollback()
                    return jsonify({'error': 'Company not found'}), 404
                conn.commit()
        return jsonify({'company': _serialize_company(company)}), 200
    except Exception as e:
        return api_error_from_exception(e, 'patch_company_status')
```

- [ ] **Step 4: Add sort params to GET list**

In `get_companies`, after building filters:

```python
SORT_COLUMNS = {
    'company_name': 'company_name',
    'status': 'status',
    'updated_at': 'updated_at',
}
sort = request.args.get('sort', 'updated_at')
order = request.args.get('order', 'desc').lower()
sort_col = SORT_COLUMNS.get(sort, 'updated_at')
sort_dir = 'ASC' if order == 'asc' else 'DESC'
# Use in ORDER BY: f"ORDER BY {sort_col} {sort_dir} NULLS LAST, created_at DESC"
```

- [ ] **Step 5: Verify endpoints**

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/companies/status-counts
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"contacted"}' http://localhost:5000/api/companies/10727/status
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/companies/?sort=company_name&order=asc&per_page=3"
```

---

### Task 3: Frontend — CRM constants + StatusBadge + StatusSelect

**Files:**
- Create: `frontend/src/components/crm/crmConstants.js`
- Create: `frontend/src/components/crm/StatusBadge.jsx`
- Create: `frontend/src/components/crm/StatusSelect.jsx`
- Create: `frontend/src/components/crm/CompanyAvatar.jsx`

**Interfaces:**
- Produces:
  - `COMPANY_STATUSES`, `STATUS_LABELS`, `STATUS_BADGE_CLASSES`, `getStatusLabel(status)`
  - `<StatusBadge status="new" />`
  - `<StatusSelect value="new" onChange={(v) => ...} size="sm|md" disabled={false} />`
  - `<CompanyAvatar name="XR Impact Network" />`

- [ ] **Step 1: Create crmConstants.js**

```javascript
export const COMPANY_STATUSES = ['new', 'contacted', 'in_discussion', 'won', 'lost'];

export const STATUS_LABELS = {
  new: 'Nouveau',
  contacted: 'Contacté',
  in_discussion: 'En discussion',
  won: 'Gagné',
  lost: 'Perdu',
};

export const STATUS_BADGE_CLASSES = {
  new: 'bg-primary-500/15 text-primary-700 border-primary-500/25',
  contacted: 'bg-primary-500/25 text-primary-800 border-primary-500/35',
  in_discussion: 'bg-teal-500/15 text-teal-800 border-teal-500/25 dark:text-teal-200',
  won: 'bg-primary-600/20 text-primary-900 border-primary-600/40',
  lost: 'bg-red-500/15 text-red-700 border-red-500/25 dark:text-red-300',
};

export const getStatusLabel = (status) =>
  STATUS_LABELS[status] || status || 'N/A';

export const CRM_VIEW_MODE_KEY = 'crm-view-mode';
```

- [ ] **Step 2: Create StatusBadge.jsx**

Small chip using `STATUS_BADGE_CLASSES` + `getStatusLabel`. Add check icon for `won` via `@heroicons/react/24/solid` `CheckCircleIcon`.

- [ ] **Step 3: Create StatusSelect.jsx**

Native `<select className="input-field">` with all statuses. Props: `value`, `onChange`, `className`, `size` (`sm` uses `!py-1.5 text-xs`). Include empty option only when `allowEmpty` prop for filter bar.

Stop click propagation when used inside table rows (`onClick={(e) => e.stopPropagation()}` on wrapper).

- [ ] **Step 4: Create CompanyAvatar.jsx**

Circle with first letter of company name, `bg-primary-500/20 text-primary-700 font-bold`.

- [ ] **Step 5: Smoke test**

Temporarily import `StatusBadge` in `CrmCompanies.jsx` header; confirm render in browser.

---

### Task 4: Frontend — crmService + StatusFilterChips

**Files:**
- Modify: `frontend/src/services/crmService.js`
- Create: `frontend/src/components/crm/StatusFilterChips.jsx`

**Interfaces:**
- Produces:
  - `companyService.getStatusCounts(params)` → `{ total, counts }`
  - `companyService.updateCompanyStatus(id, status)` → `{ company }`
  - `<StatusFilterChips activeStatus={null|'new'|...} counts={counts} total={n} onChange={setStatus} />`

- [ ] **Step 1: Extend crmService.js**

```javascript
async getStatusCounts(params = {}) {
  const response = await api.get('/companies/status-counts', { params });
  return response.data;
},
async updateCompanyStatus(id, status) {
  const response = await api.patch(`/companies/${id}/status`, { status });
  return response.data;
},
```

- [ ] **Step 2: Create StatusFilterChips.jsx**

Horizontal scrollable chip bar:
- « Tous (total) » + one chip per status with count
- Active chip: `bg-primary-600/90 text-white border-primary-500`
- Inactive: `bg-primary-500/10 text-foreground border-primary-500/25 hover:bg-primary-500/20`

- [ ] **Step 3: Wire counts fetch in CrmCompanies (partial)**

Add state `statusCounts`, fetch on mount + when `debouncedSearch`, `country`, `companyType` change (not when status chip changes — counts should show full breakdown under current non-status filters per spec).

---

### Task 5: Frontend — refonte CrmCompanies (liste tableau)

**Files:**
- Modify: `frontend/src/components/CrmCompanies.jsx`

**Interfaces:**
- Consumes: all Task 3–4 components + `companyService.updateCompanyStatus`

- [ ] **Step 1: Update page header**

Subtitle → « Pipeline de prospection ».

- [ ] **Step 2: Add view mode toggle**

```javascript
const [viewMode, setViewMode] = useState(() =>
  localStorage.getItem(CRM_VIEW_MODE_KEY) || 'list'
);
const handleViewModeChange = (mode) => {
  setViewMode(mode);
  localStorage.setItem(CRM_VIEW_MODE_KEY, mode);
};
```

Toggle buttons top-right near search (List icon / ViewColumns icon from heroicons).

- [ ] **Step 3: Replace status text filter with StatusSelect**

Sync `status` state with chip selection. Keep country/company type as text inputs.

- [ ] **Step 4: Integrate StatusFilterChips below search**

- [ ] **Step 5: Enhance table**

- Add `CompanyAvatar` in name column
- Domain as `<a>` when looks like URL (starts with http or prepend https:// for website field if used)
- Type as small chip
- Status column: `<StatusSelect>` with optimistic update:

```javascript
const handleStatusChange = async (company, newStatus) => {
  const prev = company.status;
  setCompanies((rows) =>
    rows.map((c) => (c.id === company.id ? { ...c, status: newStatus } : c))
  );
  try {
    await companyService.updateCompanyStatus(company.id, newStatus);
    reloadStatusCounts();
  } catch (err) {
    setCompanies((rows) =>
      rows.map((c) => (c.id === company.id ? { ...c, status: prev } : c))
    );
    setStatusError(err.response?.data?.error || 'Failed to update status.');
  }
};
```

- [ ] **Step 6: Add sortable column headers**

Click Name / Status / Updated headers to cycle sort; pass `sort` + `order` to API. Show chevron indicator.

- [ ] **Step 7: Improve pagination**

Replace Prev/Next-only with page number buttons (show window of ~5 pages + first/last). Change default `perPage` to 25.

- [ ] **Step 8: Update CompanyForm status field**

Replace status text input with `<StatusSelect>` defaulting to `new`.

- [ ] **Step 9: Manual verify list view**

Login → `/crm` → chips show counts → filter by status → inline dropdown updates row → sort works → pagination jumps to page 5.

---

### Task 6: Frontend — Kanban board

**Files:**
- Modify: `frontend/package.json` (add deps)
- Create: `frontend/src/components/crm/CompanyCard.jsx`
- Create: `frontend/src/components/crm/KanbanBoard.jsx`
- Modify: `frontend/src/components/CrmCompanies.jsx`

**Interfaces:**
- Consumes: `companyService.getCompanies`, `updateCompanyStatus`, `COMPANY_STATUSES`
- Produces: `<KanbanBoard filters={...} onStatusChange={...} />`

- [ ] **Step 1: Install dnd-kit**

```bash
cd frontend && npm install @dnd-kit/core @dnd-kit/utilities
```

- [ ] **Step 2: Create CompanyCard.jsx**

Glass card with avatar, name (link to detail), domain, location, type chip. `data-company-id` for DnD.

- [ ] **Step 3: Create KanbanBoard.jsx**

Structure:
- State per column: `{ new: { items, page, total }, contacted: {...}, ... }`
- Initial load: for each status in `COMPANY_STATUSES`, fetch `getCompanies({ status, per_page: 50, page: 1, ...filters })`
- Render 5 columns with header (label + count from statusCounts)
- `DndContext` + `useDraggable` on cards + droppable columns
- On drop to new column: call `onStatusChange(company, newStatus)`, move card between column state
- « Charger plus » button when `items.length < total` for that column

- [ ] **Step 4: Integrate in CrmCompanies**

When `viewMode === 'kanban'`, render `<KanbanBoard>` instead of table. Pass shared filters (q, country, companyType). Hide table pagination in kanban mode.

- [ ] **Step 5: Manual verify Kanban**

Drag company from Nouveau → Contacté → card moves, API persists, refresh confirms.

---

### Task 7: Frontend — CrmCompanyDetail header + PipelineStepper

**Files:**
- Create: `frontend/src/components/crm/PipelineStepper.jsx`
- Modify: `frontend/src/components/CrmCompanyDetail.jsx`

**Interfaces:**
- Consumes: `StatusSelect`, `StatusBadge`, `CompanyAvatar`, `PipelineStepper`, `companyService.updateCompanyStatus`

- [ ] **Step 1: Create PipelineStepper.jsx**

Horizontal stepper for 5 statuses:
- Past steps: filled green circle + check
- Current: ring + filled
- Future: gray outline
- Labels below on `sm+` screens, hidden on mobile (show current label only)

- [ ] **Step 2: Replace flat header with enriched card**

Wrap header in `glass-card rounded-2xl p-6`:
- Row 1: Avatar + title block + StatusSelect
- Row 2: PipelineStepper full width
- Row 3: Edit/Delete buttons + stat pills `Emails: n | Prospects: n | Financials: n`

Status change in header uses same PATCH + local `setCompany` pattern.

- [ ] **Step 3: Update CompanyEditForm status field**

Use `StatusSelect` instead of text input.

- [ ] **Step 4: Manual verify detail**

Open `/crm/10727` → stepper matches status → change via dropdown → stepper updates.

---

### Task 8: Frontend — Info tab sections + visual harmonization

**Files:**
- Modify: `frontend/src/components/CrmCompanyDetail.jsx`

- [ ] **Step 1: Restructure Info tab into 3 sections**

```jsx
<section>
  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">Identité</h3>
  {/* domain, website, company_type */}
</section>
<section>
  <h3 className="...">Localisation</h3>
  {/* country, city, region */}
</section>
<section>
  <h3 className="...">Suivi</h3>
  {/* StatusBadge, updated_at */}
</section>
{company.notes && (
  <div className="mt-6 rounded-xl bg-[var(--surface-muted)] p-4">...</div>
)}
```

- [ ] **Step 2: Light harmonization on child tabs**

Ensure tab section headers use same `text-lg font-semibold` and `btn-primary` spacing as list page. No CRUD logic changes.

- [ ] **Step 3: Run lint**

```bash
cd frontend && npm run lint
```

Fix any new warnings in touched CRM files.

- [ ] **Step 4: Full manual test pass**

| Check | Expected |
|-------|----------|
| Chips counts | Match API `/status-counts` |
| Filter chip | Table/Kanban filtered |
| Inline status in table | PATCH works, no navigation |
| Kanban DnD | Status persists |
| Detail stepper | Reflects status |
| Dark mode | Badges/stepper readable |
| Non-admin | `/crm` blocked |

---

## Plan self-review

| Spec requirement | Task |
|------------------|------|
| Status enum validation | Task 1 |
| GET status-counts | Task 2 |
| PATCH status | Task 2 |
| Sort list | Task 2, 5 |
| StatusFilterChips | Task 4, 5 |
| List/Kanban toggle + localStorage | Task 5, 6 |
| Inline StatusSelect table | Task 5 |
| Kanban 50/card load more | Task 6 |
| Detail header + stepper | Task 7 |
| Info tab sections | Task 8 |
| crmService extensions | Task 4 |
| @dnd-kit | Task 6 |

No placeholders remain. Types consistent: `COMPANY_STATUSES` mirrored backend/frontend.
