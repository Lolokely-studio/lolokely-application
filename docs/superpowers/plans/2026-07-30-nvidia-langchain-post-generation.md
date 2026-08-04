# NVIDIA LangChain Post Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Google Gemini with LangChain `ChatNVIDIA`, multi-model text fallback, and optional image analysis so posts are generated from theme + description (+ image).

**Architecture:** `nvidia_llm.py` owns clients, vision captioning, and text fallback. `posts.py` owns prompts and JSON parsing. Frontend sends `media_url`/`media_type` on generate. Schema adds `image_analysis`, `generation_model`, `image_model`.

**Tech Stack:** Flask, `langchain-nvidia-ai-endpoints`, `langchain-core`, PostgreSQL, React (PostGenerator).

**Spec:** `docs/superpowers/specs/2026-07-30-nvidia-langchain-post-generation-design.md`

## Global Constraints

- `NVIDIA_API_KEY` required in project root `.env` (prefix `nvapi-`).
- Text chain (in order): `minimaxai/minimax-m3` → `z-ai/glm-5.2` → `nvidia/nemotron-3-ultra-550b-a55b`.
- Vision model: `google/diffusiongemma-26b-a4b-it`.
- Params: `temperature=1`, `top_p=1`, `max_tokens=16384`, `seed=42`.
- Use `invoke()` (not stream) in V1.
- Vision failure must not block text generation.
- Video / no media → text-only.
- No automated tests: verify with `curl` + UI.
- Do not commit unless the user explicitly asks.
- Remove `google-genai` (only used by `posts.py`).

## File structure

| File | Responsibility |
|------|----------------|
| `backend/services/__init__.py` | Package marker |
| `backend/services/nvidia_llm.py` | Key, clients, fallback, `describe_image`, `generate_text` |
| `backend/routes/posts.py` | Prompts, parse, generate/save/list wiring |
| `backend/schemas/db.sql` | Document new `social_posts` columns |
| `backend/requirements.txt` | LangChain NVIDIA deps |
| `frontend/src/components/PostGenerator.jsx` | Send media on generate; pass metadata on save |
| `README.md`, `docs/06-backend-documentation.md`, `docs/07-setup-deployment.md` | Docs |

---

### Task 1: Schema — add AI metadata columns

**Files:**
- Modify: `backend/schemas/db.sql`
- Apply: live DB via SQL (Supabase / psql)

**Interfaces:**
- Produces: columns `image_analysis`, `generation_model`, `image_model` on `social_posts`

- [ ] **Step 1: Update `backend/schemas/db.sql`**

Inside `create table ... social_posts`, after `media_type`, add:

```sql
  image_analysis text,
  generation_model varchar(100),
  image_model varchar(100),
```

- [ ] **Step 2: Migrate live database**

```bash
cd backend && python - <<'PY'
from db import get_connection

sql = """
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS image_analysis text,
  ADD COLUMN IF NOT EXISTS generation_model varchar(100),
  ADD COLUMN IF NOT EXISTS image_model varchar(100);
"""
with get_connection() as conn, conn.cursor() as cur:
    cur.execute(sql)
    conn.commit()
    cur.execute(
        """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='social_posts'
          AND column_name IN ('image_analysis','generation_model','image_model')
        ORDER BY column_name
        """
    )
    print([r[0] for r in cur.fetchall()])
PY
```

Expected: `['generation_model', 'image_analysis', 'image_model']`

---

### Task 2: Update Python dependencies

**Files:**
- Modify: `backend/requirements.txt`

**Interfaces:**
- Produces: installable `langchain_nvidia_ai_endpoints` + `langchain_core`

- [ ] **Step 1: Replace Gemini dep**

Set `backend/requirements.txt` to:

```text
Flask==2.3.3
Flask-CORS==4.0.0
Flask-JWT-Extended==4.5.3
Flask-Bcrypt==1.0.1
python-dotenv==1.0.0
psycopg2-binary==2.9.7
marshmallow==3.20.1
email-validator==2.0.0
langchain-nvidia-ai-endpoints
langchain-core
```

- [ ] **Step 2: Install**

```bash
cd backend && pip install -r requirements.txt
```

Expected: `pip show langchain-nvidia-ai-endpoints` succeeds.

---

### Task 3: Create NVIDIA LLM service (fallback + vision)

**Files:**
- Create: `backend/services/__init__.py`
- Create: `backend/services/nvidia_llm.py`

**Interfaces:**
- Consumes: `NVIDIA_API_KEY`, optional `NVIDIA_TEXT_MODELS`, `NVIDIA_VISION_MODEL`, param env vars
- Produces:
  - `TEXT_MODELS: list[str]`
  - `VISION_MODEL: str`
  - `describe_image(media_url: str) -> tuple[str | None, str | None]` → `(analysis, model_or_none)`
  - `generate_text(system_instruction: str, user_prompt: str) -> tuple[str, str]` → `(content, model_used)`
  - `is_retryable_error(exc: Exception) -> bool`

- [ ] **Step 1: Create package marker**

`backend/services/__init__.py`:

```python
# Package marker for backend services
```

- [ ] **Step 2: Implement `backend/services/nvidia_llm.py`**

```python
import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_nvidia_ai_endpoints import ChatNVIDIA

_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_env_path)

DEFAULT_TEXT_MODELS = [
    "minimaxai/minimax-m3",
    "z-ai/glm-5.2",
    "nvidia/nemotron-3-ultra-550b-a55b",
]
DEFAULT_VISION_MODEL = "google/diffusiongemma-26b-a4b-it"

_RETRY_MARKERS = (
    "429",
    "503",
    "timeout",
    "timed out",
    "overloaded",
    "capacity",
    "rate limit",
    "unavailable",
    "too many requests",
    "service busy",
)


def _get_nvidia_api_key() -> str | None:
    key = os.getenv("NVIDIA_API_KEY")
    if not key:
        return None
    key = key.strip().strip('"').strip("'")
    return key if key else None


def _require_api_key() -> str:
    api_key = _get_nvidia_api_key()
    if not api_key:
        raise ValueError(
            "NVIDIA API key not configured. Set NVIDIA_API_KEY in the project root .env file. "
            "Get a key from https://build.nvidia.com/"
        )
    if not api_key.startswith("nvapi-"):
        raise ValueError(
            "Invalid NVIDIA API key format. NVIDIA_API_KEY should start with 'nvapi-'."
        )
    return api_key


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return float(raw)


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return int(raw)


def _parse_text_models() -> list[str]:
    raw = os.getenv("NVIDIA_TEXT_MODELS", "").strip()
    if not raw:
        return list(DEFAULT_TEXT_MODELS)
    models = [m.strip() for m in raw.split(",") if m.strip()]
    return models or list(DEFAULT_TEXT_MODELS)


TEXT_MODELS = _parse_text_models()
VISION_MODEL = os.getenv("NVIDIA_VISION_MODEL", DEFAULT_VISION_MODEL).strip() or DEFAULT_VISION_MODEL


def is_retryable_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(marker in msg for marker in _RETRY_MARKERS)


def get_chat_client(model: str) -> ChatNVIDIA:
    return ChatNVIDIA(
        model=model,
        api_key=_require_api_key(),
        temperature=_env_float("NVIDIA_TEMPERATURE", 1.0),
        top_p=_env_float("NVIDIA_TOP_P", 1.0),
        max_tokens=_env_int("NVIDIA_MAX_TOKENS", 16384),
        seed=_env_int("NVIDIA_SEED", 42),
    )


def generate_text(system_instruction: str, user_prompt: str) -> tuple[str, str]:
    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": user_prompt},
    ]
    last_error: Exception | None = None
    for model in TEXT_MODELS:
        try:
            response = get_chat_client(model).invoke(messages)
            content = (response.content or "").strip()
            if not content:
                raise ValueError(f"Empty response from model {model}")
            print(f"[nvidia_llm] text generation succeeded with {model}")
            return content, model
        except ValueError:
            raise
        except Exception as e:
            last_error = e
            if is_retryable_error(e):
                print(f"[nvidia_llm] retryable error on {model}: {e}")
                continue
            # Non-retryable (e.g. bad request) — try next model anyway for robustness
            print(f"[nvidia_llm] error on {model}, trying next: {e}")
            continue
    raise RuntimeError(
        f"All NVIDIA text models failed. Last error: {last_error}"
    )


def describe_image(media_url: str) -> tuple[str | None, str | None]:
    """Return (analysis_text, vision_model) or (None, None) on failure."""
    if not media_url or not str(media_url).strip():
        return None, None
    try:
        client = get_chat_client(VISION_MODEL)
        # ChatNVIDIA multimodal: user content as list of text + image_url parts
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Describe this image for social media post generation. "
                            "Focus on subject, setting, mood, colors, text in image, "
                            "and any branding or product details. Be concise (max 120 words)."
                        ),
                    },
                    {"type": "image_url", "image_url": {"url": media_url}},
                ],
            }
        ]
        response = client.invoke(messages)
        analysis = (response.content or "").strip()
        if not analysis:
            return None, None
        print(f"[nvidia_llm] image analysis succeeded with {VISION_MODEL}")
        return analysis, VISION_MODEL
    except Exception as e:
        print(f"[nvidia_llm] image analysis failed (continuing text-only): {e}")
        return None, None
```

- [ ] **Step 3: Smoke-test text generation**

```bash
cd backend && python - <<'PY'
from services.nvidia_llm import generate_text
text, model = generate_text("You are helpful.", "Reply with exactly: OK")
print(model, text)
PY
```

Expected: prints a model id and a short OK-like reply.

- [ ] **Step 4: Smoke-test image path (optional tiny PNG data URL)**

```bash
cd backend && python - <<'PY'
from services.nvidia_llm import describe_image
# 1x1 PNG
url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
analysis, model = describe_image(url)
print(model, analysis)
PY
```

Expected: either `(model, non-empty analysis)` or `(None, None)` without crashing the process.

---

### Task 4: Refactor `posts.py` generate/save for NVIDIA + image

**Files:**
- Modify: `backend/routes/posts.py`

**Interfaces:**
- Consumes: `generate_text`, `describe_image` from `services.nvidia_llm`
- Produces: `/generate` with `variations`, `model_used`, `image_analysis`, `image_model`; `/save` persists new columns

- [ ] **Step 1: Replace imports**

Remove `google` / `genai` / `ClientError` imports. At module level add:

```python
import json
import re

from services.nvidia_llm import describe_image, generate_text
```

Remove `_get_gemini_api_key` and `GEMINI_API_KEY`.

- [ ] **Step 2: Rewrite `generate_post_variations`**

```python
def generate_post_variations(
    theme,
    description,
    platform,
    tonality,
    language,
    target_audience,
    media_url=None,
    media_type=None,
):
    """Generate social media post variations using NVIDIA via LangChain."""
    try:
        image_analysis = None
        image_model = None
        if media_type == "image" and media_url:
            image_analysis, image_model = describe_image(media_url)

        system_instruction = """You are an expert Social Media Post Generator specialized in Gaming, 3D, Design, AR/VR, and engaging copywriting.

You generate engaging, platform-specific social media posts that match the specified tonality and target audience."""

        image_block = ""
        if image_analysis:
            image_block = f"\nImage analysis (use this to align the post with the visual):\n{image_analysis}\n"

        prompt = f"""Generate 3 variations of a social media post with the following specifications:

Theme: {theme}
Description: {description}
Platform: {platform}
Tonality: {tonality}
Language: {language}
Target Audience: {target_audience}
{image_block}
Requirements:
- Generate exactly 3 different variations
- Each variation should be engaging and tailored to the platform
- Match the specified tonality
- Write in {language}
- Consider the target audience: {target_audience}
- If image analysis is provided, make the copy coherent with what is visible in the image
- Make posts engaging and shareable

Format your response as a JSON array with exactly 3 objects, each with a "text" field:
[
  {{"text": "First variation text here"}},
  {{"text": "Second variation text here"}},
  {{"text": "Third variation text here"}}
]

Return ONLY the JSON array, no additional text or explanation."""

        text, model_used = generate_text(system_instruction, prompt)

        text = re.sub(r"```json\n?", "", text)
        text = re.sub(r"```\n?", "", text)
        text = text.strip()

        json_match = re.search(r"\[.*\]", text, re.DOTALL)
        if json_match:
            text = json_match.group(0)

        try:
            variations = json.loads(text)
        except json.JSONDecodeError:
            lines = [line.strip() for line in text.split("\n") if line.strip()]
            if len(lines) >= 3:
                variations = [{"text": line} for line in lines[:3]]
            else:
                raise ValueError("Could not parse response from NVIDIA API")

        if not isinstance(variations, list):
            raise ValueError("Invalid response format from NVIDIA: expected a list")

        if len(variations) < 3:
            while len(variations) < 3:
                variations.append({"text": ""})
        elif len(variations) > 3:
            variations = variations[:3]

        result = []
        for v in variations:
            if isinstance(v, dict):
                result.append(v.get("text", v.get("variation", str(v))))
            elif isinstance(v, str):
                result.append(v)
            else:
                result.append(str(v))

        return {
            "variations": result,
            "model_used": model_used,
            "image_analysis": image_analysis,
            "image_model": image_model,
        }

    except ValueError:
        raise
    except Exception as e:
        print(f"Error generating post: {str(e)}")
        traceback.print_exc()
        raise
```

- [ ] **Step 3: Update `generate_posts` route**

Read optional media; call updated helper; return metadata; replace Gemini `ClientError` handling:

```python
@posts_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_posts():
    """Generate social media post variations"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        theme = (data.get('theme') or '').strip()
        description = (data.get('description') or '').strip()
        platform = (data.get('platform') or '').strip()
        tonality = (data.get('tonality') or '').strip()
        language = (data.get('language') or 'en').strip()
        target_audience = (data.get('target_audience') or '').strip()
        media_url = (data.get('media_url') or '').strip() or None
        media_type = (data.get('media_type') or '').strip() or None

        if not all([theme, platform, tonality]):
            return jsonify({'error': 'Theme, platform, and tonality are required'}), 400

        result = generate_post_variations(
            theme, description, platform, tonality, language, target_audience,
            media_url=media_url, media_type=media_type,
        )

        return jsonify({
            'variations': result['variations'],
            'theme': theme,
            'description': description,
            'platform': platform,
            'tonality': tonality,
            'language': language,
            'target_audience': target_audience,
            'model_used': result['model_used'],
            'image_analysis': result['image_analysis'],
            'image_model': result['image_model'],
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except RuntimeError as e:
        print(f"NVIDIA generation exhausted models: {e}")
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        err = str(e).lower()
        if 'api' in err and 'key' in err:
            return jsonify({
                'error': (
                    'NVIDIA API key is invalid or not accepted. Check NVIDIA_API_KEY in the '
                    'project root .env and ensure the key is valid at https://build.nvidia.com/'
                )
            }), 503
        print(f"Error in generate_posts: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
```

- [ ] **Step 4: Update `save_post` INSERT**

Accept and store the new fields:

```python
        image_analysis = (data.get('image_analysis') or '').strip() or None
        generation_model = (data.get('generation_model') or data.get('model_used') or '').strip() or None
        image_model = (data.get('image_model') or '').strip() or None
```

Update SQL to include columns:

```sql
INSERT INTO social_posts
(id, user_id, theme, description, platform, tonality, language,
 target_audience, generated_variations, selected_variation,
 media_url, media_type, image_analysis, generation_model, image_model,
 created_at, updated_at)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
RETURNING *
```

Pass the three new values before `now, now`.

- [ ] **Step 5: Update `get_posts` SELECT**

Include `sp.image_analysis`, `sp.generation_model`, `sp.image_model` in SELECT and JSON response.

---

### Task 5: Frontend — send media on generate + metadata on save

**Files:**
- Modify: `frontend/src/components/PostGenerator.jsx`

**Interfaces:**
- Consumes: generate response fields `model_used`, `image_analysis`, `image_model`
- Produces: generate payload with media; save payload with AI metadata

- [ ] **Step 1: State for AI metadata**

Add:

```javascript
const [modelUsed, setModelUsed] = useState(null);
const [imageAnalysis, setImageAnalysis] = useState(null);
const [imageModel, setImageModel] = useState(null);
```

- [ ] **Step 2: Update `handleGenerate`**

```javascript
      const response = await postService.generatePosts({
        ...formData,
        media_url: mediaPreview,
        media_type: mediaType,
      });
      setVariations(response.variations || []);
      setModelUsed(response.model_used || null);
      setImageAnalysis(response.image_analysis || null);
      setImageModel(response.image_model || null);
      if (response.variations && response.variations.length > 0) {
        setSelectedVariation(response.variations[0]);
      }
```

- [ ] **Step 3: Update `handleSave`**

```javascript
      await postService.savePost({
        ...formData,
        generated_variations: variations,
        selected_variation: selectedVariation,
        media_url: mediaPreview,
        media_type: mediaType,
        image_analysis: imageAnalysis,
        generation_model: modelUsed,
        image_model: imageModel,
      });
```

Reset the three new state fields in the success timeout alongside media/form resets.

- [ ] **Step 4: Optional tiny hint under variations**

If `modelUsed` is set, show muted text: `Generated with {modelUsed}` (and if `imageAnalysis`, a one-line note that image context was used). Keep styling consistent with existing UI — no new card chrome.

---

### Task 6: End-to-end verification

**Files:**
- Read-only: running app

- [ ] **Step 1: Start backend**

```bash
cd backend && python app.py
```

Expected: no import errors.

- [ ] **Step 2: Login + generate without image**

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' | python -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

curl -s -X POST http://localhost:5000/api/posts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "theme": "New VR game launch",
    "description": "Immersive open-world adventure",
    "platform": "Instagram",
    "tonality": "Energetic",
    "language": "en",
    "target_audience": "Gamers aged 18-35"
  }' | python -m json.tool
```

Expected: 200, 3 variations, `model_used` set, `image_analysis` null.

- [ ] **Step 3: Generate with image (UI)**

1. Open Post Generator, upload an image, fill theme/description, Generate.
2. Confirm variations reference visual context when relevant.
3. Save and confirm history still works.

- [ ] **Step 4: Confirm DB columns on a saved row**

```bash
cd backend && python - <<'PY'
from db import get_connection
from psycopg2.extras import RealDictCursor
with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
    cur.execute("""
      SELECT theme, generation_model, image_model,
             left(coalesce(image_analysis,''), 80) AS analysis_preview
      FROM social_posts ORDER BY created_at DESC LIMIT 3
    """)
    for r in cur.fetchall():
        print(dict(r))
PY
```

---

### Task 7: Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/06-backend-documentation.md`
- Modify: `docs/07-setup-deployment.md`

- [ ] **Step 1: README env block**

Replace Gemini env docs with:

```env
# NVIDIA API Configuration (LangChain ChatNVIDIA)
# Get your API key from: https://build.nvidia.com/
NVIDIA_API_KEY=nvapi-your_key_here

# Optional overrides
# NVIDIA_TEXT_MODELS=minimaxai/minimax-m3,z-ai/glm-5.2,nvidia/nemotron-3-ultra-550b-a55b
# NVIDIA_VISION_MODEL=google/diffusiongemma-26b-a4b-it
# NVIDIA_TEMPERATURE=1
# NVIDIA_TOP_P=1
# NVIDIA_MAX_TOKENS=16384
# NVIDIA_SEED=42
```

Update feature blurb: multi-model NVIDIA generation with optional image analysis.

- [ ] **Step 2: Setup/deployment env table**

Replace `GEMINI_API_KEY` with `NVIDIA_API_KEY` (+ note optional model env vars).

- [ ] **Step 3: Backend docs AI section**

Document pipeline A, fallback chain, new columns, and `services/nvidia_llm.py`.

---

## Out of scope (V1.1+)

- Direct multimodal generation with `nvidia/ising-calibration-1.5-31b`
- SSE streaming
- Video analysis

---

## Self-review

| Spec requirement | Task |
|------------------|------|
| LangChain ChatNVIDIA + NVIDIA_API_KEY | 2, 3 |
| Text fallback chain (minimax → glm → nemotron) | 3 |
| Vision diffusiongemma + non-blocking failure | 3, 4 |
| Image on generate (frontend) | 5 |
| Schema columns | 1, 4 |
| Save/list metadata | 4, 5 |
| Remove Gemini | 2, 4 |
| Docs | 7 |
| E2E verify | 6 |

No placeholders. Return shape of `generate_post_variations` is a dict (not bare list) — Task 4 route consumes that dict.
