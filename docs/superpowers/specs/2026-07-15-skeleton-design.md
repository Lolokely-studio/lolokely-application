# Loading Skeletons — Design Spec

**Date:** 2026-07-15  
**Status:** Approved for planning  
**Context:** Replace content-loading spinners with layout-preserving skeleton placeholders across Lolokely Admin.

## Goals

- Improve perceived performance and UI/UX while data loads.
- Keep page chrome (titles, filters, nav) visible; only data regions show placeholders.
- Reuse one small set of shared primitives (no new npm dependency).

## Non-goals

- Replacing auth bootstrap spinners (`ProtectedRoute`, `AdminRoute`).
- Replacing button / form submit loading indicators (Login, Register, LeaveRequest, PostGenerator, etc.).
- Installing an external skeleton library.
- Recipe components (`SkeletonTable`, `SkeletonCardGrid`, etc.) — pages compose primitives themselves.

## Approach

**Minimal block API (Approach 1):** shared `Skeleton`, `SkeletonText`, and `SkeletonCircle` primitives composed per screen to approximate final layout.

## Architecture

**File:** `frontend/src/components/Skeleton.jsx`

| Export | Role |
|--------|------|
| `Skeleton` | Base pulse block. Props: `className`, optional size/rounding via className. Uses Tailwind `animate-pulse` and theme-aware background (`--surface-muted` or equivalent). |
| `SkeletonText` | One or more text lines with staggered widths. Prop: `lines` (default 1). |
| `SkeletonCircle` | Circular placeholder for avatars/logos. Prop: `size` (e.g. class or pixel size). |

**Accessibility**

- Skeleton containers use `role="status"` and a visually hidden “Loading…” label.
- No skeleton shown for error or empty states.

**Theming**

- Colors come from existing CSS variables so light and dark themes both remain readable.
- No purple/glow effects; match existing emerald glass aesthetic.

## Scope — screens

| Screen | Placeholder shape |
|--------|-------------------|
| Dashboard | Kanban-like columns/cards: blocks of `Skeleton` + `SkeletonText` |
| Jobs | 4–5 job cards: optional circle + title/meta lines |
| CRM companies list | Table body: ~6–8 rows of rectangular cells |
| CRM company detail | Header block + tab list rows (prospects / emails / financials) |
| Leave tracking | Stack of leave request cards |
| Leave approval | Pending (and history) list cards |
| Leave calendar | Grid of day/event blocks |
| Post history | Vertical list of post cards |
| NotificationBell | 4–5 compact rows inside dropdown |

### Integration pattern

```jsx
{loading ? (
  <div role="status" aria-label="Loading" className="…">
    {/* compose Skeleton / SkeletonText / SkeletonCircle */}
  </div>
) : (
  /* real content */
)}
```

Prefer replacing only the data region; keep headers and filters mounted when the page already renders them outside the loading branch (e.g. CRM list). Where a page currently early-returns a full-page spinner, switch to a full-page skeleton that still mirrors that page’s layout density.

### Unchanged

- `ProtectedRoute` / `AdminRoute` auth spinners
- Inline button spinners and submit “Signing in…” / “Submitting…” states

## Behavior

1. Show skeleton while the screen’s primary data `loading === true`.
2. On success, swap to content; avoid large layout jumps by sizing placeholders close to real content.
3. On error or empty result, use existing error/empty UI (never skeleton).
4. On CRM filter/page refetch, skeleton the list body only; filters stay interactive if the page structure allows.

## Testing (manual)

- Hard refresh / throttled network: skeleton then content on Dashboard, Jobs, CRM list/detail, Leave views, Post History, NotificationBell.
- Light and dark theme: pulse blocks visible and on-brand.
- Confirm auth and button loaders still use spinners.

## Success criteria

- Single shared `Skeleton.jsx` used by all content-loading screens above.
- Content-loading centered spinners removed from those screens.
- Auth and button loading UX unchanged.
- No new frontend dependency.
