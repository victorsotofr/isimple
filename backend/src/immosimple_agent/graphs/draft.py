from __future__ import annotations

from typing import TypedDict

from langgraph.graph import StateGraph, START, END

from ..services.ai import SYSTEM_PROMPT, generate_json
from ..tools.supabase_tools import fetch_tenant_context

TONE_LABELS = {
    "formal": "formel et professionnel",
    "friendly": "chaleureux et accessible",
    "neutral": "neutre et factuel",
}


class DraftState(TypedDict):
    workspace_id: str
    tenant_id: str | None
    subject: str
    context: str
    recipient_name: str | None
    tone: str
    tenant_context: str
    draft: str
    final_subject: str
    ai_provider: str | None
    ai_model: str | None
    provider: str
    model: str
    latency_ms: int


async def node_fetch_context(state: DraftState) -> dict:
    context = await fetch_tenant_context(state["workspace_id"], state.get("tenant_id"))
    return {"tenant_context": context}


async def node_generate_draft(state: DraftState) -> dict:
    tone_label = TONE_LABELS.get(state["tone"], "formel et professionnel")
    recipient = f" adressé à {state['recipient_name']}" if state.get("recipient_name") else ""

    context_parts: list[str] = []
    if state.get("tenant_context"):
        context_parts.append(f"Contexte locataire :\n{state['tenant_context']}")
    context_parts.append(state["context"])

    user_prompt = (
        f"Rédige un message{recipient} avec un ton {tone_label}.\n\n"
        f"Sujet : {state['subject']}\n\n"
        f"Contexte : {chr(10).join(context_parts)}\n\n"
        "Réponds UNIQUEMENT avec un objet JSON valide :\n"
        '{"subject": "...", "draft": "..."}'
    )

    system_parts = [SYSTEM_PROMPT]
    if state.get("tenant_context"):
        system_parts.append(f"## Contexte du locataire\n{state['tenant_context']}")

    data, ai_result = await generate_json(
        "\n\n".join(system_parts),
        user_prompt,
        provider=state.get("ai_provider"),
        model=state.get("ai_model"),
        max_tokens=1024,
        operation="draft",
    )
    return {
        "draft": data.get("draft", ""),
        "final_subject": data.get("subject", state["subject"]),
        "provider": ai_result.provider,
        "model": ai_result.model,
        "latency_ms": ai_result.latency_ms,
    }


def build() -> object:
    g = StateGraph(DraftState)
    g.add_node("fetch_context", node_fetch_context)
    g.add_node("generate_draft", node_generate_draft)
    g.add_edge(START, "fetch_context")
    g.add_edge("fetch_context", "generate_draft")
    g.add_edge("generate_draft", END)
    return g.compile()


draft_graph = build()
