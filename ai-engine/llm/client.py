from __future__ import annotations

import os
from pathlib import Path
from typing import Literal, Optional

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

Provider = Literal["openai", "anthropic", "gemini"]

# Ensure .env is loaded even when modules are invoked directly (e.g. python -c ...)
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def get_provider() -> Provider:
    provider = os.getenv("LLM_PROVIDER", "openai").strip().lower()
    if provider not in {"openai", "anthropic", "gemini"}:
        raise ValueError(f"Unsupported LLM_PROVIDER '{provider}'. Use 'openai', 'anthropic', or 'gemini'.")
    return provider  # type: ignore[return-value]


def is_real_only_mode() -> bool:
    raw = os.getenv("LLM_REAL_ONLY", "false").strip().lower()
    return raw in {"1", "true", "yes", "on"}


def get_architect_llm() -> Optional[object]:
    provider = get_provider()

    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            return None
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        return ChatOpenAI(model=model, temperature=0)

    if provider == "gemini":
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            return None
        model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        return ChatGoogleGenerativeAI(model=model, google_api_key=api_key, temperature=0)

    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return None
    model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
    return ChatAnthropic(model=model, temperature=0)


def get_healer_llm() -> Optional[object]:
    return get_architect_llm()
