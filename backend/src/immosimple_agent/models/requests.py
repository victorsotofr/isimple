from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field

AIProvider = Literal["anthropic", "openai", "gemini"]


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    workspace_id: str = Field(..., description="ID de l'espace de travail")
    tenant_id: str | None = Field(None, description="ID du locataire pour enrichir le contexte")
    messages: list[Message] = Field(..., min_length=1, description="Historique de la conversation")
    system_context: str | None = Field(None, description="Contexte additionnel à injecter dans le prompt système")
    ai_provider: AIProvider | None = Field(None, description="Provider IA à utiliser")
    ai_model: str | None = Field(None, description="Modèle IA à utiliser")


class DraftRequest(BaseModel):
    workspace_id: str = Field(..., description="ID de l'espace de travail")
    tenant_id: str | None = Field(None, description="ID du locataire pour enrichir le contexte")
    subject: str = Field(..., description="Sujet du message à rédiger")
    context: str = Field(..., description="Contexte pour la rédaction (infos locataire, situation, etc.)")
    recipient_name: str | None = Field(None, description="Nom du destinataire")
    tone: Literal["formal", "friendly", "neutral"] = Field("formal", description="Ton du message")
    ai_provider: AIProvider | None = Field(None, description="Provider IA à utiliser")
    ai_model: str | None = Field(None, description="Modèle IA à utiliser")


class ClassifyRequest(BaseModel):
    workspace_id: str = Field(..., description="ID de l'espace de travail")
    message: str = Field(..., description="Message entrant à classifier")
    ai_provider: AIProvider | None = Field(None, description="Provider IA à utiliser")
    ai_model: str | None = Field(None, description="Modèle IA à utiliser")
