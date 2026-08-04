# NVIDIA LangChain Post Generation — Design Spec

**Date:** 2026-07-30  
**Status:** Approved for planning  
**Context:** Replace Google Gemini post generation with LangChain `ChatNVIDIA` + multi-model fallback and optional image-aware generation.

## Goals

- Generate 3 social media post variations via NVIDIA API Catalog (`NVIDIA_API_KEY`).
- Survive NVIDIA overload by falling back across text models.
- When an image is uploaded, enrich generation with a vision-model description of that image (theme + description + image analysis).
- Keep the existing REST contract for the frontend (`POST /api/posts/generate` → 3 variations), extended with optional media and metadata.

## Non-goals (V1)

- SSE / token streaming to the UI
- Video frame analysis (video stays text-only for generation)
- Direct multimodal generation with `nvidia/ising-calibration-1.5-31b` (reserved for V1.1)
- Dual-provider fallback to Google Gemini
- Changing auth, save history UX, or post preferences logic beyond storing new metadata

## Model catalog

| Role | Model ID | V1 usage |
|------|----------|----------|
| Text default | `minimaxai/minimax-m3` | Primary post generation |
| Text fallback 1 | `z-ai/glm-5.2` | On overload / transient failure |
| Text fallback 2 | `nvidia/nemotron-3-ultra-550b-a55b` | Last text resort |
| Vision | `google/diffusiongemma-26b-a4b-it` | Image description |
| Multimodal (reserved) | `nvidia/ising-calibration-1.5-31b` | Not used in V1 pipeline |

**Generation params (text + vision clients):** `temperature=1`, `top_p=1`, `max_tokens=16384`, `seed=42` (overridable via env).

**Fallback triggers:** HTTP 429 / 503, timeouts, and error messages indicating overload / capacity / rate limit. Auth / invalid-key errors do **not** fall through the model chain (fail fast with 400/503).

## Pipeline (Approach A — 2 steps)

```
Request (theme, description, platform, …, optional media_url/media_type)
        │
        ├─ media_type == "image" and media_url present
        │         │
        │         ▼
        │   ChatNVIDIA(diffusiongemma) → image_analysis text
        │   (on failure → image_analysis = null, continue)
        │
        ▼
Text chain: minimax → glm → nemotron
        │
        ▼
Parse JSON → 3 variation strings
        │
        ▼
Response: { variations, model_used, image_analysis, …echo fields }
```

- No media or `media_type == "video"` → skip vision; text-only generation.
- Vision failure must not block generation.

## API changes

### `POST /api/posts/generate`

**Request (extended):**

| Field | Required | Notes |
|-------|----------|--------|
| `theme`, `platform`, `tonality` | Yes | Unchanged |
| `description`, `language`, `target_audience` | No | Unchanged |
| `media_url` | No | Data URL / base64 (same as save today) |
| `media_type` | No | `image` or `video` |

**Response (extended):**

```json
{
  "variations": ["...", "...", "..."],
  "theme": "...",
  "description": "...",
  "platform": "...",
  "tonality": "...",
  "language": "en",
  "target_audience": "...",
  "model_used": "minimaxai/minimax-m3",
  "image_analysis": "Optional visual description or null",
  "image_model": "google/diffusiongemma-26b-a4b-it or null"
}
```

### `POST /api/posts/save`

Persist new columns when provided: `image_analysis`, `generation_model`, `image_model` (in addition to existing `media_url` / `media_type`).

## Frontend changes

- `PostGenerator.jsx`: include `media_url` / `media_type` in the **generate** payload (today they are only sent on save).
- Optionally display which model was used / that image analysis ran (minimal: no UI change required beyond sending media; metadata can be ignored by UI in V1).

## Data model

Add columns to `social_posts`:

```sql
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS image_analysis text,
  ADD COLUMN IF NOT EXISTS generation_model varchar(100),
  ADD COLUMN IF NOT EXISTS image_model varchar(100);
```

| Column | Type | Purpose |
|--------|------|---------|
| `image_analysis` | `text` | Vision model caption used for generation |
| `generation_model` | `varchar(100)` | Text model that succeeded |
| `image_model` | `varchar(100)` | Vision model used, or null |

Also update `backend/schemas/db.sql` for new installs.

## Backend architecture

| Module | Responsibility |
|--------|----------------|
| `backend/services/nvidia_llm.py` | API key, client factory, retryable `invoke_with_fallback()`, `describe_image()` |
| `backend/routes/posts.py` | Prompt assembly, JSON parse, `/generate` and `/save` wiring |
| `backend/requirements.txt` | `langchain-nvidia-ai-endpoints`, `langchain-core`; remove `google-genai` |

`describe_image(media_url)` builds a multimodal user message (text + image) for diffusiongemma and returns plain text.

`generate_text(system, user, models=TEXT_CHAIN)` tries each model in order until success.

## Environment

```env
NVIDIA_API_KEY=nvapi-...
# Optional overrides
# NVIDIA_TEXT_MODELS=minimaxai/minimax-m3,z-ai/glm-5.2,nvidia/nemotron-3-ultra-550b-a55b
# NVIDIA_VISION_MODEL=google/diffusiongemma-26b-a4b-it
# NVIDIA_TEMPERATURE=1
# NVIDIA_TOP_P=1
# NVIDIA_MAX_TOKENS=16384
# NVIDIA_SEED=42
```

## Error handling

| Case | Behavior |
|------|----------|
| Missing / malformed `NVIDIA_API_KEY` | 400 with clear message |
| All text models fail | 503 with last error summary |
| Vision fails | Log warning; continue text-only |
| Invalid JSON from LLM | Same parse fallback as today; then ValueError |

## Success criteria

- Generate without image works with default text model.
- Generate with image includes visual context in posts (spot-check).
- Simulated / real overload on first model still returns variations via fallback.
- Saved posts store `generation_model` and optional `image_analysis` / `image_model`.
- No Gemini dependency remains in runtime path.
