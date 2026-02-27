"""
Agent Foundry Model Server — FastAPI application entry point.

Provides endpoints for:
- Health checks with model status
- Compliance gap analysis (trained model or rule-based fallback)
- Regulatory change predictions (trained model or statistical fallback)
- Drift analysis (Isolation Forest or rule-based fallback)
- Deployment optimisation (genetic algorithm)
- Market signal predictions (moving-average + trend extrapolation)
- Regulation taxonomy classification (hierarchical clustering or keyword fallback)
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
from app.models.deployment_optimizer import DeploymentOptimizer
from app.models.drift_detector import DriftDetector
from app.models.market_signals import MarketSignalPredictor
from app.models.regulatory_predictor import RegulatoryPredictor
from app.models.taxonomy_classifier import TaxonomyClassifier
from app.pipeline.etl import ETLPipeline
from app.pipeline.features import extract_compliance_features, extract_regulatory_features
from app.pipeline.training import TrainingOrchestrator
from app.schemas.inference import (
    ClassifyRegulationsRequest,
    ClassifyRegulationsResponse,
    ComplianceGapRequest,
    ComplianceGapResponse,
    DeploymentOptimizeRequest,
    DeploymentOptimizeResponse,
    DriftAnalysisRequest,
    DriftAnalysisResponse,
    HealthResponse,
    MarketSignalsRequest,
    MarketSignalsResponse,
    RegulatoryPredictionRequest,
    RegulatoryPredictionResponse,
    RetrainAllResponse,
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
_drift_detector = DriftDetector()
_deployment_optimizer = DeploymentOptimizer()
_market_signal_predictor = MarketSignalPredictor()
_taxonomy_classifier = TaxonomyClassifier()

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
    global _compliance_model, _regulatory_model, _drift_detector

    loaded = _model_store.load_model("compliance-gap", "latest")
    if loaded is not None and isinstance(loaded, ComplianceGapModel):
        _compliance_model = loaded
        logger.info("Loaded compliance-gap model (latest)")

    loaded = _model_store.load_model("regulatory-predictor", "latest")
    if loaded is not None and isinstance(loaded, RegulatoryPredictor):
        _regulatory_model = loaded
        logger.info("Loaded regulatory-predictor model (latest)")

    loaded = _model_store.load_model("drift-detector", "latest")
    if loaded is not None and isinstance(loaded, DriftDetector):
        _drift_detector = loaded
        logger.info("Loaded drift-detector model (latest)")

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
            "drift_detector": {
                "is_loaded": _drift_detector.is_loaded,
                "version": _drift_detector.version,
            },
            "deployment_optimizer": {
                "is_loaded": _deployment_optimizer.is_loaded,
                "version": _deployment_optimizer.version,
            },
            "market_signal_predictor": {
                "is_loaded": _market_signal_predictor.is_loaded,
                "version": _market_signal_predictor.version,
            },
            "taxonomy_classifier": {
                "is_loaded": _taxonomy_classifier.is_loaded,
                "version": _taxonomy_classifier.version,
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


# ----- Inference: drift analysis ------------------------------------


@app.post("/predict/drift-analysis", response_model=DriftAnalysisResponse)
async def predict_drift_analysis(request: DriftAnalysisRequest) -> dict:
    """Detect behavioural drift for a given agent's metrics.

    Uses the trained Isolation Forest model when available; otherwise
    falls back to a >2-standard-deviation rule.
    """
    start = time.time()

    result = _drift_detector.detect(request.metrics)

    elapsed_ms = (time.time() - start) * 1000
    return {
        "agent_id": request.agent_id,
        "is_drifting": result["is_drifting"],
        "anomaly_score": result["anomaly_score"],
        "threshold": result["threshold"],
        "details": result["details"],
        "model_version": _drift_detector.version,
        "inference_time_ms": round(elapsed_ms, 2),
    }


# ----- Inference: deployment optimisation ----------------------------


@app.post(
    "/predict/optimize-deployment",
    response_model=DeploymentOptimizeResponse,
)
async def predict_optimize_deployment(
    request: DeploymentOptimizeRequest,
) -> dict:
    """Find optimal deployment configuration via genetic algorithm."""
    start = time.time()

    result = _deployment_optimizer.optimize(request.constraints)

    elapsed_ms = (time.time() - start) * 1000
    return {
        "recommended_config": result["recommended_config"],
        "fitness_score": result["fitness_score"],
        "generations": result["generations"],
        "alternatives": result["alternatives"],
        "inference_time_ms": round(elapsed_ms, 2),
    }


# ----- Inference: market signals ------------------------------------


@app.post("/predict/market-signals", response_model=MarketSignalsResponse)
async def predict_market_signals(request: MarketSignalsRequest) -> dict:
    """Predict future regulatory activity for an industry."""
    start = time.time()

    result = _market_signal_predictor.predict(
        industry=request.industry,
        history=request.history,
    )

    elapsed_ms = (time.time() - start) * 1000
    return {
        "predictions": result["predictions"],
        "industry": result["industry"],
        "model_type": result["model_type"],
        "inference_time_ms": round(elapsed_ms, 2),
    }


# ----- Inference: regulation taxonomy -------------------------------


@app.post(
    "/predict/classify-regulations",
    response_model=ClassifyRegulationsResponse,
)
async def predict_classify_regulations(
    request: ClassifyRegulationsRequest,
) -> dict:
    """Classify regulations into thematic clusters."""
    start = time.time()

    result = _taxonomy_classifier.classify(request.regulations)

    elapsed_ms = (time.time() - start) * 1000
    return {
        "clusters": result["clusters"],
        "total_clusters": result["total_clusters"],
        "method": result["method"],
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


@app.post("/train/drift-detector", response_model=TrainingResponse)
async def train_drift_detector() -> dict:
    """Trigger training of the drift detector model.

    Generates synthetic normal-behaviour data and trains the
    Isolation Forest.
    """
    global _drift_detector
    try:
        start = time.time()
        rng = np.random.default_rng(42)

        # Generate synthetic normal-behaviour training data
        n = 200
        training_data = [
            {
                "compliance_score": float(rng.uniform(0.7, 1.0)),
                "response_time": float(rng.uniform(100, 300)),
                "error_rate": float(rng.uniform(0.0, 0.05)),
                "throughput": float(rng.uniform(50, 150)),
                "latency_p99": float(rng.uniform(300, 700)),
            }
            for _ in range(n)
        ]

        model = DriftDetector()
        metrics = model.train(training_data)

        latest = _model_store.get_latest_version("drift-detector")
        version = _next_version(latest)

        artifact_path = _model_store.save_model(
            model, "drift-detector", version, metrics
        )

        _drift_detector = model

        elapsed = time.time() - start
        return {
            "model_name": "drift-detector",
            "version": version,
            "metrics": metrics,
            "artifact_path": artifact_path,
        }
    except Exception as exc:
        logger.exception("Drift detector training failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/retrain/all", response_model=RetrainAllResponse)
async def retrain_all_models() -> dict:
    """Trigger retraining of all models.

    Runs training for each model sequentially and collects results.
    Individual model failures do not block others.
    """
    results: list[dict] = []

    # Compliance gap
    try:
        res = await train_compliance_gap()
        results.append({"model_name": "compliance-gap", "status": "success", **res})
    except Exception as exc:
        results.append({"model_name": "compliance-gap", "status": "failed", "error": str(exc)})

    # Regulatory predictor
    try:
        res = await train_regulatory_predictor()
        results.append({"model_name": "regulatory-predictor", "status": "success", **res})
    except Exception as exc:
        results.append({"model_name": "regulatory-predictor", "status": "failed", "error": str(exc)})

    # Drift detector
    try:
        res = await train_drift_detector()
        results.append({"model_name": "drift-detector", "status": "success", **res})
    except Exception as exc:
        results.append({"model_name": "drift-detector", "status": "failed", "error": str(exc)})

    return {
        "results": results,
        "total_models": len(results),
    }


# ----- Model listing -------------------------------------------------


@app.get("/models")
async def list_models() -> list[dict]:
    """List all stored model artifacts with versions."""
    return _model_store.list_models()


@app.get("/models/{model_name}/metrics")
async def get_model_metrics(model_name: str) -> dict:
    """Get metrics for the latest version of a specific model."""
    _model_map: dict[str, tuple[str, object]] = {
        "compliance-gap": ("compliance-gap", _compliance_model),
        "compliance_gap": ("compliance-gap", _compliance_model),
        "regulatory-predictor": ("regulatory-predictor", _regulatory_model),
        "regulatory_predictor": ("regulatory-predictor", _regulatory_model),
        "drift-detector": ("drift-detector", _drift_detector),
        "drift_detector": ("drift-detector", _drift_detector),
        "deployment-optimizer": ("deployment-optimizer", _deployment_optimizer),
        "deployment_optimizer": ("deployment-optimizer", _deployment_optimizer),
        "market-signal-predictor": ("market-signal-predictor", _market_signal_predictor),
        "market_signal_predictor": ("market-signal-predictor", _market_signal_predictor),
        "taxonomy-classifier": ("taxonomy-classifier", _taxonomy_classifier),
        "taxonomy_classifier": ("taxonomy-classifier", _taxonomy_classifier),
    }

    entry = _model_map.get(model_name)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")

    canonical_name, model = entry
    return {
        "model_name": canonical_name,
        "version": getattr(model, "version", "unknown"),
        "is_loaded": getattr(model, "is_loaded", False),
        "metrics": getattr(model, "metrics", {}),
    }


# =====================================================================
# Helpers
# =====================================================================


def _next_version(current: str | None) -> str:
    """Bump the patch component of a semver string."""
    if current is None:
        return "1.0.0"
    parts = current.split(".")
    try:
        parts[-1] = str(int(parts[-1]) + 1)
    except ValueError:
        return "1.0.0"
    return ".".join(parts)
