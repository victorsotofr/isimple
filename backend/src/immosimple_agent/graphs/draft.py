from __future__ import annotations

import json
from typing import TypedDict

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END

from ..services.ai import MODEL, SYSTEM_PROMPT
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


async def node_fetch_context(state: DraftState) -> dict:
    context = await fetch_tenant_context(state["workspace_id"], state.get("tenant_id"))
    return {"tenant_context": context}


async def node_generate_draft(state: DraftState) -> dict:
    llm = ChatAnthropic(model=MODEL, max_tokens=1024)

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

    response = await llm.ainvoke([
        SystemMessage(content="\n\n".join(system_parts)),
        HumanMessage(content=user_prompt),
    ])

    raw = response.content if isinstance(response.content, str) else str(response.content)
    if raw.strip().startswith("```"):
        raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    data = json.loads(raw)
    return {
        "draft": data.get("draft", ""),
        "final_subject": data.get("subject", state["subject"]),
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
