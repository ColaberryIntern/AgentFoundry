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


# =====================================================================
# Drift Analysis
# =====================================================================


class DriftAnalysisRequest(BaseModel):
    """Request body for drift analysis."""

    agent_id: str
    metrics: dict


class DriftAnalysisResponse(BaseModel):
    """Response body for drift analysis."""

    agent_id: str
    is_drifting: bool
    anomaly_score: float
    threshold: float
    details: str
    model_version: str
    inference_time_ms: float


# =====================================================================
# Deployment Optimisation
# =====================================================================


class DeploymentOptimizeRequest(BaseModel):
    """Request body for deployment optimisation."""

    constraints: dict


class DeploymentOptimizeResponse(BaseModel):
    """Response body for deployment optimisation."""

    recommended_config: dict
    fitness_score: float
    generations: int
    alternatives: list[dict]
    inference_time_ms: float


# =====================================================================
# Market Signals
# =====================================================================


class MarketSignalsRequest(BaseModel):
    """Request body for market signal predictions."""

    industry: str
    history: list[dict]


class MarketSignalsResponse(BaseModel):
    """Response body for market signal predictions."""

    predictions: list[dict]
    industry: str
    model_type: str
    inference_time_ms: float


# =====================================================================
# Regulation Taxonomy
# =====================================================================


class ClassifyRegulationsRequest(BaseModel):
    """Request body for regulation classification."""

    regulations: list[dict]


class ClassifyRegulationsResponse(BaseModel):
    """Response body for regulation classification."""

    clusters: list[dict]
    total_clusters: int
    method: str
    inference_time_ms: float


# =====================================================================
# Retrain All
# =====================================================================


class RetrainAllResponse(BaseModel):
    """Response body for retrain-all trigger."""

    results: list[dict]
    total_models: int
