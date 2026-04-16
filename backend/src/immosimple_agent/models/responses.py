from __future__ import annotations

from pydantic import BaseModel, Field


class ChatResponse(BaseModel):
    reply: str = Field(..., description="Réponse générée par l'IA")
    model: str = Field(..., description="Modèle utilisé")
    input_tokens: int
    output_tokens: int


class DraftResponse(BaseModel):
    draft: str = Field(..., description="Brouillon de message rédigé")
    subject: str = Field(..., description="Objet du message")


class ClassifyResponse(BaseModel):
    category: str = Field(..., description="Catégorie du message (maintenance, paiement, réclamation, etc.)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Score de confiance entre 0 et 1")
    summary: str = Field(..., description="Résumé court du message")


class HealthResponse(BaseModel):
    status: str
    version: str
