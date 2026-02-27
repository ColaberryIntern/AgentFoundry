"""
Tests for the MarketSignalPredictor model.

Validates:
- Prediction with valid history
- Prediction with empty history
- Trend detection (increasing / decreasing / stable)
- Correct period generation
- Confidence decay over forecast horizon
"""

import pytest

from app.models.market_signals import MarketSignalPredictor


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------


@pytest.fixture
def predictor() -> MarketSignalPredictor:
    return MarketSignalPredictor()


@pytest.fixture
def increasing_history() -> list[dict]:
    """A clearly increasing time series."""
    return [
        {"period": "2025-Q1", "activity_count": 10},
        {"period": "2025-Q2", "activity_count": 15},
        {"period": "2025-Q3", "activity_count": 20},
        {"period": "2025-Q4", "activity_count": 25},
        {"period": "2026-Q1", "activity_count": 30},
        {"period": "2026-Q2", "activity_count": 35},
    ]


@pytest.fixture
def decreasing_history() -> list[dict]:
    """A clearly decreasing time series."""
    return [
        {"period": "2025-Q1", "activity_count": 50},
        {"period": "2025-Q2", "activity_count": 45},
        {"period": "2025-Q3", "activity_count": 40},
        {"period": "2025-Q4", "activity_count": 35},
        {"period": "2026-Q1", "activity_count": 30},
        {"period": "2026-Q2", "activity_count": 25},
    ]


@pytest.fixture
def stable_history() -> list[dict]:
    """A stable time series."""
    return [
        {"period": "2025-Q1", "activity_count": 20},
        {"period": "2025-Q2", "activity_count": 20},
        {"period": "2025-Q3", "activity_count": 20},
        {"period": "2025-Q4", "activity_count": 20},
        {"period": "2026-Q1", "activity_count": 20},
        {"period": "2026-Q2", "activity_count": 20},
    ]


# ------------------------------------------------------------------
# Prediction with history
# ------------------------------------------------------------------


def test_predict_returns_required_keys(
    predictor: MarketSignalPredictor,
    increasing_history: list[dict],
):
    result = predictor.predict("fintech", increasing_history)

    assert "predictions" in result
    assert "industry" in result
    assert "model_type" in result
    assert result["industry"] == "fintech"
    assert result["model_type"] == "moving_average"


def test_predict_returns_correct_count(
    predictor: MarketSignalPredictor,
    increasing_history: list[dict],
):
    result = predictor.predict("fintech", increasing_history, forecast_periods=4)

    assert len(result["predictions"]) == 4


def test_predict_each_item_has_fields(
    predictor: MarketSignalPredictor,
    increasing_history: list[dict],
):
    result = predictor.predict("fintech", increasing_history)

    for pred in result["predictions"]:
        assert "period" in pred
        assert "predicted_activity" in pred
        assert "confidence" in pred
        assert "trend" in pred


# ------------------------------------------------------------------
# Empty history
# ------------------------------------------------------------------


def test_predict_empty_history(predictor: MarketSignalPredictor):
    result = predictor.predict("healthcare", [])

    assert result["predictions"] == []
    assert result["industry"] == "healthcare"


# ------------------------------------------------------------------
# Trend detection
# ------------------------------------------------------------------


def test_increasing_trend(
    predictor: MarketSignalPredictor,
    increasing_history: list[dict],
):
    result = predictor.predict("fintech", increasing_history)

    # All predictions should show increasing trend
    for pred in result["predictions"]:
        assert pred["trend"] == "increasing"


def test_decreasing_trend(
    predictor: MarketSignalPredictor,
    decreasing_history: list[dict],
):
    result = predictor.predict("retail", decreasing_history)

    for pred in result["predictions"]:
        assert pred["trend"] == "decreasing"


def test_stable_trend(
    predictor: MarketSignalPredictor,
    stable_history: list[dict],
):
    result = predictor.predict("energy", stable_history)

    for pred in result["predictions"]:
        assert pred["trend"] == "stable"


# ------------------------------------------------------------------
# Confidence decay
# ------------------------------------------------------------------


def test_confidence_decays(
    predictor: MarketSignalPredictor,
    increasing_history: list[dict],
):
    result = predictor.predict("fintech", increasing_history, forecast_periods=6)
    confidences = [p["confidence"] for p in result["predictions"]]

    # Each successive confidence should be <= the previous
    for i in range(1, len(confidences)):
        assert confidences[i] <= confidences[i - 1]


# ------------------------------------------------------------------
# Period generation
# ------------------------------------------------------------------


def test_period_generation_quarterly(
    predictor: MarketSignalPredictor,
    increasing_history: list[dict],
):
    result = predictor.predict("fintech", increasing_history, forecast_periods=4)
    periods = [p["period"] for p in result["predictions"]]

    assert periods[0] == "2026-Q3"
    assert periods[1] == "2026-Q4"
    assert periods[2] == "2027-Q1"
    assert periods[3] == "2027-Q2"


def test_single_data_point(predictor: MarketSignalPredictor):
    """Should handle a single data point without errors."""
    result = predictor.predict("auto", [{"period": "2025-Q1", "activity_count": 10}])

    assert len(result["predictions"]) == 4
    for pred in result["predictions"]:
        assert pred["predicted_activity"] >= 0
