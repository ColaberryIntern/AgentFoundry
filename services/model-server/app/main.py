"""
Agent Foundry Model Server — FastAPI application entry point.

Provides endpoints for:
- Health checks with model status
- Compliance gap analysis (trained model or rule-based fallback)
- Regulatory change predictions (trained model or statistical fallback)
- On-demand model training triggers
- Model listing and metrics
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, HTTPException

from app.config import settings
from app.models.compliance_gap import ComplianceGapModel
from app.models.regulatory_predictor import RegulatoryPredictor
from app.pipeline.etl import ETLPipeline
from app.pipeline.features import extract_compliance_features, extract_regulatory_features
from app.pipeline.training import TrainingOrchestrator
from app.schemas.inference import (
    ComplianceGapRequest,
    ComplianceGapResponse,
    HealthResponse,
    RegulatoryPredictionRequest,
    RegulatoryPredictionResponse,
    TrainingResponse,
)
from app.utils.model_store import ModelStore

logger = logging.getLogger(__name__)

# =====================================================================
# Application & shared state
# =====================================================================

# Runtime model instances (loaded lazily)
_compliance_model = ComplianceGapModel()
_regulatory_model = RegulatoryPredictor()

# Infrastructure singletons
_model_store = ModelStore(model_dir=settings.MODEL_DIR)
_etl = ETLPipeline(db_url=settings.DATABASE_URL)
_orchestrator = TrainingOrchestrator(etl=_etl, model_store=_model_store)


# =====================================================================
# Lifespan — attempt to load latest models from disk at startup
# =====================================================================


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Load latest model artifacts at startup; clean up on shutdown."""
    global _compliance_model, _regulatory_model

    loaded = _model_store.load_model("compliance-gap", "latest")
    if loaded is not None and isinstance(loaded, ComplianceGapModel):
        _compliance_model = loaded
        logger.info("Loaded compliance-gap model (latest)")

    loaded = _model_store.load_model("regulatory-predictor", "latest")
    if loaded is not None and isinstance(loaded, RegulatoryPredictor):
        _regulatory_model = loaded
        logger.info("Loaded regulatory-predictor model (latest)")

    yield  # application runs here


app = FastAPI(
    title="Agent Foundry Model Server",
    version="1.0.0",
    description="AI inference and training pipeline for compliance analytics",
    lifespan=lifespan,
)


# =====================================================================
# Routes
# =====================================================================

# ----- Health --------------------------------------------------------


@app.get("/health", response_model=HealthResponse)
async def health_check() -> dict:
    """Health check endpoint with model status."""
    return {
        "status": "healthy",
        "version": app.version,
        "models": {
            "compliance_gap": {
                "is_loaded": _compliance_model.is_loaded,
                "version": _compliance_model.version,
            },
            "regulatory_predictor": {
                "is_loaded": _regulatory_model.is_loaded,
                "version": _regulatory_model.version,
            },
        },
    }


# ----- Inference: compliance gaps ------------------------------------


@app.post("/predict/compliance-gaps", response_model=ComplianceGapResponse)
async def predict_compliance_gaps(request: ComplianceGapRequest) -> dict:
    """Predict compliance gaps from submitted data.

    Uses the trained Random Forest model when available; otherwise falls
    back to deterministic rule-based analysis.
    """
    start = time.time()

    if not request.compliance_data:
        return {
            "recommendations": [],
            "model_version": _compliance_model.version,
            "inference_time_ms": 0.0,
        }

    if _compliance_model.is_loaded:
        # Feature-engineer the incoming data and run the trained model
        try:
            features = extract_compliance_features(request.compliance_data)
            recommendations = _compliance_model.predict(features)
        except Exception:
            logger.exception("Trained model prediction failed — using fallback")
            recommendations = _compliance_model.predict_fallback(
                request.compliance_data
            )
    else:
        # No trained model available — use rule-based fallback
        recommendations = _compliance_model.predict_fallback(
            request.compliance_data
        )

    elapsed_ms = (time.time() - start) * 1000
    return {
        "recommendations": recommendations,
        "model_version": _compliance_model.version,
        "inference_time_ms": round(elapsed_ms, 2),
    }


# ----- Inference: regulatory changes ---------------------------------


@app.post(
    "/predict/regulatory-changes",
    response_model=RegulatoryPredictionResponse,
)
async def predict_regulatory_changes(
    request: RegulatoryPredictionRequest,
) -> dict:
    """Predict regulatory changes for the given regulation IDs.

    Uses the trained statistical model when available; otherwise falls
    back to simple trend analysis.
    """
    start = time.time()

    if not request.regulation_ids:
        return {
            "predictions": [],
            "model_version": _regulatory_model.version,
            "inference_time_ms": 0.0,
        }

    if _regulatory_model.is_loaded:
        # Build minimal feature vectors from regulation IDs
        # In a full system these would come from the database; for now
        # we generate placeholder features so the model can run.
        try:
            n = len(request.regulation_ids)
            features = np.zeros((n, 4))  # placeholder features
            predictions = _regulatory_model.predict(
                features, request.regulation_ids
            )
        except Exception:
            logger.exception("Trained model prediction failed — using fallback")
            predictions = _regulatory_model.predict_fallback(
                [{"regulation_id": rid, "change_frequency": 2, "severity": 2}
                 for rid in request.regulation_ids]
            )
    else:
        # Fallback: statistical trend analysis with default values
        predictions = _regulatory_model.predict_fallback(
            [{"regulation_id": rid, "change_frequency": 2, "severity": 2}
             for rid in request.regulation_ids]
        )

    elapsed_ms = (time.time() - start) * 1000
    return {
        "predictions": predictions,
        "model_version": _regulatory_model.version,
        "inference_time_ms": round(elapsed_ms, 2),
    }


# ----- Training triggers ---------------------------------------------


@app.post("/train/compliance-gap", response_model=TrainingResponse)
async def train_compliance_gap() -> dict:
    """Trigger training of the compliance gap model."""
    global _compliance_model
    try:
        result = await _orchestrator.train_compliance_gap_model()
        # Hot-swap the live model
        loaded = _model_store.load_model("compliance-gap", result["version"])
        if loaded is not None and isinstance(loaded, ComplianceGapModel):
            _compliance_model = loaded
        return {
            "model_name": result["model_name"],
            "version": result["version"],
            "metrics": result["metrics"],
            "artifact_path": result["artifact_path"],
        }
    except Exception as exc:
        logger.exception("Compliance gap training failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/train/regulatory-predictor", response_model=TrainingResponse)
async def train_regulatory_predictor() -> dict:
    """Trigger training of the regulatory predictor model."""
    global _regulatory_model
    try:
        result = await _orchestrator.train_regulatory_predictor()
        loaded = _model_store.load_model(
            "regulatory-predictor", result["version"]
        )
        if loaded is not None and isinstance(loaded, RegulatoryPredictor):
            _regulatory_model = loaded
        return {
            "model_name": result["model_name"],
            "version": result["version"],
            "metrics": result["metrics"],
            "artifact_path": result["artifact_path"],
        }
    except Exception as exc:
        logger.exception("Regulatory predictor training failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ----- Model listing -------------------------------------------------


@app.get("/models")
async def list_models() -> list[dict]:
    """List all stored model artifacts with versions."""
    return _model_store.list_models()


@app.get("/models/{model_name}/metrics")
async def get_model_metrics(model_name: str) -> dict:
    """Get metrics for the latest version of a specific model."""
    if model_name == "compliance-gap" or model_name == "compliance_gap":
        return {
            "model_name": "compliance-gap",
            "version": _compliance_model.version,
            "is_loaded": _compliance_model.is_loaded,
            "metrics": _compliance_model.metrics,
        }
    elif model_name == "regulatory-predictor" or model_name == "regulatory_predictor":
        return {
            "model_name": "regulatory-predictor",
            "version": _regulatory_model.version,
            "is_loaded": _regulatory_model.is_loaded,
            "metrics": _regulatory_model.metrics,
        }
    else:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
