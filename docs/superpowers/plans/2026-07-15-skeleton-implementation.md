# Loading Skeletons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace content-loading spinners with shared `Skeleton` primitives so list/detail screens show layout-preserving placeholders while data loads.

**Architecture:** One module `Skeleton.jsx` exports `Skeleton`, `SkeletonText`, and `SkeletonCircle`. Each data-loading screen composes those primitives in place of its current centered spinner. Auth route and button submit spinners stay unchanged.

**Tech Stack:** React 19, Tailwind CSS 4 (`animate-pulse`), existing CSS vars (`--surface-muted`), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-15-skeleton-design.md`

## Global Constraints

- No new npm packages.
- Content loading only: do **not** change `ProtectedRoute` / `AdminRoute` in `App.jsx`, nor Login/Register/LeaveRequest/PostGenerator button loaders.
- Theme: pulse blocks use `--surface-muted` (or `bg-[var(--surface-muted)]`) so light/dark both work.
- Accessibility: each skeleton region uses `role="status"` plus a visually hidden “Loading…” text (`sr-only`).
- No automated frontend tests in this repo: verify each task with manual UI (DevTools Network throttle optional).
- Do not commit unless the user explicitly asks during execution.

## File structure

| File | Responsibility |
|------|----------------|
| `frontend/src/components/Skeleton.jsx` | Shared primitives (`Skeleton`, `SkeletonText`, `SkeletonCircle`) |
| `frontend/src/components/Jobs.jsx` | Job card list skeleton |
| `frontend/src/components/PostHistory.jsx` | Post card list skeleton |
| `frontend/src/components/Dashboard.jsx` | Kanban board skeleton |
| `frontend/src/components/CrmCompanies.jsx` | Table body skeleton |
| `frontend/src/components/CrmCompanyDetail.jsx` | Detail header + tab table skeletons |
| `frontend/src/components/LeaveTracking.jsx` | Leave request card skeletons |
| `frontend/src/components/LeaveApproval.jsx` | Pending + history list skeletons |
| `frontend/src/components/LeaveCalendar.jsx` | Calendar grid skeleton |
| `frontend/src/components/NotificationBell.jsx` | Dropdown row skeletons |

---

### Task 1: Shared Skeleton primitives

**Files:**
- Create: `frontend/src/components/Skeleton.jsx`

**Interfaces:**
- Produces:
  - `Skeleton({ className })` → pulse block (`div`)
  - `SkeletonText({ lines = 1, className })` → stack of line skeletons with staggered widths
  - `SkeletonCircle({ className, size = 'md' })` → circular pulse; `size` is `'sm' | 'md' | 'lg'`

- [ ] **Step 1: Create `Skeleton.jsx`**

```jsx
const SIZE_MAP = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

const LINE_WIDTHS = ['w-full', 'w-5/6', 'w-4/5', 'w-3/4', 'w-2/3'];

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--surface-muted)] ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${LINE_WIDTHS[i % LINE_WIDTHS.length]}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = 'md', className = '' }) {
  return (
    <Skeleton
      className={`shrink-0 rounded-full ${SIZE_MAP[size] || SIZE_MAP.md} ${className}`}
    />
  );
}

export default Skeleton;
```

- [ ] **Step 2: Sanity-check the module loads**

From `frontend/`:

```bash
node -e "import('./src/components/Skeleton.jsx').then(m => console.log(Object.keys(m).sort().join(',')))"
```

Expected: `Skeleton,SkeletonCircle,SkeletonText,default` (Vite may be needed if bare Node fails on JSX — if so, skip and verify via a temporary import in any page that already runs under `npm run dev`).

Alternative with Vite already running: temporarily import in a component and confirm no console errors.

- [ ] **Step 3: Manual visual smoke (optional quick check)**

With `npm run dev` running, temporarily render in any page:

```jsx
import { Skeleton, SkeletonText, SkeletonCircle } from './Skeleton';
// …
<div role="status" className="p-4 space-y-3">
  <span className="sr-only">Loading…</span>
  <SkeletonCircle />
  <SkeletonText lines={3} />
  <Skeleton className="h-24 w-full rounded-2xl" />
</div>
```

Confirm pulse + light/dark. Remove this temporary render before committing task work.

---

### Task 2: Jobs + Post History skeletons

**Files:**
- Modify: `frontend/src/components/Jobs.jsx` (loading early-return ~lines 120–126)
- Modify: `frontend/src/components/PostHistory.jsx` (loading early-return ~lines 66–72)

**Interfaces:**
- Consumes: `Skeleton`, `SkeletonText`, `SkeletonCircle` from `./Skeleton`

- [ ] **Step 1: Replace Jobs full-page spinner**

Add import:

```jsx
import { Skeleton, SkeletonText, SkeletonCircle } from './Skeleton';
```

Replace the `if (loading)` block with a layout that mirrors the page shell + card list:

```jsx
if (loading) {
  return (
    <div className="relative z-10 min-h-screen pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="mb-6 h-12 w-full max-w-md rounded-xl" />
        <div role="status" className="space-y-6">
          <span className="sr-only">Loading…</span>
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="glass-card rounded-2xl border border-primary-500/10 p-6"
            >
              <div className="flex items-start gap-3">
                <SkeletonCircle size="md" className="rounded-lg" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <SkeletonText lines={2} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace Post History full-page spinner**

Add the same import. Replace `if (loading)` with:

```jsx
if (loading) {
  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div role="status" className="grid grid-cols-1 gap-6">
          <span className="sr-only">Loading…</span>
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-primary-500/25 bg-card p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-48" />
                <SkeletonCircle size="sm" />
              </div>
              <SkeletonText lines={3} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manual verify**

1. Open `/jobs` and `/post-history` (or the app’s Post History route) with Network → Slow 3G (or hard refresh).
2. Confirm card skeletons appear, then real content.
3. Toggle dark/light theme — blocks remain visible.
4. Confirm Login button still shows text spinner / “Signing in…”, not skeletons.

---

### Task 3: Dashboard skeleton

**Files:**
- Modify: `frontend/src/components/Dashboard.jsx` (loading early-return ~lines 464–470)

**Interfaces:**
- Consumes: `Skeleton`, `SkeletonText` from `./Skeleton`

- [ ] **Step 1: Replace Dashboard spinner with kanban skeleton**

Import:

```jsx
import { Skeleton, SkeletonText } from './Skeleton';
```

Replace `if (loading)` with a shell matching the three-column board + side panel:

```jsx
if (loading) {
  return (
    <div className="relative z-10 flex flex-col h-full min-h-screen w-full overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-[1920px] mx-auto px-3 py-4 sm:px-4 sm:py-5 lg:px-6">
        <header className="flex-shrink-0 mb-3 sm:mb-4 space-y-3">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-48 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </header>
        <div
          role="status"
          className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 sm:gap-4 overflow-hidden"
        >
          <span className="sr-only">Loading…</span>
          <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {['To Do', 'In Progress', 'Completed'].map((label) => (
              <div
                key={label}
                className="flex flex-col rounded-xl border divider-soft bg-surface/50 overflow-hidden min-h-[240px]"
              >
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b divider-soft">
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex-1 p-2 sm:p-3 space-y-2 sm:space-y-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div
                      key={i}
                      className="rounded-xl border divider-soft bg-card p-3 space-y-2"
                    >
                      <Skeleton className="h-4 w-3/4" />
                      <SkeletonText lines={2} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <aside className="flex-shrink-0 w-full lg:w-72 xl:w-80 space-y-3 rounded-xl border divider-soft bg-surface/50 p-4">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </aside>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verify**

Hard refresh `/` (dashboard). Expect three column skeletons + user list stubs, then real board. Auth spinner on first app load (before token resolve) may still spin briefly — that is intentional and unchanged in `App.jsx`.

---

### Task 4: CRM list + company detail skeletons

**Files:**
- Modify: `frontend/src/components/CrmCompanies.jsx` (loading branch ~lines 501–504)
- Modify: `frontend/src/components/CrmCompanyDetail.jsx` (page loading ~961–969; Prospects/Emails/Financials tab spinners ~593–596, ~719–722, ~847–850)

**Interfaces:**
- Consumes: `Skeleton`, `SkeletonText` from `./Skeleton`

- [ ] **Step 1: CRM companies — skeleton the table body only**

Import:

```jsx
import { Skeleton } from './Skeleton';
```

Replace the `loading ? (…spinner…) : (` branch with a table-shaped skeleton (keep search/filters above as already rendered):

```jsx
{loading ? (
  <div role="status" className="glass-card overflow-hidden rounded-2xl border border-primary-500/10">
    <span className="sr-only">Loading…</span>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-primary-500/10 text-xs font-semibold uppercase tracking-wide text-muted">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Domain</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }, (_, i) => (
            <tr key={i} className="border-b border-primary-500/5">
              {Array.from({ length: 6 }, (_, j) => (
                <td key={j} className="px-4 py-3">
                  <Skeleton className={`h-4 ${j === 0 ? 'w-40' : 'w-24'}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
) : (
```

Adjust column count if the live table headers differ — match the real `<thead>` cell count.

- [ ] **Step 2: Company detail — page-level header skeleton**

Import in `CrmCompanyDetail.jsx`:

```jsx
import { Skeleton, SkeletonText } from './Skeleton';
```

Replace `if (loading)` page early-return:

```jsx
if (loading) {
  return (
    <div className="relative z-10 min-h-screen pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div role="status" className="space-y-6">
          <span className="sr-only">Loading…</span>
          <Skeleton className="h-4 w-32" />
          <div className="space-y-3">
            <Skeleton className="h-9 w-72 max-w-full" />
            <SkeletonText lines={2} />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
          <div className="glass-card rounded-2xl border border-primary-500/10 p-6 space-y-4">
            <SkeletonText lines={5} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Company detail — tab list skeletons**

In ProspectsTab, EmailsTab, and FinancialsTab, replace each spinner block:

```jsx
{loading ? (
  <div role="status" className="space-y-3 py-2">
    <span className="sr-only">Loading…</span>
    {Array.from({ length: 5 }, (_, i) => (
      <div
        key={i}
        className="flex items-center gap-4 rounded-xl border border-primary-500/10 px-4 py-3"
      >
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/5" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="ml-auto h-8 w-16 rounded-lg" />
      </div>
    ))}
  </div>
) : items.length === 0 ? (
```

(Keep each tab’s existing empty/table branches unchanged.)

- [ ] **Step 4: Manual verify**

1. `/crm` — filters stay, table skeleton during fetch; changing page/filter shows body skeleton again.
2. `/crm/:id` — header skeleton then content; switching tabs shows row skeletons then tables.
3. Confirm `/crm` still admin-only; auth spinner on `AdminRoute` unchanged.

---

### Task 5: Leave screens skeletons

**Files:**
- Modify: `frontend/src/components/LeaveTracking.jsx` (~lines 87–93)
- Modify: `frontend/src/components/LeaveApproval.jsx` (~lines 169–175 and historyLoading ~334–337)
- Modify: `frontend/src/components/LeaveCalendar.jsx` (~lines 132–138)

**Interfaces:**
- Consumes: `Skeleton`, `SkeletonText` from `./Skeleton`

- [ ] **Step 1: LeaveTracking — card list skeleton**

Import + replace `if (loading)`:

```jsx
import { Skeleton, SkeletonText } from './Skeleton';

if (loading) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div role="status" className="space-y-4">
        <span className="sr-only">Loading…</span>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="glass-panel p-6 space-y-3">
            <Skeleton className="h-5 w-40" />
            <SkeletonText lines={2} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: LeaveApproval — pending early-return + history body**

For pending (`if (loading && activeTab === 'pending')`), use the same card-stack pattern as LeaveTracking (title + 4 cards), with `role="status"` / `sr-only`.

For `historyLoading ? (` spinner block, replace with:

```jsx
{historyLoading ? (
  <div role="status" className="space-y-4">
    <span className="sr-only">Loading…</span>
    {Array.from({ length: 4 }, (_, i) => (
      <div key={i} className="glass-panel p-6 space-y-3">
        <Skeleton className="h-5 w-40" />
        <SkeletonText lines={2} />
      </div>
    ))}
  </div>
) : historyRequests.length === 0 ? (
```

LeaveRequestForm submit button must remain `"Submitting..."` text — do not touch that file.

- [ ] **Step 3: LeaveCalendar — grid skeleton**

Replace `if (loading)` with:

```jsx
if (loading) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-48 rounded-lg" />
      </div>
      <div role="status" className="glass-panel p-6">
        <span className="sr-only">Loading…</span>
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={`h-${i}`} className="h-6 w-full" />
          ))}
          {Array.from({ length: 35 }, (_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Manual verify**

Open Leave Tracking, Approval (pending + history tab), and Calendar with throttled network. Skeletons then content. Leave request submit still shows “Submitting…”.

---

### Task 6: NotificationBell skeleton

**Files:**
- Modify: `frontend/src/components/NotificationBell.jsx` (~lines 156–159)

**Interfaces:**
- Consumes: `Skeleton`, `SkeletonText` from `./Skeleton`

- [ ] **Step 1: Replace dropdown spinner with compact rows**

```jsx
import { Skeleton, SkeletonText } from './Skeleton';

// inside dropdown body:
{loading ? (
  <div role="status" className="space-y-1 px-2 py-2">
    <span className="sr-only">Loading…</span>
    {Array.from({ length: 5 }, (_, i) => (
      <div key={i} className="flex items-start gap-3 px-2 py-3">
        <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonText lines={2} />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
    ))}
  </div>
) : notifications.length === 0 ? (
```

- [ ] **Step 2: Manual verify**

Open the notification dropdown while notifications are refetching (or throttle network and reopen). Expect 5 row stubs then real items. Empty state unchanged when loaded with zero notifications.

---

### Task 7: Final pass — out-of-scope + acceptance

**Files:**
- Read-only verify: `frontend/src/App.jsx`, `LoginForm.jsx`, `RegisterForm.jsx`, `LeaveRequestForm.jsx`, `PostGenerator.jsx`
- Grep for leftover content spinners

- [ ] **Step 1: Grep leftover content-loading full-page spinners**

From repo root:

```bash
rg -n "animate-spin" frontend/src/components frontend/src/App.jsx
```

Expected remaining `animate-spin` usages (only):

- `App.jsx` — ProtectedRoute / AdminRoute
- `PostGenerator.jsx` — button loaders
- Optionally small icons nowhere else on list pages

**Must be gone** from content paths: Dashboard, Jobs, PostHistory, CrmCompanies, CrmCompanyDetail, LeaveTracking, LeaveApproval, LeaveCalendar, NotificationBell.

- [ ] **Step 2: Acceptance checklist**

| Check | Pass? |
|-------|-------|
| Single `Skeleton.jsx` with three exports | |
| All listed content screens use skeletons | |
| Auth route spinners unchanged | |
| Button/submit loaders unchanged | |
| Light + dark theme readable | |
| `package.json` dependencies unchanged | |

- [ ] **Step 3: Stop**

Do not commit unless the user asks. Report which tasks completed and any visual follow-ups.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Shared `Skeleton` / `SkeletonText` / `SkeletonCircle` | Task 1 |
| Theme via `--surface-muted`, `animate-pulse`, no new deps | Task 1 + Global Constraints |
| `role="status"` + hidden Loading label | Tasks 2–6 |
| Dashboard / Jobs / CRM / Leave / Post History / NotificationBell | Tasks 2–6 |
| Auth + button spinners unchanged | Global Constraints + Task 7 |
| CRM list body-only skeleton; filters stay | Task 4 |
| Error/empty never use skeleton | Unchanged branches in each modify step |
| Manual theme + throttle testing | Steps in Tasks 2–7 |
| No recipe components / no library | Task 1 only ships primitives |
