"""
Pydantic request/response schemas for inference endpoints.
"""

from pydantic import BaseModel


class ComplianceGapRequest(BaseModel):
    """Request body for compliance gap analysis."""

    user_id: str
    compliance_data: list[dict]


class ComplianceGapResponse(BaseModel):
    """Response body for compliance gap analysis."""

    recommendations: list[dict]
    model_version: str
    inference_time_ms: float


class RegulatoryPredictionRequest(BaseModel):
    """Request body for regulatory change predictions."""

    user_id: str
    regulation_ids: list[str]


class RegulatoryPredictionResponse(BaseModel):
    """Response body for regulatory change predictions."""

    predictions: list[dict]
    model_version: str
    inference_time_ms: float


class ModelInfo(BaseModel):
    """Information about a loaded model."""

    name: str
    version: str
    is_loaded: bool
    metrics: dict | None = None


class HealthResponse(BaseModel):
    """Response body for health check."""

    status: str
    version: str
    models: dict


class TrainingResponse(BaseModel):
    """Response body for training trigger."""

    model_name: str
    version: str
    metrics: dict
    artifact_path: str
