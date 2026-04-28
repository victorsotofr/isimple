from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .models.responses import HealthResponse
from .routes import chat, classify, draft

load_dotenv()


def create_app() -> FastAPI:
    app = FastAPI(
        title="ImmoSimple Agent",
        description="Agent IA pour la gestion locative — chat, rédaction, classification",
        version="0.1.0",
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:3001",
            "https://app.immosimple.fr",
        ],
        allow_credentials=True,
        allow_methods=["POST", "GET"],
        allow_headers=["*"],
    )

    app.include_router(chat.router, prefix="/api")
    app.include_router(draft.router, prefix="/api")
    app.include_router(classify.router, prefix="/api")

    @app.get("/health", response_model=HealthResponse, tags=["health"], operation_id="health")
    async def health() -> HealthResponse:
        return HealthResponse(status="ok", version="0.1.0")

    return app


app = create_app()
