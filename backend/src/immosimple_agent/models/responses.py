from __future__ import annotations

from pydantic import BaseModel, Field


class ChatResponse(BaseModel):
    reply: str = Field(..., description="Réponse générée par l'IA")
    provider: str | None = Field(None, description="Provider IA utilisé")
    model: str = Field(..., description="Modèle utilisé")
    input_tokens: int
    output_tokens: int
    latency_ms: int | None = Field(None, description="Latence de génération")


class DraftResponse(BaseModel):
    draft: str = Field(..., description="Brouillon de message rédigé")
    subject: str = Field(..., description="Objet du message")
    provider: str | None = Field(None, description="Provider IA utilisé")
    model: str | None = Field(None, description="Modèle IA utilisé")
    latency_ms: int | None = Field(None, description="Latence de génération")


class ClassifyResponse(BaseModel):
    category: str = Field(..., description="Catégorie du message (maintenance, paiement, réclamation, etc.)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Score de confiance entre 0 et 1")
    summary: str = Field(..., description="Résumé court du message")
    provider: str | None = Field(None, description="Provider IA utilisé")
    model: str | None = Field(None, description="Modèle IA utilisé")
    latency_ms: int | None = Field(None, description="Latence de classification")


class HealthResponse(BaseModel):
    status: str
    version: str
