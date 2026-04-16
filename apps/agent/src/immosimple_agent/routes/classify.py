from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from ..models.requests import ClassifyRequest
from ..models.responses import ClassifyResponse
from ..services.ai import MODEL, SYSTEM_PROMPT

router = APIRouter(tags=["classify"])

CLASSIFY_INSTRUCTIONS = """\
Classifie le message d'un locataire. Réponds avec la catégorie, un score de confiance (0–1) \
et un résumé en une phrase (max 12 mots).\
"""

CATEGORIES = Literal[
    "maintenance", "paiement", "réclamation", "document", "information", "autre"
]


class _Classification(BaseModel):
    category: CATEGORIES = Field(description="Catégorie du message")
    confidence: float = Field(ge=0.0, le=1.0, description="Score de confiance")
    summary: str = Field(description="Résumé court, max 12 mots")


@router.post("/classify", response_model=ClassifyResponse, operation_id="classify")
async def classify(request: ClassifyRequest) -> ClassifyResponse:
    llm = ChatAnthropic(model=MODEL, max_tokens=256)
    classifier = llm.with_structured_output(_Classification)

    try:
        result: _Classification = await classifier.ainvoke([  # type: ignore[assignment]
            SystemMessage(content=f"{SYSTEM_PROMPT}\n\n{CLASSIFY_INSTRUCTIONS}"),
            HumanMessage(content=request.message),
        ])
        return ClassifyResponse(
            category=result.category,
            confidence=result.confidence,
            summary=result.summary,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
