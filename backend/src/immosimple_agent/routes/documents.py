from __future__ import annotations

import os

from fastapi import APIRouter, Header, HTTPException

from ..models.requests import DocumentIndexRequest, DocumentSearchRequest, DocumentUnindexRequest
from ..models.responses import (
    DocumentIndexResponse,
    DocumentSearchResponse,
    DocumentSearchResultResponse,
)
from ..tools.supabase_tools import index_document, search_documents, unindex_document

router = APIRouter(tags=["documents"])


def require_internal_token(x_agent_token: str | None) -> None:
    expected = os.environ.get("AGENT_INTERNAL_TOKEN")
    if expected and x_agent_token != expected:
        raise HTTPException(status_code=401, detail="Invalid internal agent token.")


@router.post(
    "/documents/index",
    response_model=DocumentIndexResponse,
    operation_id="index_document",
)
async def index_document_route(
    request: DocumentIndexRequest,
    x_agent_token: str | None = Header(None, alias="X-Agent-Token"),
) -> DocumentIndexResponse:
    require_internal_token(x_agent_token)
    try:
        result = await index_document(
            request.workspace_id,
            request.document_id,
            force=request.force,
        )
        return DocumentIndexResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post(
    "/documents/unindex",
    response_model=dict,
    operation_id="unindex_document",
)
async def unindex_document_route(
    request: DocumentUnindexRequest,
    x_agent_token: str | None = Header(None, alias="X-Agent-Token"),
) -> dict:
    require_internal_token(x_agent_token)
    try:
        return await unindex_document(request.workspace_id, request.document_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post(
    "/documents/search",
    response_model=DocumentSearchResponse,
    operation_id="search_documents",
)
async def search_documents_route(
    request: DocumentSearchRequest,
    x_agent_token: str | None = Header(None, alias="X-Agent-Token"),
) -> DocumentSearchResponse:
    require_internal_token(x_agent_token)
    try:
        results = await search_documents(
            request.workspace_id,
            request.query,
            tenant_id=request.tenant_id,
            lot_id=request.lot_id,
            include_pending=request.include_pending,
            match_count=request.match_count,
        )
        return DocumentSearchResponse(
            results=[
                DocumentSearchResultResponse(
                    chunk_id=r.chunk_id,
                    document_id=r.document_id,
                    file_name=r.file_name,
                    doc_type=r.doc_type,
                    status=r.status,
                    content=r.content,
                    score=r.score,
                    source=r.source,
                    page_number=r.page_number,
                    lot_id=r.lot_id,
                    tenant_id=r.tenant_id,
                    metadata=r.metadata,
                )
                for r in results
            ]
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
