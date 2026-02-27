"""
Tests for the DriftDetector model.

Validates:
- Training on normal behaviour data
- Detection of anomalous metrics (drift)
- Detection of normal metrics (no drift)
- Rule-based fallback when no trained model exists
- Save/load round-trip
"""

import os
import tempfile

import pytest

from app.models.drift_detector import DriftDetector


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------


@pytest.fixture
def normal_data() -> list[dict]:
    """Generate normal-behaviour training data."""
    import numpy as np

    rng = np.random.default_rng(42)
    return [
        {
            "compliance_score": float(rng.uniform(0.7, 1.0)),
            "response_time": float(rng.uniform(100, 300)),
            "error_rate": float(rng.uniform(0.0, 0.05)),
            "throughput": float(rng.uniform(50, 150)),
            "latency_p99": float(rng.uniform(300, 700)),
        }
        for _ in range(100)
    ]


@pytest.fixture
def trained_detector(normal_data: list[dict]) -> DriftDetector:
    """Return a DriftDetector that has been trained on normal data."""
    detector = DriftDetector()
    detector.train(normal_data)
    return detector


# ------------------------------------------------------------------
# Training
# ------------------------------------------------------------------


def test_train_returns_metrics(normal_data: list[dict]):
    detector = DriftDetector()
    metrics = detector.train(normal_data)

    assert "training_samples" in metrics
    assert metrics["training_samples"] == len(normal_data)
    assert "contamination" in metrics
    assert "feature_count" in metrics
    assert detector.is_loaded is True


# ------------------------------------------------------------------
# Detection — anomaly
# ------------------------------------------------------------------


def test_detect_anomaly(trained_detector: DriftDetector):
    """Highly deviant metrics should be flagged as drifting."""
    anomalous_metrics = {
        "compliance_score": 0.05,  # very low
        "response_time": 5000.0,  # very high
        "error_rate": 0.9,  # very high
        "throughput": 1.0,  # very low
        "latency_p99": 10000.0,  # very high
    }
    result = trained_detector.detect(anomalous_metrics)

    assert "is_drifting" in result
    assert "anomaly_score" in result
    assert "threshold" in result
    assert "details" in result
    assert result["is_drifting"] is True


# ------------------------------------------------------------------
# Detection — normal
# ------------------------------------------------------------------


def test_detect_normal(trained_detector: DriftDetector):
    """Metrics within the normal range should NOT be flagged."""
    normal_metrics = {
        "compliance_score": 0.85,
        "response_time": 200.0,
        "error_rate": 0.02,
        "throughput": 100.0,
        "latency_p99": 500.0,
    }
    result = trained_detector.detect(normal_metrics)

    assert result["is_drifting"] is False


# ------------------------------------------------------------------
# Fallback (no trained model)
# ------------------------------------------------------------------


def test_detect_fallback_drifting():
    """Fallback should flag metrics >2 std from reference."""
    detector = DriftDetector()
    result = detector.detect({
        "compliance_score": 0.05,
        "response_time": 5000.0,
        "error_rate": 0.9,
        "throughput": 1.0,
        "latency_p99": 10000.0,
    })

    assert result["is_drifting"] is True
    assert "details" in result


def test_detect_fallback_normal():
    """Fallback should not flag normal metrics."""
    detector = DriftDetector()
    result = detector.detect({
        "compliance_score": 0.85,
        "response_time": 200.0,
        "error_rate": 0.02,
        "throughput": 100.0,
        "latency_p99": 500.0,
    })

    assert result["is_drifting"] is False


# ------------------------------------------------------------------
# Save / Load
# ------------------------------------------------------------------


def test_save_and_load(trained_detector: DriftDetector):
    """Model should produce consistent results after save/load."""
    with tempfile.TemporaryDirectory() as tmpdir:
        trained_detector.save(tmpdir)

        loaded = DriftDetector()
        loaded.load(tmpdir)

        assert loaded.is_loaded is True

        test_metrics = {
            "compliance_score": 0.85,
            "response_time": 200.0,
            "error_rate": 0.02,
            "throughput": 100.0,
            "latency_p99": 500.0,
        }
        original = trained_detector.detect(test_metrics)
        restored = loaded.detect(test_metrics)

        assert original["is_drifting"] == restored["is_drifting"]
        assert abs(original["anomaly_score"] - restored["anomaly_score"]) < 0.001
