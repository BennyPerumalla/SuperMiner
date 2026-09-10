"""AI Service Configuration — loaded from environment variables."""

import os


class Settings:
    def __init__(self):
        self.internal_api_key = os.getenv("INTERNAL_API_KEY", "dev-internal-api-key")
        self.port = int(os.getenv("PORT", "8000"))


settings = Settings()
