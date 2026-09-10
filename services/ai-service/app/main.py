"""
Koyla-Chain AI Hazard Detection Service

Internal service for computer vision-based hazard detection.
NOT exposed to mobile clients — called only by the Core API.

Endpoints:
  POST /internal/ai/analyze-hazard  — Detect PPE violations, hazards
  GET  /internal/ai/health          — Health check

Security: API key authentication via X-Internal-API-Key header.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import hazard
from app.middleware.internal_auth import InternalAuthMiddleware

app = FastAPI(
    title="Koyla-Chain AI Service",
    description="Internal AI hazard detection — YOLO/PaddleOCR (stub)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Internal auth middleware — validates X-Internal-API-Key
app.add_middleware(InternalAuthMiddleware, api_key=settings.internal_api_key)

# CORS (only needed if Core API is on a different origin in dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(hazard.router)


@app.get("/internal/ai/health", tags=["Health"])
async def health():
    """Health check for container orchestration."""
    return {"status": "ok", "service": "ai-service", "models_loaded": False}
