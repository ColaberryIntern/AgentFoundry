"""
Tests for the training pipeline, model save/load, and model store.

Validates that:
- Training pipeline with synthetic data produces a model
- Model save/load roundtrip works correctly
- Model store versioning works
- Training metrics are recorded
"""

import json
import os
import tempfile

import numpy as np
import pytest

from app.models.compliance_gap import ComplianceGapModel
from app.models.regulatory_predictor import RegulatoryPredictor
from app.utils.model_store import ModelStore


# ----------------------------------------------------------------
# ComplianceGapModel — train / predict / save / load
# ----------------------------------------------------------------


def test_compliance_gap_train_synthetic_data():
    """Training with synthetic data should produce a fitted model."""
    model = ComplianceGapModel()
    np.random.seed(42)
    features = np.random.rand(100, 6)
    labels = (features[:, 0] < 0.5).astype(int)  # simple rule for testing
    metrics = model.train(features, labels)

    assert model.is_loaded is True
    assert "accuracy" in metrics
    assert "f1" in metrics
    assert metrics["accuracy"] > 0.5  # should learn simple rule


def test_compliance_gap_predict_after_train():
    """Predict after training should return list of dicts."""
    model = ComplianceGapModel()
    np.random.seed(42)
    features = np.random.rand(50, 6)
    labels = (features[:, 0] < 0.5).astype(int)
    model.train(features, labels)

    test_features = np.random.rand(5, 6)
    predictions = model.predict(test_features)
    assert isinstance(predictions, list)
    assert len(predictions) == 5
    for pred in predictions:
        assert "gap_type" in pred
        assert "severity" in pred
        assert "confidence" in pred


def test_compliance_gap_predict_fallback():
    """Predict without training should use rule-based fallback."""
    model = ComplianceGapModel()
    assert model.is_loaded is False
    # Pass raw compliance data dicts for fallback mode
    compliance_records = [
        {"compliance_rate": 0.3, "status": "non_compliant", "category": "security"},
        {"compliance_rate": 0.9, "status": "compliant", "category": "data_privacy"},
    ]
    predictions = model.predict_fallback(compliance_records)
    assert isinstance(predictions, list)
    # Low compliance_rate record should be flagged
    flagged = [p for p in predictions if p["severity"] in ("high", "critical")]
    assert len(flagged) >= 1


def test_compliance_gap_save_load_roundtrip():
    """Model saved to disk should be loadable and produce same predictions."""
    model = ComplianceGapModel()
    np.random.seed(42)
    features = np.random.rand(50, 6)
    labels = (features[:, 0] < 0.5).astype(int)
    model.train(features, labels)

    with tempfile.TemporaryDirectory() as tmpdir:
        model.save(tmpdir)
        model2 = ComplianceGapModel()
        model2.load(tmpdir)
        assert model2.is_loaded is True

        test_data = np.array([[0.1, 0.5, 0.3, 0.2, 0.4, 0.6]])
        pred1 = model.predict(test_data)
        pred2 = model2.predict(test_data)
        assert pred1[0]["gap_type"] == pred2[0]["gap_type"]


# ----------------------------------------------------------------
# RegulatoryPredictor — train / predict / save / load
# ----------------------------------------------------------------


def test_regulatory_predictor_train_synthetic():
    """Training with synthetic data should produce a fitted model."""
    model = RegulatoryPredictor()
    np.random.seed(42)
    sequences = np.random.rand(80, 4)
    labels = (sequences[:, 0] > 0.5).astype(int)
    metrics = model.train(sequences, labels)

    assert model.is_loaded is True
    assert "accuracy" in metrics


def test_regulatory_predictor_predict_after_train():
    """Predict after training should return structured predictions."""
    model = RegulatoryPredictor()
    np.random.seed(42)
    sequences = np.random.rand(80, 4)
    labels = (sequences[:, 0] > 0.5).astype(int)
    model.train(sequences, labels)

    regulation_ids = ["reg-1", "reg-2"]
    test_data = np.random.rand(2, 4)
    predictions = model.predict(test_data, regulation_ids)
    assert isinstance(predictions, list)
    assert len(predictions) == 2
    for pred in predictions:
        assert "regulation_id" in pred
        assert "predicted_change" in pred
        assert "likelihood" in pred


def test_regulatory_predictor_fallback():
    """Predict without training should use statistical fallback."""
    model = RegulatoryPredictor()
    assert model.is_loaded is False
    regulation_data = [
        {"regulation_id": "reg-1", "change_frequency": 5, "severity": 4},
        {"regulation_id": "reg-2", "change_frequency": 1, "severity": 1},
    ]
    predictions = model.predict_fallback(regulation_data)
    assert isinstance(predictions, list)
    assert len(predictions) == 2


def test_regulatory_predictor_save_load_roundtrip():
    """Model saved to disk should be loadable."""
    model = RegulatoryPredictor()
    np.random.seed(42)
    sequences = np.random.rand(50, 4)
    labels = (sequences[:, 0] > 0.5).astype(int)
    model.train(sequences, labels)

    with tempfile.TemporaryDirectory() as tmpdir:
        model.save(tmpdir)
        model2 = RegulatoryPredictor()
        model2.load(tmpdir)
        assert model2.is_loaded is True


# ----------------------------------------------------------------
# ModelStore — versioning and metadata
# ----------------------------------------------------------------


def test_model_store_save_and_list():
    """Saving a model should make it appear in list_models."""
    with tempfile.TemporaryDirectory() as tmpdir:
        store = ModelStore(model_dir=tmpdir)
        model = ComplianceGapModel()
        np.random.seed(42)
        features = np.random.rand(30, 6)
        labels = (features[:, 0] < 0.5).astype(int)
        model.train(features, labels)

        store.save_model(model, "compliance-gap", "1.0.0", {"accuracy": 0.9})
        models = store.list_models()
        assert len(models) >= 1
        assert any(m["name"] == "compliance-gap" for m in models)


def test_model_store_load_latest():
    """Loading 'latest' should return the highest version."""
    with tempfile.TemporaryDirectory() as tmpdir:
        store = ModelStore(model_dir=tmpdir)
        model = ComplianceGapModel()
        np.random.seed(42)
        features = np.random.rand(30, 6)
        labels = (features[:, 0] < 0.5).astype(int)
        model.train(features, labels)

        store.save_model(model, "compliance-gap", "1.0.0", {"accuracy": 0.85})
        store.save_model(model, "compliance-gap", "1.1.0", {"accuracy": 0.90})

        latest_version = store.get_latest_version("compliance-gap")
        assert latest_version == "1.1.0"


def test_model_store_metadata():
    """Saved model should have metadata including metrics."""
    with tempfile.TemporaryDirectory() as tmpdir:
        store = ModelStore(model_dir=tmpdir)
        model = ComplianceGapModel()
        np.random.seed(42)
        features = np.random.rand(30, 6)
        labels = (features[:, 0] < 0.5).astype(int)
        model.train(features, labels)

        metrics = {"accuracy": 0.92, "f1": 0.88}
        store.save_model(model, "compliance-gap", "2.0.0", metrics)

        metadata_path = os.path.join(
            tmpdir, "compliance-gap", "2.0.0", "metadata.json"
        )
        assert os.path.exists(metadata_path)
        with open(metadata_path) as f:
            metadata = json.load(f)
        assert metadata["metrics"]["accuracy"] == 0.92
        assert metadata["version"] == "2.0.0"


def test_model_store_load_model():
    """load_model should return a usable model instance."""
    with tempfile.TemporaryDirectory() as tmpdir:
        store = ModelStore(model_dir=tmpdir)
        model = ComplianceGapModel()
        np.random.seed(42)
        features = np.random.rand(30, 6)
        labels = (features[:, 0] < 0.5).astype(int)
        model.train(features, labels)

        store.save_model(model, "compliance-gap", "1.0.0", {"accuracy": 0.9})
        loaded = store.load_model("compliance-gap", "1.0.0")
        assert loaded is not None
        assert loaded.is_loaded is True
