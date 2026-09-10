"""
Internal API Key Authentication Middleware

Validates that all requests to /internal/* endpoints include
a valid X-Internal-API-Key header. This prevents external
clients from directly calling the AI service.

In production, this would be combined with network-level
isolation (the AI service is not exposed outside the Docker
network / Kubernetes cluster).
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class InternalAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, api_key: str):
        super().__init__(app)
        self.api_key = api_key

    async def dispatch(self, request: Request, call_next):
        # Skip auth for health checks and docs
        if request.url.path in ("/docs", "/redoc", "/openapi.json", "/internal/ai/health"):
            return await call_next(request)

        # Validate API key
        provided_key = request.headers.get("X-Internal-API-Key")
        if not provided_key or provided_key != self.api_key:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or missing internal API key"},
            )

        return await call_next(request)
