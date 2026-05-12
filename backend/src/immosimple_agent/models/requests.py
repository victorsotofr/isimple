from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field

AIProvider = Literal["anthropic", "openai"]


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    workspace_id: str = Field(..., description="ID de l'espace de travail")
    tenant_id: str | None = Field(None, description="ID du locataire pour enrichir le contexte")
    conversation_id: str | None = Field(None, description="ID de conversation pour résoudre l'identité")
    sender_email: str | None = Field(None, description="Email expéditeur pour résoudre l'identité")
    sender_phone: str | None = Field(None, description="Téléphone expéditeur pour résoudre l'identité")
    messages: list[Message] = Field(..., min_length=1, description="Historique de la conversation")
    system_context: str | None = Field(None, description="Contexte additionnel à injecter dans le prompt système")
    ai_provider: AIProvider | None = Field(None, description="Provider IA à utiliser")
    ai_model: str | None = Field(None, description="Modèle IA à utiliser")


class DraftRequest(BaseModel):
    workspace_id: str = Field(..., description="ID de l'espace de travail")
    tenant_id: str | None = Field(None, description="ID du locataire pour enrichir le contexte")
    conversation_id: str | None = Field(None, description="ID de conversation pour résoudre l'identité")
    sender_email: str | None = Field(None, description="Email destinataire/expéditeur pour résoudre l'identité")
    sender_phone: str | None = Field(None, description="Téléphone destinataire/expéditeur pour résoudre l'identité")
    subject: str = Field(..., description="Sujet du message à rédiger")
    context: str = Field(..., description="Contexte pour la rédaction (infos locataire, situation, etc.)")
    recipient_name: str | None = Field(None, description="Nom du destinataire")
    tone: Literal["formal", "friendly", "neutral"] = Field("formal", description="Ton du message")
    ai_provider: AIProvider | None = Field(None, description="Provider IA à utiliser")
    ai_model: str | None = Field(None, description="Modèle IA à utiliser")


class ClassifyRequest(BaseModel):
    workspace_id: str = Field(..., description="ID de l'espace de travail")
    message: str = Field(..., description="Message entrant à classifier")
    tenant_id: str | None = Field(None, description="ID du locataire si déjà connu")
    conversation_id: str | None = Field(None, description="ID de conversation pour résoudre l'identité")
    sender_email: str | None = Field(None, description="Email expéditeur pour résoudre l'identité")
    sender_phone: str | None = Field(None, description="Téléphone expéditeur pour résoudre l'identité")
    ai_provider: AIProvider | None = Field(None, description="Provider IA à utiliser")
    ai_model: str | None = Field(None, description="Modèle IA à utiliser")


class DocumentIndexRequest(BaseModel):
    workspace_id: str = Field(..., description="ID de l'espace de travail")
    document_id: str = Field(..., description="ID du document à indexer")
    force: bool = Field(False, description="Indexer même si le document n'est pas confirmé")


class DocumentUnindexRequest(BaseModel):
    workspace_id: str = Field(..., description="ID de l'espace de travail")
    document_id: str = Field(..., description="ID du document à retirer de l'index")


class DocumentSearchRequest(BaseModel):
    workspace_id: str = Field(..., description="ID de l'espace de travail")
    query: str = Field(..., min_length=1, description="Question ou recherche documentaire")
    tenant_id: str | None = Field(None, description="Restreindre aux documents liés au locataire")
    lot_id: str | None = Field(None, description="Restreindre aux documents liés au lot")
    include_pending: bool = Field(False, description="Inclure les documents non confirmés")
    match_count: int = Field(8, ge=1, le=30, description="Nombre de passages à retourner")
