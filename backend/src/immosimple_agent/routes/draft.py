from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..graphs.draft import draft_graph
from ..models.requests import DraftRequest
from ..models.responses import DraftResponse
from ..services.ai import AIConfigError

router = APIRouter(tags=["draft"])


@router.post("/draft", response_model=DraftResponse, operation_id="draft")
async def draft(request: DraftRequest) -> DraftResponse:
    try:
        result = await draft_graph.ainvoke({
            "workspace_id": request.workspace_id,
            "tenant_id": request.tenant_id,
            "subject": request.subject,
            "context": request.context,
            "recipient_name": request.recipient_name,
            "tone": request.tone,
            "tenant_context": "",
            "draft": "",
            "final_subject": "",
            "ai_provider": request.ai_provider,
            "ai_model": request.ai_model,
            "provider": "",
            "model": "",
            "latency_ms": 0,
        })
        return DraftResponse(
            draft=result["draft"],
            subject=result["final_subject"],
            provider=result.get("provider"),
            model=result.get("model"),
            latency_ms=result.get("latency_ms"),
        )
    except AIConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
