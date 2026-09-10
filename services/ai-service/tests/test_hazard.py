"""
AI Service Tests — Contract Tests

Verifies the API contract matches the engineering brief:
- POST /internal/ai/analyze-hazard returns expected schema
- Health check works
- Internal auth middleware blocks unauthenticated requests
"""

import pytest
from fastapi.testclient import TestClient

# Override env var BEFORE importing app
import os
os.environ["INTERNAL_API_KEY"] = "test-api-key"

from app.main import app

client = TestClient(app)

API_KEY = "test-api-key"
HEADERS = {"X-Internal-API-Key": API_KEY}


class TestHealthCheck:
    def test_health_returns_ok(self):
        response = client.get("/internal/ai/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "ai-service"


class TestInternalAuth:
    def test_missing_api_key_returns_401(self):
        response = client.post(
            "/internal/ai/analyze-hazard",
            json={"image_url": "s3://bucket/test.jpg", "context": "ppe_check"},
        )
        assert response.status_code == 401

    def test_invalid_api_key_returns_401(self):
        response = client.post(
            "/internal/ai/analyze-hazard",
            json={"image_url": "s3://bucket/test.jpg", "context": "ppe_check"},
            headers={"X-Internal-API-Key": "wrong-key"},
        )
        assert response.status_code == 401

    def test_valid_api_key_passes(self):
        response = client.post(
            "/internal/ai/analyze-hazard",
            json={"image_url": "s3://bucket/test.jpg", "context": "ppe_check"},
            headers=HEADERS,
        )
        assert response.status_code == 200


class TestHazardAnalysis:
    def test_ppe_check_returns_detections(self):
        response = client.post(
            "/internal/ai/analyze-hazard",
            json={"image_url": "s3://bucket/site-photo.jpg", "context": "ppe_check"},
            headers=HEADERS,
        )
        assert response.status_code == 200
        data = response.json()

        # Verify response matches the brief's contract
        assert data["status"] == "success"
        assert isinstance(data["detections"], list)
        assert len(data["detections"]) > 0

        # Verify detection schema
        detection = data["detections"][0]
        assert "class" in detection
        assert "confidence" in detection
        assert "bbox" in detection
        assert isinstance(detection["confidence"], float)
        assert 0 <= detection["confidence"] <= 1
        assert len(detection["bbox"]) == 4

        # Verify annotated image URL
        assert data["annotated_image_url"] is not None
        assert "annotated" in data["annotated_image_url"]

    def test_hazard_detection_context(self):
        response = client.post(
            "/internal/ai/analyze-hazard",
            json={"image_url": "s3://bucket/img.jpg", "context": "hazard_detection"},
            headers=HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    def test_unknown_context_returns_empty_detections(self):
        response = client.post(
            "/internal/ai/analyze-hazard",
            json={"image_url": "s3://bucket/img.jpg", "context": "unknown_context"},
            headers=HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert len(data["detections"]) == 0

    def test_missing_required_fields_returns_422(self):
        response = client.post(
            "/internal/ai/analyze-hazard",
            json={"image_url": "s3://bucket/img.jpg"},  # missing 'context'
            headers=HEADERS,
        )
        assert response.status_code == 422

    def test_processing_time_is_reported(self):
        response = client.post(
            "/internal/ai/analyze-hazard",
            json={"image_url": "s3://bucket/img.jpg", "context": "ppe_check"},
            headers=HEADERS,
        )
        data = response.json()
        assert "processing_time_ms" in data
        assert data["processing_time_ms"] > 0
