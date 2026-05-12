from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from supabase import create_client, Client

from ..services.openai_vector_stores import (
    delete_document_from_openai_vector_store,
    search_workspace_openai_vector_store,
    sync_document_to_openai_vector_store,
)

logger = logging.getLogger("immosimple_agent.supabase_tools")


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


@lru_cache(maxsize=1)
def _get_client() -> Client | None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)


def get_supabase_client() -> Client | None:
    return _get_client()


def _fetch_tenant_context_sync(workspace_id: str, tenant_id: str) -> str:
    sb = _get_client()
    if not sb:
        return ""

    try:
        tenant_res = (
            sb.table("tenants")
            .select("*")
            .eq("id", tenant_id)
            .eq("workspace_id", workspace_id)
            .single()
            .execute()
        )
        if not tenant_res.data:
            return ""
        t = tenant_res.data

        lease_res = (
            sb.table("leases")
            .select("*, lots(*)")
            .eq("tenant_id", tenant_id)
            .eq("status", "active")
            .limit(1)
            .execute()
        )

        lines = [
            f"Locataire : {t['first_name']} {t['last_name']}",
            f"Email : {t['email']}",
        ]
        if t.get("phone"):
            lines.append(f"Téléphone : {t['phone']}")

        if lease_res.data:
            lease = lease_res.data[0]
            lot = lease.get("lots") or {}
            if isinstance(lot, list):
                lot = lot[0] if lot else {}
            lines += [
                f"Bien loué : {lot.get('address', '')}, {lot.get('postal_code', '')} {lot.get('city', '')}",
                f"Type : {lot.get('type', '')} — {lot.get('area_m2', '?')} m²",
                f"Loyer HC : {lease['rent_amount']} € — Charges : {lease['charges_amount']} €",
                f"Entrée dans les lieux : {lease['start_date']}",
            ]

        return "\n".join(lines)
    except Exception:
        return ""


async def fetch_tenant_context(workspace_id: str, tenant_id: str | None) -> str:
    if not tenant_id:
        return ""
    return await asyncio.to_thread(_fetch_tenant_context_sync, workspace_id, tenant_id)


@dataclass(frozen=True)
class DocumentSearchResult:
    chunk_id: str
    document_id: str
    file_name: str
    doc_type: str
    status: str
    content: str
    score: float
    source: str
    page_number: int | None = None
    lot_id: str | None = None
    tenant_id: str | None = None
    metadata: dict[str, Any] | None = None


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _clean_line(value: Any) -> str:
    text = str(value or "").replace("\r", "\n")
    return "\n".join(line.strip() for line in text.splitlines() if line.strip()).strip()


def _json_excerpt(value: Any, max_chars: int = 5000) -> str:
    try:
        raw = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True)
    except TypeError:
        raw = str(value)
    return raw[:max_chars]


def _build_document_index_text(doc: dict[str, Any], tenant_names: list[str]) -> str:
    extracted = _as_dict(doc.get("extracted_data"))
    lines: list[str] = [
        f"Document: {doc.get('file_name', '')}",
        f"Type: {doc.get('doc_type', 'autre')}",
        f"Statut: {doc.get('status', '')}",
    ]

    if doc.get("lot_id"):
        lines.append(f"Lot lié: {doc['lot_id']}")
    if doc.get("tenant_id"):
        lines.append(f"Locataire principal lié: {doc['tenant_id']}")
    if tenant_names:
        lines.append("Locataires liés: " + ", ".join(tenant_names))

    simple_fields = [
        ("Résumé", extracted.get("summary")),
        ("Adresse du bien", extracted.get("property_address")),
        ("Ville", extracted.get("property_city")),
        ("Code postal", extracted.get("property_postal_code")),
        ("Surface", extracted.get("property_area_m2")),
        ("Date du document", extracted.get("document_date")),
        ("Loyer", extracted.get("rent_amount")),
        ("Charges", extracted.get("charges_amount")),
        ("Bailleur", extracted.get("landlord_last_name")),
    ]
    for label, value in simple_fields:
        if value not in (None, "", []):
            lines.append(f"{label}: {_clean_line(value)}")

    tenants = _as_list(extracted.get("tenants"))
    if tenants:
        lines.append("Locataires extraits:")
        for tenant in tenants:
            t = _as_dict(tenant)
            name = " ".join(
                part for part in [str(t.get("first_name") or ""), str(t.get("last_name") or "")]
                if part
            ).strip()
            email = t.get("email")
            if name or email:
                lines.append(f"- {name}{f' <{email}>' if email else ''}".strip())

    key_facts = _as_list(extracted.get("key_facts"))
    if key_facts:
        lines.append("Faits clés extraits:")
        for fact in key_facts:
            f = _as_dict(fact)
            label = f.get("label") or f.get("name") or "Fait"
            value = f.get("value") or f.get("text")
            page = f.get("page") or f.get("page_number")
            if value:
                suffix = f" (page {page})" if page else ""
                lines.append(f"- {label}: {_clean_line(value)}{suffix}")

    clauses = _as_list(extracted.get("key_clauses"))
    if clauses:
        lines.append("Clauses et passages utiles:")
        for clause in clauses:
            c = _as_dict(clause)
            title = c.get("title") or c.get("label") or "Clause"
            text = c.get("text") or c.get("summary") or c.get("excerpt")
            page = c.get("page") or c.get("page_number")
            if text:
                suffix = f" (page {page})" if page else ""
                lines.append(f"- {title}{suffix}: {_clean_line(text)}")

    action_items = _as_list(extracted.get("action_items"))
    if action_items:
        lines.append("Actions ou échéances détectées:")
        for item in action_items:
            i = _as_dict(item)
            label = i.get("label") or i.get("type") or "Action"
            due = i.get("due_date") or i.get("date")
            text = i.get("text") or i.get("description")
            lines.append(f"- {label}: {_clean_line(text or '')}{f' ({due})' if due else ''}")

    parsed_text = _clean_line(doc.get("parsed_text"))
    if parsed_text:
        lines.append("Texte extrait du document:")
        lines.append(parsed_text)
    elif extracted:
        lines.append("Données structurées extraites:")
        lines.append(_json_excerpt(extracted))

    return "\n".join(line for line in lines if line).strip()


def _insert_processing_job(
    sb: Client,
    *,
    workspace_id: str,
    document_id: str | None,
    stage: str,
    status: str,
    provider: str | None = None,
    model: str | None = None,
    input_data: dict[str, Any] | None = None,
) -> str | None:
    try:
        res = (
            sb.table("document_processing_jobs")
            .insert(
                {
                    "workspace_id": workspace_id,
                    "document_id": document_id,
                    "stage": stage,
                    "status": status,
                    "provider": provider,
                    "model": model,
                    "input": input_data or {},
                    "started_at": _utcnow() if status == "running" else None,
                    "attempts": 1 if status == "running" else 0,
                }
            )
            .select("id")
            .single()
            .execute()
        )
        return res.data.get("id") if res.data else None
    except Exception:
        logger.debug("processing_job_insert_failed", exc_info=True)
        return None


def _update_processing_job(
    sb: Client,
    job_id: str | None,
    *,
    status: str,
    output: dict[str, Any] | None = None,
    error: str | None = None,
) -> None:
    if not job_id:
        return
    try:
        patch: dict[str, Any] = {"status": status, "finished_at": _utcnow()}
        if output is not None:
            patch["output"] = output
        if error:
            patch["error"] = error[:4000]
        sb.table("document_processing_jobs").update(patch).eq("id", job_id).execute()
    except Exception:
        logger.debug("processing_job_update_failed job_id=%s", job_id, exc_info=True)


def _fetch_document_tenant_names(sb: Client, document_id: str, workspace_id: str) -> list[str]:
    try:
        res = (
            sb.table("document_tenants")
            .select("tenant:tenants(first_name,last_name,email)")
            .eq("document_id", document_id)
            .eq("workspace_id", workspace_id)
            .execute()
        )
    except Exception:
        logger.debug("document_tenant_fetch_failed document_id=%s", document_id, exc_info=True)
        return []

    names: list[str] = []
    for row in res.data or []:
        tenant = row.get("tenant") or row.get("tenants") or {}
        if isinstance(tenant, list):
            tenant = tenant[0] if tenant else {}
        if not isinstance(tenant, dict):
            continue
        name = " ".join(
            part for part in [tenant.get("first_name"), tenant.get("last_name")] if part
        ).strip()
        email = tenant.get("email")
        if name or email:
            names.append(f"{name}{f' <{email}>' if email else ''}".strip())
    return names


def _index_document_sync(workspace_id: str, document_id: str, force: bool = False) -> dict[str, Any]:
    sb = _get_client()
    if not sb:
        raise RuntimeError("Supabase is not configured for document indexing.")

    job_id = _insert_processing_job(
        sb,
        workspace_id=workspace_id,
        document_id=document_id,
        stage="indexed",
        status="running",
        provider=(
            "openai"
            if os.environ.get("OPENAI_VECTOR_STORE_API_KEY") or os.environ.get("OPENAI_API_KEY")
            else None
        ),
        input_data={"force": force},
    )

    try:
        res = (
            sb.table("documents")
            .select("*")
            .eq("id", document_id)
            .eq("workspace_id", workspace_id)
            .single()
            .execute()
        )
        doc = res.data
        if not doc:
            raise ValueError("Document not found.")

        if doc.get("status") != "confirmed" and not force:
            output = {"indexed": False, "reason": "document_not_confirmed"}
            _update_processing_job(sb, job_id, status="succeeded", output=output)
            return output

        tenant_names = _fetch_document_tenant_names(sb, document_id, workspace_id)
        text = _build_document_index_text(doc, tenant_names)
        if not text:
            raise ValueError("No indexable document text was produced.")

        openai_vector_store = sync_document_to_openai_vector_store(
            sb,
            workspace_id=workspace_id,
            document=doc,
            index_text=text,
            force=force,
        )
        if not openai_vector_store.get("synced"):
            raise RuntimeError(
                f"OpenAI vector store sync failed: "
                f"{openai_vector_store.get('reason') or openai_vector_store.get('error') or 'unknown'}"
            )

        sb.table("documents").update(
            {
                "processing_status": "indexed",
                "indexed_at": _utcnow(),
                "parser_provider": doc.get("parser_provider") or "native-llm",
            }
        ).eq("id", document_id).eq("workspace_id", workspace_id).execute()

        output = {
            "indexed": True,
            "retrieval_provider": "openai_vector_store",
            "vector_store_id": openai_vector_store.get("vector_store_id"),
            "external_file_id": openai_vector_store.get("file_id"),
            "text_chars": len(text),
        }
        _update_processing_job(sb, job_id, status="succeeded", output=output)
        return output
    except Exception as exc:
        _update_processing_job(sb, job_id, status="failed", error=str(exc))
        logger.exception("document_index_failed workspace_id=%s document_id=%s", workspace_id, document_id)
        raise


def _candidate_document_ids(
    sb: Client,
    workspace_id: str,
    *,
    tenant_id: str | None = None,
    lot_id: str | None = None,
    include_pending: bool = False,
) -> list[str] | None:
    if not tenant_id and not lot_id and not include_pending:
        return None

    query = sb.table("documents").select("id").eq("workspace_id", workspace_id)
    if not include_pending:
        query = query.eq("status", "confirmed")
    if lot_id:
        query = query.eq("lot_id", lot_id)

    try:
        rows = query.execute().data or []
    except Exception:
        logger.exception("document_candidate_fetch_failed workspace_id=%s", workspace_id)
        return []

    ids = {str(row["id"]) for row in rows if row.get("id")}
    if tenant_id:
        try:
            linked_rows = (
                sb.table("document_tenants")
                .select("document_id")
                .eq("workspace_id", workspace_id)
                .eq("tenant_id", tenant_id)
                .execute()
                .data
                or []
            )
        except Exception:
            logger.exception("document_tenant_candidate_fetch_failed workspace_id=%s", workspace_id)
            linked_rows = []
        linked_ids = {str(row["document_id"]) for row in linked_rows if row.get("document_id")}
        direct_query = (
            sb.table("documents")
            .select("id")
            .eq("workspace_id", workspace_id)
            .eq("tenant_id", tenant_id)
        )
        if not include_pending:
            direct_query = direct_query.eq("status", "confirmed")
        if lot_id:
            direct_query = direct_query.eq("lot_id", lot_id)
        direct_ids = {str(row["id"]) for row in (direct_query.execute().data or []) if row.get("id")}
        allowed_by_tenant = linked_ids | direct_ids
        ids = ids & allowed_by_tenant

    return sorted(ids)


async def index_document(workspace_id: str, document_id: str, force: bool = False) -> dict[str, Any]:
    return await asyncio.to_thread(_index_document_sync, workspace_id, document_id, force)


def _search_documents_sync(
    workspace_id: str,
    query: str,
    *,
    tenant_id: str | None = None,
    lot_id: str | None = None,
    include_pending: bool = False,
    match_count: int = 8,
) -> list[DocumentSearchResult]:
    sb = _get_client()
    if not sb:
        return []

    document_ids = _candidate_document_ids(
        sb,
        workspace_id,
        tenant_id=tenant_id,
        lot_id=lot_id,
        include_pending=include_pending,
    )
    if document_ids == []:
        return []

    rows = search_workspace_openai_vector_store(
        sb,
        workspace_id=workspace_id,
        query=query,
        document_ids=document_ids,
        include_pending=include_pending,
        match_count=match_count,
    )
    results: list[DocumentSearchResult] = []
    for row in rows:
        results.append(
            DocumentSearchResult(
                chunk_id=str(row.get("chunk_id")),
                document_id=str(row.get("document_id")),
                file_name=str(row.get("file_name") or ""),
                doc_type=str(row.get("doc_type") or "autre"),
                status=str(row.get("status") or ""),
                content=str(row.get("content") or ""),
                score=float(row.get("score") or 0),
                source=str(row.get("source") or "unknown"),
                page_number=row.get("page_number"),
                lot_id=row.get("lot_id"),
                tenant_id=row.get("tenant_id"),
                metadata=_as_dict(row.get("metadata")),
            )
        )
    return results


async def search_documents(
    workspace_id: str,
    query: str,
    *,
    tenant_id: str | None = None,
    lot_id: str | None = None,
    include_pending: bool = False,
    match_count: int = 8,
) -> list[DocumentSearchResult]:
    if not query.strip():
        return []
    return await asyncio.to_thread(
        _search_documents_sync,
        workspace_id,
        query,
        tenant_id=tenant_id,
        lot_id=lot_id,
        include_pending=include_pending,
        match_count=match_count,
    )


async def unindex_document(workspace_id: str, document_id: str) -> dict[str, Any]:
    sb = _get_client()
    if not sb:
        raise RuntimeError("Supabase is not configured for document unindexing.")
    return await asyncio.to_thread(
        delete_document_from_openai_vector_store,
        sb,
        workspace_id=workspace_id,
        document_id=document_id,
    )


async def fetch_document_context(
    workspace_id: str,
    query: str,
    *,
    tenant_id: str | None = None,
    lot_id: str | None = None,
    include_pending: bool = False,
    match_count: int = 5,
) -> str:
    results = await search_documents(
        workspace_id,
        query,
        tenant_id=tenant_id,
        lot_id=lot_id,
        include_pending=include_pending,
        match_count=match_count,
    )
    if not results:
        return ""

    blocks: list[str] = []
    for idx, result in enumerate(results, start=1):
        page = f", page {result.page_number}" if result.page_number else ""
        trust = "confirmé" if result.status == "confirmed" else "non confirmé"
        content = result.content[:1400]
        blocks.append(
            f"[Source {idx}: {result.file_name} ({result.doc_type}, {trust}{page}, "
            f"document_id={result.document_id})]\n{content}"
        )
    return "\n\n".join(blocks)
