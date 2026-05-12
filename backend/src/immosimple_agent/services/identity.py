from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from supabase import Client


@dataclass(frozen=True)
class IdentityResolution:
    tenant_id: str | None
    confidence: float
    reason: str


def _normalize_email(value: str | None) -> str | None:
    email = (value or "").strip().lower()
    return email or None


def _normalize_phone(value: str | None) -> str | None:
    digits = re.sub(r"\D+", "", value or "")
    if digits.startswith("33") and len(digits) == 11:
        digits = "0" + digits[2:]
    return digits or None


def _tenant_exists(sb: Client, workspace_id: str, tenant_id: str) -> bool:
    row = (
        sb.table("tenants")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("id", tenant_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    return bool(row)


def _first_tenant_by_email(sb: Client, workspace_id: str, email: str) -> str | None:
    rows = (
        sb.table("tenants")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("email", email)
        .limit(2)
        .execute()
        .data
        or []
    )
    return rows[0]["id"] if len(rows) == 1 else None


def _first_tenant_by_phone(sb: Client, workspace_id: str, phone: str) -> str | None:
    rows = (
        sb.table("tenants")
        .select("id, phone")
        .eq("workspace_id", workspace_id)
        .execute()
        .data
        or []
    )
    matches = [row for row in rows if _normalize_phone(row.get("phone")) == phone]
    return matches[0]["id"] if len(matches) == 1 else None


def resolve_tenant_identity(
    sb: Client,
    *,
    workspace_id: str,
    tenant_id: str | None = None,
    conversation_id: str | None = None,
    sender_email: str | None = None,
    sender_phone: str | None = None,
) -> IdentityResolution:
    if tenant_id and _tenant_exists(sb, workspace_id, tenant_id):
        return IdentityResolution(tenant_id=tenant_id, confidence=1.0, reason="provided_tenant_id")

    if conversation_id:
        conversation = (
            sb.table("conversations")
            .select("tenant_id")
            .eq("workspace_id", workspace_id)
            .eq("id", conversation_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        found = conversation[0].get("tenant_id") if conversation else None
        if isinstance(found, str) and found:
            return IdentityResolution(tenant_id=found, confidence=0.98, reason="conversation_tenant")

    email = _normalize_email(sender_email)
    if email:
        found = _first_tenant_by_email(sb, workspace_id, email)
        if found:
            return IdentityResolution(tenant_id=found, confidence=0.95, reason="sender_email")

    phone = _normalize_phone(sender_phone)
    if phone:
        found = _first_tenant_by_phone(sb, workspace_id, phone)
        if found:
            return IdentityResolution(tenant_id=found, confidence=0.9, reason="sender_phone")

    return IdentityResolution(tenant_id=None, confidence=0.0, reason="unresolved")


def identity_metadata(identity: IdentityResolution) -> dict[str, Any]:
    return {
        "tenant_id": identity.tenant_id,
        "identity_confidence": identity.confidence,
        "identity_reason": identity.reason,
    }
