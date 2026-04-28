from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..models.requests import ClassifyRequest
from ..models.responses import ClassifyResponse
from ..services.ai import AIConfigError, SYSTEM_PROMPT, generate_json

router = APIRouter(tags=["classify"])

CLASSIFY_INSTRUCTIONS = """\
Classifie le message d'un locataire. Réponds avec la catégorie, un score de confiance (0–1) \
et un résumé en une phrase (max 12 mots).\
"""

CATEGORIES = {"maintenance", "paiement", "réclamation", "document", "information", "autre"}


@router.post("/classify", response_model=ClassifyResponse, operation_id="classify")
async def classify(request: ClassifyRequest) -> ClassifyResponse:
    try:
        data, ai_result = await generate_json(
            f"{SYSTEM_PROMPT}\n\n{CLASSIFY_INSTRUCTIONS}",
            (
                f"Message à classifier :\n{request.message}\n\n"
                "Réponds uniquement en JSON valide avec les clés: "
                "category, confidence, summary."
            ),
            provider=request.ai_provider,
            model=request.ai_model,
            max_tokens=256,
            operation="classify",
        )
        category = str(data.get("category", "autre"))
        if category not in CATEGORIES:
            category = "autre"
        confidence = float(data.get("confidence", 0.0) or 0.0)
        return ClassifyResponse(
            category=category,
            confidence=max(0.0, min(1.0, confidence)),
            summary=str(data.get("summary", ""))[:160],
            provider=ai_result.provider,
            model=ai_result.model,
            latency_ms=ai_result.latency_ms,
        )
    except AIConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
