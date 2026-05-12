from __future__ import annotations

import io
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

from openai import OpenAI
from supabase import Client

logger = logging.getLogger("immosimple_agent.openai_vector_stores")


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def openai_vector_stores_enabled() -> bool:
    return os.environ.get("OPENAI_VECTOR_STORES_ENABLED", "true").lower() not in {
        "0",
        "false",
        "no",
    }


def _client() -> OpenAI | None:
    api_key = os.environ.get("OPENAI_VECTOR_STORE_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


def _safe_file_name(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-")
    return cleaned[:180] or "document"


def _first_row(response_data: Any) -> dict[str, Any] | None:
    rows = response_data if isinstance(response_data, list) else []
    return rows[0] if rows else None


def _text_from_search_item(item: Any) -> str:
    parts: list[str] = []
    for block in getattr(item, "content", []) or []:
        text = getattr(block, "text", None)
        if text:
            parts.append(str(text))
    return "\n".join(parts).strip()


def _search_filters(document_ids: list[str] | None, include_pending: bool) -> dict[str, Any] | None:
    if not document_ids:
        if include_pending:
            return None
        return {"type": "eq", "key": "status", "value": "confirmed"}
    filters: list[dict[str, Any]] = [{"type": "in", "key": "document_id", "value": document_ids[:100]}]
    if not include_pending:
        filters.append({"type": "eq", "key": "status", "value": "confirmed"})
    return {"type": "and", "filters": filters}


def ensure_workspace_openai_vector_store(sb: Client, workspace_id: str) -> dict[str, Any] | None:
    client = _client()
    if not client:
        return None

    existing = _first_row(
        sb.table("workspace_vector_stores")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("provider", "openai")
        .eq("scope", "workspace")
        .is_("scope_id", "null")
        .limit(1)
        .execute()
        .data
    )
    workspace = (
        sb.table("workspaces")
        .select("id, slug, name")
        .eq("id", workspace_id)
        .single()
        .execute()
        .data
    )
    if not workspace:
        raise ValueError("Workspace not found.")

    name = f"isimple / {workspace['name']} / workspace docs"
    metadata = {
        "app": "isimple",
        "environment": os.environ.get("APP_ENV", "production"),
        "scope": "workspace",
        "workspace_id": workspace_id,
        "workspace_slug": workspace.get("slug") or "",
    }

    if existing and existing.get("external_id"):
        store = client.vector_stores.retrieve(existing["external_id"])
        status = "ready" if store.status == "completed" else "syncing"
        patch = {
            "name": name,
            "status": status,
            "usage_bytes": getattr(store, "usage_bytes", None),
            "metadata": {**(existing.get("metadata") or {}), **metadata, "openai_status": store.status},
            "updated_at": _utcnow(),
        }
        sb.table("workspace_vector_stores").update(patch).eq("id", existing["id"]).execute()
        return {**existing, **patch, "external_id": store.id}

    store = client.vector_stores.create(name=name, metadata=metadata)
    row = {
        "workspace_id": workspace_id,
        "provider": "openai",
        "scope": "workspace",
        "scope_id": None,
        "name": name,
        "external_id": store.id,
        "status": "ready" if store.status == "completed" else "syncing",
        "usage_bytes": getattr(store, "usage_bytes", None),
        "metadata": {**metadata, "openai_status": store.status},
    }
    if existing:
        sb.table("workspace_vector_stores").update(row).eq("id", existing["id"]).execute()
        return {**existing, **row}

    sb.table("workspace_vector_stores").insert(row).execute()
    created = _first_row(
        sb.table("workspace_vector_stores")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("provider", "openai")
        .eq("scope", "workspace")
        .is_("scope_id", "null")
        .limit(1)
        .execute()
        .data
    )
    return created or row


def _attributes_for_document(doc: dict[str, Any], workspace_id: str) -> dict[str, str | float | bool]:
    attrs: dict[str, str | float | bool] = {
        "workspace_id": workspace_id,
        "document_id": str(doc.get("id") or ""),
        "doc_type": str(doc.get("doc_type") or "autre"),
        "status": str(doc.get("status") or ""),
        "visibility": str(doc.get("visibility") or "internal"),
        "file_name": str(doc.get("file_name") or "")[:512],
    }
    for key in ("lot_id", "tenant_id", "content_hash"):
        value = doc.get(key)
        if value:
            attrs[key] = str(value)[:512]
    return attrs


def sync_document_to_openai_vector_store(
    sb: Client,
    *,
    workspace_id: str,
    document: dict[str, Any],
    index_text: str,
    force: bool = False,
) -> dict[str, Any]:
    if not openai_vector_stores_enabled():
        return {"enabled": False, "synced": False}

    client = _client()
    if not client:
        return {"enabled": True, "synced": False, "reason": "openai_api_key_missing"}

    store = ensure_workspace_openai_vector_store(sb, workspace_id)
    if not store or not store.get("id") or not store.get("external_id"):
        return {"enabled": True, "synced": False, "reason": "vector_store_unavailable"}

    existing = _first_row(
        sb.table("document_external_files")
        .select("*")
        .eq("workspace_vector_store_id", store["id"])
        .eq("document_id", document["id"])
        .limit(1)
        .execute()
        .data
    )
    attrs = _attributes_for_document(document, workspace_id)
    record = {
        "workspace_id": workspace_id,
        "workspace_vector_store_id": store["id"],
        "document_id": document["id"],
        "provider": "openai",
        "status": "uploading",
        "attributes": attrs,
        "error": None,
        "updated_at": _utcnow(),
    }
    if existing:
        sb.table("document_external_files").update(record).eq("id", existing["id"]).execute()
    else:
        sb.table("document_external_files").insert(record).execute()
        existing = _first_row(
            sb.table("document_external_files")
            .select("*")
            .eq("workspace_vector_store_id", store["id"])
            .eq("document_id", document["id"])
            .limit(1)
            .execute()
            .data
        )
        if not existing:
            raise RuntimeError("Unable to create document external file record.")

    try:
        if existing and existing.get("external_file_id"):
            try:
                client.vector_stores.files.delete(
                    existing["external_file_id"],
                    vector_store_id=store["external_id"],
                )
            except Exception:
                logger.debug("openai_vector_file_delete_failed", exc_info=True)
            try:
                client.files.delete(existing["external_file_id"])
            except Exception:
                logger.debug("openai_file_delete_failed", exc_info=True)

        file_name = f"{_safe_file_name(str(document.get('file_name') or document['id']))}.txt"
        payload = io.BytesIO(index_text.encode("utf-8"))
        vector_file = client.vector_stores.files.upload_and_poll(
            vector_store_id=store["external_id"],
            file=(file_name, payload, "text/plain"),
            attributes=attrs,
            chunking_strategy={
                "type": "static",
                "static": {
                    "max_chunk_size_tokens": 800,
                    "chunk_overlap_tokens": 200,
                },
            },
        )
        status = "indexed" if vector_file.status == "completed" else "uploading"
        patch = {
            "external_file_id": getattr(vector_file, "id", None),
            "external_vector_file_id": getattr(vector_file, "id", None),
            "status": status,
            "attributes": attrs,
            "error": None,
            "updated_at": _utcnow(),
        }
        sb.table("document_external_files").update(patch).eq("id", existing["id"]).execute()
        sb.table("workspace_vector_stores").update(
            {
                "status": "ready",
                "last_synced_at": _utcnow(),
                "updated_at": _utcnow(),
            }
        ).eq("id", store["id"]).execute()
        return {
            "enabled": True,
            "synced": status == "indexed",
            "status": vector_file.status,
            "vector_store_id": store["external_id"],
            "file_id": getattr(vector_file, "id", None),
        }
    except Exception as exc:
        logger.exception("openai_vector_store_sync_failed document_id=%s", document.get("id"))
        patch = {"status": "failed", "error": str(exc)[:4000], "updated_at": _utcnow()}
        if existing and existing.get("id"):
            sb.table("document_external_files").update(patch).eq("id", existing["id"]).execute()
        return {"enabled": True, "synced": False, "error": str(exc)}


def search_workspace_openai_vector_store(
    sb: Client,
    *,
    workspace_id: str,
    query: str,
    document_ids: list[str] | None = None,
    include_pending: bool = False,
    match_count: int = 8,
) -> list[dict[str, Any]]:
    client = _client()
    if not client:
        logger.warning("openai_vector_search_skipped reason=openai_api_key_missing")
        return []

    store = ensure_workspace_openai_vector_store(sb, workspace_id)
    if not store or not store.get("external_id"):
        return []

    try:
        response = client.vector_stores.search(
            store["external_id"],
            query=query,
            filters=_search_filters(document_ids, include_pending),
            max_num_results=max(1, min(match_count, 50)),
            rewrite_query=True,
        )
    except Exception:
        logger.exception("openai_vector_search_failed workspace_id=%s", workspace_id)
        return []

    results: list[dict[str, Any]] = []
    for item in response.data:
        attrs = dict(getattr(item, "attributes", None) or {})
        results.append(
            {
                "chunk_id": getattr(item, "file_id", ""),
                "document_id": str(attrs.get("document_id") or ""),
                "file_name": str(attrs.get("file_name") or getattr(item, "filename", "") or ""),
                "doc_type": str(attrs.get("doc_type") or "autre"),
                "status": str(attrs.get("status") or ""),
                "content": _text_from_search_item(item),
                "score": float(getattr(item, "score", 0) or 0),
                "source": "openai_vector_store",
                "lot_id": attrs.get("lot_id"),
                "tenant_id": attrs.get("tenant_id"),
                "metadata": {
                    **attrs,
                    "provider": "openai",
                    "vector_store_id": store["external_id"],
                    "file_id": getattr(item, "file_id", None),
                    "filename": getattr(item, "filename", None),
                },
            }
        )
    return results


def delete_document_from_openai_vector_store(
    sb: Client,
    *,
    workspace_id: str,
    document_id: str,
) -> dict[str, Any]:
    client = _client()
    if not client:
        return {"deleted": False, "reason": "openai_api_key_missing"}

    rows = (
        sb.table("document_external_files")
        .select("*, workspace_vector_stores(external_id)")
        .eq("workspace_id", workspace_id)
        .eq("document_id", document_id)
        .eq("provider", "openai")
        .execute()
        .data
        or []
    )
    deleted = 0
    for row in rows:
        store = row.get("workspace_vector_stores") or {}
        if isinstance(store, list):
            store = store[0] if store else {}
        vector_store_id = store.get("external_id")
        file_id = row.get("external_file_id")
        if not vector_store_id or not file_id:
            continue
        try:
            client.vector_stores.files.delete(file_id, vector_store_id=vector_store_id)
        except Exception:
            logger.debug("openai_vector_file_delete_failed", exc_info=True)
        try:
            client.files.delete(file_id)
        except Exception:
            logger.debug("openai_file_delete_failed", exc_info=True)
        sb.table("document_external_files").update(
            {"status": "deleted", "updated_at": _utcnow()}
        ).eq("id", row["id"]).execute()
        deleted += 1
    return {"deleted": True, "file_count": deleted}
