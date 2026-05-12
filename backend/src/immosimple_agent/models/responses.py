from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ChatResponse(BaseModel):
    reply: str = Field(..., description="Réponse générée par l'IA")
    provider: str | None = Field(None, description="Provider IA utilisé")
    model: str = Field(..., description="Modèle utilisé")
    input_tokens: int
    output_tokens: int
    latency_ms: int | None = Field(None, description="Latence de génération")
    tenant_id: str | None = Field(None, description="Locataire identifié pour le contexte")
    identity_confidence: float | None = Field(None, description="Confiance de résolution d'identité")
    identity_reason: str | None = Field(None, description="Méthode de résolution d'identité")


class DraftResponse(BaseModel):
    draft: str = Field(..., description="Brouillon de message rédigé")
    subject: str = Field(..., description="Objet du message")
    provider: str | None = Field(None, description="Provider IA utilisé")
    model: str | None = Field(None, description="Modèle IA utilisé")
    latency_ms: int | None = Field(None, description="Latence de génération")
    tenant_id: str | None = Field(None, description="Locataire identifié pour le contexte")
    identity_confidence: float | None = Field(None, description="Confiance de résolution d'identité")
    identity_reason: str | None = Field(None, description="Méthode de résolution d'identité")


class ClassifyResponse(BaseModel):
    category: str = Field(..., description="Catégorie du message (maintenance, paiement, réclamation, etc.)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Score de confiance entre 0 et 1")
    summary: str = Field(..., description="Résumé court du message")
    provider: str | None = Field(None, description="Provider IA utilisé")
    model: str | None = Field(None, description="Modèle IA utilisé")
    latency_ms: int | None = Field(None, description="Latence de classification")
    tenant_id: str | None = Field(None, description="Locataire identifié")
    identity_confidence: float | None = Field(None, description="Confiance de résolution d'identité")
    identity_reason: str | None = Field(None, description="Méthode de résolution d'identité")


class HealthResponse(BaseModel):
    status: str
    version: str


class DocumentIndexResponse(BaseModel):
    indexed: bool
    retrieval_provider: str | None = None
    vector_store_id: str | None = None
    external_file_id: str | None = None
    text_chars: int | None = None
    reason: str | None = None


class DocumentSearchResultResponse(BaseModel):
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


class DocumentSearchResponse(BaseModel):
    results: list[DocumentSearchResultResponse]
