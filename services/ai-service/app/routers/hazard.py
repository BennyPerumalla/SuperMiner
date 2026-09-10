"""
Hazard Detection Router

POST /internal/ai/analyze-hazard

This is the API contract defined in the engineering brief.
The Core API calls this endpoint when it needs to analyze
an image for safety hazards (PPE violations, unsecured
equipment, expired permits).

Request:
    {
        "image_url": "s3://bucket/image.jpg",
        "context": "ppe_check"
    }

Response:
    {
        "status": "success",
        "detections": [
            {
                "class": "no_helmet",
                "confidence": 0.92,
                "bbox": [x1, y1, x2, y2]
            }
        ],
        "annotated_image_url": "s3://bucket/annotated_image.jpg",
        "processing_time_ms": 245.3
    }
"""

from fastapi import APIRouter, HTTPException
import logging

from app.schemas.hazard import HazardAnalysisRequest, HazardAnalysisResponse
from app.services.hazard_analyzer import hazard_analyzer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal/ai", tags=["AI Hazard Detection"])


@router.post(
    "/analyze-hazard",
    response_model=HazardAnalysisResponse,
    summary="Analyze an image for safety hazards",
    description=(
        "Runs YOLO/PaddleOCR inference on the provided image. "
        "Currently returns mock detections (stub implementation). "
        "Internal endpoint — requires X-Internal-API-Key header."
    ),
)
async def analyze_hazard(request: HazardAnalysisRequest) -> HazardAnalysisResponse:
    """
    Analyze an image for safety hazards.

    Supported contexts:
    - ppe_check: Detect missing helmets, safety vests, lamps
    - hazard_detection: Detect unsecured equipment, blocked exits
    - document_ocr: Extract text from permits, certificates
    """
    try:
        result = await hazard_analyzer.analyze(request)
        logger.info(
            f"Hazard analysis completed: {len(result.detections)} detections "
            f"in {result.processing_time_ms}ms for context={request.context}"
        )
        return result
    except Exception as e:
        logger.error(f"Hazard analysis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )
