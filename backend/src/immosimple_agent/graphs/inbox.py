from __future__ import annotations

from typing import TypedDict

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import BaseMessage, SystemMessage
from langgraph.graph import StateGraph, START, END

from ..services.ai import MODEL, SYSTEM_PROMPT
from ..tools.supabase_tools import fetch_tenant_context


class InboxState(TypedDict):
    workspace_id: str
    tenant_id: str | None
    messages: list[BaseMessage]
    system_context: str | None
    tenant_context: str
    reply: str
    model: str
    input_tokens: int
    output_tokens: int


async def node_fetch_context(state: InboxState) -> dict:
    context = await fetch_tenant_context(state["workspace_id"], state.get("tenant_id"))
    return {"tenant_context": context}


async def node_generate_reply(state: InboxState) -> dict:
    llm = ChatAnthropic(model=MODEL, max_tokens=1024)

    system_parts = [SYSTEM_PROMPT]
    if state.get("tenant_context"):
        system_parts.append(f"## Contexte du locataire\n{state['tenant_context']}")
    if state.get("system_context"):
        system_parts.append(state["system_context"])

    response = await llm.ainvoke(
        [SystemMessage(content="\n\n".join(system_parts))] + list(state["messages"])
    )

    usage = getattr(response, "usage_metadata", None) or {}
    content = response.content if isinstance(response.content, str) else str(response.content)

    return {
        "reply": content,
        "model": MODEL,
        "input_tokens": usage.get("input_tokens", 0),
        "output_tokens": usage.get("output_tokens", 0),
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
