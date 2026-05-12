from __future__ import annotations

import asyncio
from typing import TypedDict

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END

from ..services.ai import SYSTEM_PROMPT, generate_text
from ..tools.supabase_tools import fetch_document_context, fetch_tenant_context


class InboxState(TypedDict):
    workspace_id: str
    tenant_id: str | None
    messages: list[BaseMessage]
    system_context: str | None
    tenant_context: str
    document_context: str
    reply: str
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    ai_provider: str | None
    ai_model: str | None
    latency_ms: int


async def node_fetch_context(state: InboxState) -> dict:
    recent_user_messages = [
        str(message.content)
        for message in state["messages"][-4:]
        if isinstance(message, HumanMessage)
    ]
    query = "\n".join(recent_user_messages).strip()
    tenant_context, document_context = await asyncio.gather(
        fetch_tenant_context(state["workspace_id"], state.get("tenant_id")),
        fetch_document_context(
            state["workspace_id"],
            query,
            tenant_id=state.get("tenant_id"),
            match_count=5,
        )
        if query
        else asyncio.sleep(0, result=""),
    )
    return {"tenant_context": tenant_context, "document_context": document_context}


async def node_generate_reply(state: InboxState) -> dict:
    system_parts = [SYSTEM_PROMPT]
    if state.get("tenant_context"):
        system_parts.append(f"## Contexte du locataire\n{state['tenant_context']}")
    if state.get("document_context"):
        system_parts.append(
            "## Contexte documentaire récupéré\n"
            "Utilise uniquement ces sources pour affirmer des faits issus de documents. "
            "Mentionne le nom du document quand c'est utile et signale clairement toute incertitude.\n"
            f"{state['document_context']}"
        )
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
