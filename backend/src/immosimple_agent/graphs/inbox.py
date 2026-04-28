from __future__ import annotations

from typing import TypedDict

from langchain_core.messages import BaseMessage, SystemMessage
from langgraph.graph import StateGraph, START, END

from ..services.ai import SYSTEM_PROMPT, generate_text
from ..tools.supabase_tools import fetch_tenant_context


class InboxState(TypedDict):
    workspace_id: str
    tenant_id: str | None
    messages: list[BaseMessage]
    system_context: str | None
    tenant_context: str
    reply: str
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    ai_provider: str | None
    ai_model: str | None
    latency_ms: int


async def node_fetch_context(state: InboxState) -> dict:
    context = await fetch_tenant_context(state["workspace_id"], state.get("tenant_id"))
    return {"tenant_context": context}


async def node_generate_reply(state: InboxState) -> dict:
    system_parts = [SYSTEM_PROMPT]
    if state.get("tenant_context"):
        system_parts.append(f"## Contexte du locataire\n{state['tenant_context']}")
    if state.get("system_context"):
        system_parts.append(state["system_context"])

    result = await generate_text(
        [SystemMessage(content="\n\n".join(system_parts))] + list(state["messages"]),
        provider=state.get("ai_provider"),
        model=state.get("ai_model"),
        max_tokens=1024,
        operation="chat",
    )

    return {
        "reply": result.text,
        "provider": result.provider,
        "model": result.model,
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "latency_ms": result.latency_ms,
    }


def build() -> object:
    g = StateGraph(InboxState)
    g.add_node("fetch_context", node_fetch_context)
    g.add_node("generate_reply", node_generate_reply)
    g.add_edge(START, "fetch_context")
    g.add_edge("fetch_context", "generate_reply")
    g.add_edge("generate_reply", END)
    return g.compile()


inbox_graph = build()
