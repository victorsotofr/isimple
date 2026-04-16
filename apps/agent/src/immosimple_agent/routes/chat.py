from __future__ import annotations

from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage, AIMessage

from ..graphs.inbox import inbox_graph
from ..models.requests import ChatRequest
from ..models.responses import ChatResponse

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse, operation_id="chat")
async def chat(request: ChatRequest) -> ChatResponse:
    messages = [
        HumanMessage(content=m.content) if m.role == "user" else AIMessage(content=m.content)
        for m in request.messages
    ]

    try:
        result = await inbox_graph.ainvoke({
            "workspace_id": request.workspace_id,
            "tenant_id": request.tenant_id,
            "messages": messages,
            "system_context": request.system_context,
            "tenant_context": "",
            "reply": "",
            "model": "",
            "input_tokens": 0,
            "output_tokens": 0,
        })
        return ChatResponse(
            reply=result["reply"],
            model=result["model"],
            input_tokens=result["input_tokens"],
            output_tokens=result["output_tokens"],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
