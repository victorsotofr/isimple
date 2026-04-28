from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Any, Literal

from langchain_anthropic import ChatAnthropic
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

logger = logging.getLogger("immosimple_agent.ai")

AIProviderName = Literal["anthropic", "openai", "gemini"]

SUPPORTED_PROVIDERS: tuple[AIProviderName, ...] = ("anthropic", "openai", "gemini")

DEFAULT_MODELS: dict[AIProviderName, str] = {
    "anthropic": "claude-sonnet-4-20250514",
    "openai": "gpt-4o-mini",
    "gemini": "gemini-2.5-flash",
}

ENV_KEYS: dict[AIProviderName, str] = {
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
    "gemini": "GEMINI_API_KEY",
}

MODEL_ENV_KEYS: dict[AIProviderName, str] = {
    "anthropic": "ANTHROPIC_MODEL",
    "openai": "OPENAI_MODEL",
    "gemini": "GEMINI_MODEL",
}

SYSTEM_PROMPT = """\
Tu es l'assistant IA d'ImmoSimple, spécialisé dans la gestion locative en France.

## Rôle
Tu aides les propriétaires bailleurs et gestionnaires immobiliers à :
- Communiquer avec leurs locataires de façon professionnelle et bienveillante
- Traiter efficacement les demandes de maintenance, réclamations et questions courantes
- Rédiger des courriers, e-mails et SMS adaptés à chaque situation
- Comprendre et appliquer le cadre juridique de la location (loi ALUR, loi Élan, bail d'habitation,
  état des lieux, dépôt de garantie, charges récupérables, préavis, congé pour vente/reprise, etc.)

## Catégories de demandes
Les messages des locataires entrent généralement dans l'une de ces catégories :
- **maintenance** : demande de réparation ou d'intervention technique
- **paiement** : question sur le loyer, les charges, une quittance ou un retard
- **réclamation** : plainte sur un voisin, le bâtiment ou la gestion
- **document** : demande d'attestation, de bail, de quittance, d'état des lieux
- **information** : question générale sur le logement ou le contrat
- **autre** : ne rentre pas dans les catégories précédentes

## Règles
- Réponds toujours en français, sauf si le locataire écrit dans une autre langue.
- Adopte un ton professionnel et bienveillant — jamais condescendant.
- Pour les conseils juridiques complexes, recommande de consulter un professionnel (avocat, ADIL).
- Ne divulgue jamais d'informations confidentielles sur d'autres locataires ou propriétaires.
- En cas d'urgence (fuite d'eau, panne de chauffage en hiver), priorise la mise en sécurité.
"""


class AIConfigError(RuntimeError):
    """Raised when the selected provider is not configured correctly."""


@dataclass(frozen=True)
class AIConfig:
    provider: AIProviderName
    model: str


@dataclass(frozen=True)
class AIResult:
    text: str
    provider: AIProviderName
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: int = 0


def normalize_provider(provider: str | None) -> AIProviderName:
    candidate = (provider or os.environ.get("AI_PROVIDER") or "openai").lower().strip()
    if candidate not in SUPPORTED_PROVIDERS:
        allowed = ", ".join(SUPPORTED_PROVIDERS)
        raise AIConfigError(f"Provider IA invalide: {candidate}. Valeurs possibles: {allowed}.")
    return candidate  # type: ignore[return-value]


def resolve_config(provider: str | None = None, model: str | None = None) -> AIConfig:
    resolved_provider = normalize_provider(provider)
    resolved_model = (
        model
        or os.environ.get(MODEL_ENV_KEYS[resolved_provider])
        or DEFAULT_MODELS[resolved_provider]
    ).strip()
    if not resolved_model:
        raise AIConfigError(f"Modèle IA manquant pour le provider {resolved_provider}.")
    api_key_name = ENV_KEYS[resolved_provider]
    if not os.environ.get(api_key_name):
        raise AIConfigError(
            f"Configuration IA incomplète: variable {api_key_name} manquante pour {resolved_provider}."
        )
    return AIConfig(provider=resolved_provider, model=resolved_model)


def get_chat_model(
    provider: str | None = None,
    model: str | None = None,
    max_tokens: int = 1024,
) -> tuple[BaseChatModel, AIConfig]:
    config = resolve_config(provider=provider, model=model)
    if config.provider == "anthropic":
        return ChatAnthropic(model=config.model, max_tokens=max_tokens), config
    if config.provider == "openai":
        return ChatOpenAI(model=config.model, max_tokens=max_tokens, temperature=0.2), config
    if config.provider == "gemini":
        return (
            ChatGoogleGenerativeAI(
                model=config.model,
                max_output_tokens=max_tokens,
                temperature=0.2,
            ),
            config,
        )
    raise AIConfigError(f"Provider IA non supporté: {config.provider}.")


def _content_to_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                text = item.get("text") or item.get("content")
                if text:
                    parts.append(str(text))
        return "\n".join(parts)
    return str(content)


def _usage_tokens(response: Any) -> tuple[int, int]:
    usage = getattr(response, "usage_metadata", None) or {}
    if usage:
        return int(usage.get("input_tokens", 0) or 0), int(usage.get("output_tokens", 0) or 0)

    response_metadata = getattr(response, "response_metadata", None) or {}
    token_usage = response_metadata.get("token_usage") or response_metadata.get("usage") or {}
    return (
        int(token_usage.get("prompt_tokens", token_usage.get("input_tokens", 0)) or 0),
        int(token_usage.get("completion_tokens", token_usage.get("output_tokens", 0)) or 0),
    )


async def generate_text(
    messages: list[BaseMessage],
    *,
    provider: str | None = None,
    model: str | None = None,
    max_tokens: int = 1024,
    operation: str,
) -> AIResult:
    llm, config = get_chat_model(provider=provider, model=model, max_tokens=max_tokens)
    started = time.perf_counter()
    try:
        response = await llm.ainvoke(messages)
    except AIConfigError:
        raise
    except Exception:
        logger.exception(
            "ai_call_failed provider=%s model=%s operation=%s",
            config.provider,
            config.model,
            operation,
        )
        raise

    latency_ms = int((time.perf_counter() - started) * 1000)
    input_tokens, output_tokens = _usage_tokens(response)
    logger.info(
        "ai_call_ok provider=%s model=%s operation=%s latency_ms=%s input_tokens=%s output_tokens=%s",
        config.provider,
        config.model,
        operation,
        latency_ms,
        input_tokens,
        output_tokens,
    )

    return AIResult(
        text=_content_to_text(response.content),
        provider=config.provider,
        model=config.model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        latency_ms=latency_ms,
    )


def parse_json_object(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end < start:
            raise
        parsed = json.loads(text[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("La réponse IA n'est pas un objet JSON.")
    return parsed


async def generate_json(
    system: str,
    prompt: str,
    *,
    provider: str | None = None,
    model: str | None = None,
    max_tokens: int = 1024,
    operation: str,
) -> tuple[dict[str, Any], AIResult]:
    result = await generate_text(
        [SystemMessage(content=system), HumanMessage(content=prompt)],
        provider=provider,
        model=model,
        max_tokens=max_tokens,
        operation=operation,
    )
    return parse_json_object(result.text), result
