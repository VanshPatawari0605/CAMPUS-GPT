"""Step 7: Gemini generation helpers."""
import json
import re

from google import genai
from google.genai import types

from .config import settings

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured.")
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def generate(system_instruction: str, contents: str, temperature: float = 0.2, json_mode: bool = False) -> str:
    cfg = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=temperature,
        response_mime_type="application/json" if json_mode else "text/plain",
    )
    resp = _get_client().models.generate_content(
        model=settings.gemini_model, contents=contents, config=cfg
    )
    return (resp.text or "").strip()


def parse_json(raw: str):
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"(\{.*\}|\[.*\])", raw, flags=re.DOTALL)
        if m:
            return json.loads(m.group(1))
        raise
