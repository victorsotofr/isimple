from __future__ import annotations

import asyncio
import os
from functools import lru_cache

from supabase import create_client, Client


@lru_cache(maxsize=1)
def _get_client() -> Client | None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)


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
