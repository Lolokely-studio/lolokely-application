import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
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
        SystemMessage(content=system_instruction),
        HumanMessage(content=user_prompt),
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
        except ValueError as e:
            # Empty response from a model — try next; missing API key should abort
            if "API key" in str(e) or "nvapi-" in str(e):
                raise
            last_error = e
            print(f"[nvidia_llm] empty/invalid response on {model}: {e}")
            continue
        except Exception as e:
            last_error = e
            if is_retryable_error(e):
                print(f"[nvidia_llm] retryable error on {model}: {e}")
            else:
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
        messages = [
            HumanMessage(
                content=[
                    {
                        "type": "text",
                        "text": (
                            "Describe this image for social media post generation. "
                            "Focus on subject, setting, mood, colors, text in image, "
                            "and any branding or product details. Be concise (max 120 words)."
                        ),
                    },
                    {"type": "image_url", "image_url": {"url": media_url}},
                ]
            )
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
