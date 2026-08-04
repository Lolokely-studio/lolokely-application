# CRM AI Agents (Top 10 + Outreach Pack + Observability) — Design Spec

**Date:** 2026-08-04  
**Status:** Approved  
**Context:** Make Lolokely heavier for defense (soutenance) with a targeted A+B mix: technical depth (orchestrated agents + observability) and business demo (CRM prioritization + outreach deliverables). Reuse existing NVIDIA LangChain stack (`services/nvidia_llm.py`).

## Goals

- Suggest the **best 10 companies to contact**, strictly among companies with `status = 'new'`.
- On company detail (and via Top 10 CTA), generate an **outreach pack**: personalized email + prestation document (markdown).
- Persist generations and expose **AI run observability** (model, duration, status) for the technical demo.
- Admin-only, consistent with existing CRM access control.

## Non-goals (V1)

- RAG / embeddings / pgvector
- Free-form `create_agent` tool-loop (reserved V1.1)
- Real SMTP send
- PDF export (markdown download is enough)
- Auto-changing company status after generation (optional manual “Mark contacted” may exist later; not part of generation)
- Dual-provider fallback outside existing NVIDIA text chain
- Scoring outside `new` statuses

## Product flow

```
CRM (admin)
  │
  ├─ "Top 10 à contacter"
  │     → filter status=new only
  │     → score + short reasons per company
  │     → clickable Top 10 → /crm/:id
  │
  └─ Company detail (/crm/:id) — primary Outreach entry
        → "Generate outreach pack"
              → email (subject + body)
              → prestation doc (markdown)
              → preview / copy / download .md
              → linked ai_run metadata
```

Demo narrative (~2 min):

1. CRM → Top 10 (`new` only)
2. Open one company → generate pack
3. Copy email + show prestation
4. Open AI runs → show `model_used` / duration / success

## Architecture

**Choice:** deterministic **orchestrated pipelines** (fixed steps + DB tools + structured LLM JSON), not an unconstrained agent. This keeps the existing multi-model fallback reliable for live demos while remaining “agentic” (tools + reasoning + deliverables).

```
Frontend (admin CRM)
  ├─ POST /api/crm-ai/suggest-top
  └─ POST /api/crm-ai/companies/:id/outreach-pack
           │
           ▼
routes/crm_ai.py  (JWT + require_admin)
           │
           ▼
services/crm_agents.py
  ├─ suggest_top_companies()
  │     1. tool: fetch_new_companies (+ related signal aggregates)
  │     2. LLM: score + rank → Top 10 JSON
  │     3. persist ai_runs (+ optional cache of latest ranking)
  │
  └─ generate_outreach_pack(company_id)
        1. tool: fetch_company_context
        2. LLM: email JSON {subject, body}
        3. LLM: prestation markdown
        4. persist outreach_packs + ai_runs
           │
           ▼
services/nvidia_llm.generate_text()  (existing fallback chain)
```

### Modules

| Layer | File | Role |
|-------|------|------|
| API | `backend/routes/crm_ai.py` | Admin endpoints |
| Agents | `backend/services/crm_agents.py` | Orchestration, prompts, JSON parse |
| Tools | Internal Python functions | Read CRM data only (no external HTTP) |
| LLM | `backend/services/nvidia_llm.py` | Reuse as-is |
| UI list | CRM list / Kanban | Top 10 button + results panel |
| UI detail | `CrmCompanyDetail` | Outreach pack section |
| Observability UI | `/admin/ai-runs` | Run history (admin route) |

## API

All endpoints: JWT + admin required.

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/api/crm-ai/suggest-top` | Rank up to 10 companies with `status='new'` |
| `GET` | `/api/crm-ai/suggest-top/latest` | Return last cached ranking (avoid re-LLM on refresh) |
| `POST` | `/api/crm-ai/companies/<id>/outreach-pack` | Generate email + prestation for company |
| `GET` | `/api/crm-ai/companies/<id>/outreach-pack` | Latest pack for company detail |
| `GET` | `/api/crm-ai/runs` | Paginated AI runs |

### `POST /api/crm-ai/suggest-top` response (shape)

```json
{
  "generated_at": "2026-08-04T10:00:00Z",
  "model_used": "minimaxai/minimax-m3",
  "run_id": "...",
  "candidates_considered": 42,
  "items": [
    {
      "company_id": 123,
      "rank": 1,
      "score": 0.91,
      "reasons": ["Strong financials", "Clear notes on need", "Contact email present"],
      "company": { "id": 123, "name": "...", "status": "new", "domain": "..." }
    }
  ]
}
```

Empty pool: `200` with `items: []` and a clear message (not an error).

### `POST /api/crm-ai/companies/<id>/outreach-pack` response (shape)

```json
{
  "pack_id": "...",
  "company_id": 123,
  "email_subject": "...",
  "email_body": "...",
  "proposal_markdown": "...",
  "model_used": "...",
  "run_id": "...",
  "created_at": "..."
}
```

## Data model

### `outreach_packs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `company_id` | same type as `companies.id` | FK → companies |
| `user_id` | uuid FK → users | who generated |
| `email_subject` | text | |
| `email_body` | text | |
| `proposal_markdown` | text | |
| `model_used` | varchar | |
| `created_at` | timestamptz | |

Keep history of packs; `GET` returns the latest by `created_at DESC`.

### `ai_runs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `run_type` | varchar | `suggest_top` \| `outreach_pack` |
| `company_id` | nullable, same type as `companies.id` | null for suggest_top |
| `model_used` | varchar | nullable on hard fail before model |
| `duration_ms` | int | |
| `status` | varchar | `success` \| `error` |
| `input_summary` | jsonb | compact, no secrets |
| `output_summary` | jsonb | e.g. ranks / pack ids |
| `error_message` | text | nullable |
| `created_at` | timestamptz | |

Optional cache for latest ranking: either store full `items` in `ai_runs.output_summary` for the latest successful `suggest_top`, or a small `crm_ai_rankings` table. Prefer **latest successful `ai_runs` row** for V1 to avoid extra tables.

## Scoring signals (Top 10)

Only companies with `status = 'new'` are eligible.

Signals passed to the LLM (explicit for the jury, not a black box):

- Richness of `notes`
- Presence / content of `company_financials`
- Presence of `company_emails` / contacts
- Related `prospects`
- `company_type`, `location`, `source`

Constraints:

- Hard filter: `status = 'new'`
- Cap candidates sent to LLM (e.g. max 80), with SQL pre-order by signal richness if needed
- Output max 10 items, each with `score` and 2–4 `reasons`

## Outreach pack content

**Email:** professional outreach in **French** by default (soutenance), with subject + body, personalized from company context.

**Prestation doc (markdown):** sections such as contexte, besoins perçus, périmètre proposé, livrables, modalités / next steps. Pricing remains indicative / placeholder unless financials justify ranges — do not invent fake signed contracts.

Context tools load: company row, notes, financials, emails, prospects.

## UI

### CRM list / Kanban

- Admin button **“Top 10 à contacter”**
- Panel/modal: ranked list (score + reasons), click → company detail
- Show last run timestamp + **Régénérer**

### Company detail (primary)

- **Outreach pack** section:
  - Generate / Regenerate
  - Tabs: Email | Prestation
  - Copy, download `.md`
  - Show linked run meta (model, duration) for technical demo
- Existing pack shown by default; regenerate asks confirmation

### Observability

- Route `/admin/ai-runs`: table of `run_type`, company, model, duration, status
- Link from CRM header / sidebar for quick demo jump

### Error / loading UX

- 0 `new` companies → clear empty state
- In-flight generation → spinner + disable double submit
- LLM failure → toast + `ai_runs.status=error`
- Company missing → 404; non-admin → 403
- All models fail → 503

## Error handling & performance

- Reuse NVIDIA retryable fallback from `nvidia_llm.generate_text`
- Auth / invalid key: fail fast (same as posts)
- Parse failures: fail with clear API error + `ai_runs.status=error` (no repair-loop in V1)
- Ranking candidate cap to bound latency/cost

## Testing (V1)

- Unit: JSON parse / ranking filter rejects non-`new` if leaked into payload
- API: admin-only gates; empty `new` pool; happy-path shapes
- Manual demo script: top 10 → detail → pack → ai-runs

## Future (explicitly out of V1)

- LangChain `create_agent` free-form with `@tool`s
- RAG over notes/emails
- PDF + SMTP
- Auto status transition `new` → `contacted`
- Image generation for proposals
