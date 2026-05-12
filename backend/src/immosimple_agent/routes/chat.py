from __future__ import annotations

from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage, AIMessage

from ..graphs.inbox import inbox_graph
from ..models.requests import ChatRequest
from ..models.responses import ChatResponse
from ..services.ai import AIConfigError
from ..services.identity import IdentityResolution, resolve_tenant_identity
from ..tools.supabase_tools import get_supabase_client

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse, operation_id="chat")
async def chat(request: ChatRequest) -> ChatResponse:
    messages = [
        HumanMessage(content=m.content) if m.role == "user" else AIMessage(content=m.content)
        for m in request.messages
    ]

    try:
        sb = get_supabase_client()
        identity = (
            resolve_tenant_identity(
                sb,
                workspace_id=request.workspace_id,
                tenant_id=request.tenant_id,
                conversation_id=request.conversation_id,
                sender_email=request.sender_email,
                sender_phone=request.sender_phone,
            )
            if sb
            else IdentityResolution(tenant_id=request.tenant_id, confidence=0.0, reason="supabase_unavailable")
        )
        result = await inbox_graph.ainvoke({
            "workspace_id": request.workspace_id,
            "tenant_id": identity.tenant_id,
            "messages": messages,
            "system_context": request.system_context,
            "tenant_context": "",
            "document_context": "",
            "reply": "",
            "provider": "",
            "model": "",
            "input_tokens": 0,
            "output_tokens": 0,
            "ai_provider": request.ai_provider,
            "ai_model": request.ai_model,
            "latency_ms": 0,
        })
        return ChatResponse(
            reply=result["reply"],
            provider=result["provider"],
            model=result["model"],
            input_tokens=result["input_tokens"],
            output_tokens=result["output_tokens"],
            latency_ms=result["latency_ms"],
            tenant_id=identity.tenant_id,
            identity_confidence=identity.confidence,
            identity_reason=identity.reason,
        )
    except AIConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
