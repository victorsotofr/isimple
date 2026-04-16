from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..graphs.draft import draft_graph
from ..models.requests import DraftRequest
from ..models.responses import DraftResponse

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
        })
        return DraftResponse(
            draft=result["draft"],
            subject=result["final_subject"],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
