"""
Pydantic schemas for the hazard detection API.
These define the exact request/response contract from the brief.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class HazardAnalysisRequest(BaseModel):
    """
    Request to analyze an image for safety hazards.
    The Core API sends this when processing incident reports
    or during real-time PPE compliance checks.
    """
    image_url: str = Field(
        ...,
        description="S3 URL of the image to analyze",
        examples=["s3://koyla-bucket/images/site-photo-001.jpg"],
    )
    context: str = Field(
        ...,
        description="Analysis context — determines which models to run",
        examples=["ppe_check", "hazard_detection", "document_ocr"],
    )


class Detection(BaseModel):
    """A single detected object/hazard in the image."""
    class_name: str = Field(
        ...,
        alias="class",
        description="Detection class label",
        examples=["no_helmet", "no_safety_vest", "gas_cylinder_unsecured"],
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model confidence score",
        examples=[0.92],
    )
    bbox: List[float] = Field(
        ...,
        min_length=4,
        max_length=4,
        description="Bounding box [x1, y1, x2, y2] in pixels",
        examples=[[100, 200, 300, 400]],
    )


class HazardAnalysisResponse(BaseModel):
    """
    Response from hazard analysis.
    Matches the contract specified in the engineering brief.
    """
    status: str = Field(
        ...,
        description="Analysis result status",
        examples=["success", "error"],
    )
    detections: List[Detection] = Field(
        default_factory=list,
        description="List of detected hazards/violations",
    )
    annotated_image_url: Optional[str] = Field(
        None,
        description="S3 URL of the image with detection annotations drawn",
        examples=["s3://koyla-bucket/annotated/site-photo-001-annotated.jpg"],
    )
    processing_time_ms: Optional[float] = Field(
        None,
        description="Model inference time in milliseconds",
    )
