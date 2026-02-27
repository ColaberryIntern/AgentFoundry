"""
Tests for the ETL pipeline and feature engineering.

Validates that:
- Feature extraction from sample compliance records produces correct shapes
- Feature extraction from sample regulatory records produces correct shapes
- Empty data is handled gracefully
- Transform produces correct numpy array shapes
"""

import numpy as np
import pytest

from app.pipeline.features import extract_compliance_features, extract_regulatory_features
from app.pipeline.etl import ETLPipeline


# ----------------------------------------------------------------
# Feature extraction — compliance
# ----------------------------------------------------------------


def test_extract_compliance_features_shape():
    """Feature extraction from compliance records produces 2-D array."""
    records = [
        {
            "compliance_rate": 0.85,
            "days_since_check": 30,
            "regulation_count": 5,
            "non_compliant_count": 1,
            "total_count": 10,
            "pending_count": 2,
            "alert_count": 3,
        },
        {
            "compliance_rate": 0.45,
            "days_since_check": 120,
            "regulation_count": 8,
            "non_compliant_count": 5,
            "total_count": 10,
            "pending_count": 4,
            "alert_count": 7,
        },
    ]
    features = extract_compliance_features(records)
    assert isinstance(features, np.ndarray)
    assert features.ndim == 2
    assert features.shape[0] == 2  # two records
    assert features.shape[1] >= 4  # at least 4 feature columns


def test_extract_compliance_features_values():
    """Feature values should be numeric and finite."""
    records = [
        {
            "compliance_rate": 0.9,
            "days_since_check": 10,
            "regulation_count": 3,
            "non_compliant_count": 0,
            "total_count": 5,
            "pending_count": 1,
            "alert_count": 0,
        },
    ]
    features = extract_compliance_features(records)
    assert np.all(np.isfinite(features))


def test_extract_compliance_features_empty():
    """Empty record list should return empty 2-D array."""
    features = extract_compliance_features([])
    assert isinstance(features, np.ndarray)
    assert features.shape[0] == 0


# ----------------------------------------------------------------
# Feature extraction — regulatory
# ----------------------------------------------------------------


def test_extract_regulatory_features_shape():
    """Feature extraction from regulatory records produces 2-D array."""
    records = [
        {
            "regulation_id": "reg-1",
            "change_frequency": 4,
            "severity": 3,
            "days_between_changes": 90,
            "regulation_type": "data_privacy",
        },
        {
            "regulation_id": "reg-2",
            "change_frequency": 1,
            "severity": 1,
            "days_between_changes": 365,
            "regulation_type": "financial",
        },
    ]
    features = extract_regulatory_features(records)
    assert isinstance(features, np.ndarray)
    assert features.ndim == 2
    assert features.shape[0] == 2


def test_extract_regulatory_features_empty():
    """Empty record list should return empty 2-D array."""
    features = extract_regulatory_features([])
    assert isinstance(features, np.ndarray)
    assert features.shape[0] == 0


# ----------------------------------------------------------------
# ETL pipeline — transform methods
# ----------------------------------------------------------------


def test_transform_for_gap_analysis():
    """transform_for_gap_analysis should return (features, labels) tuple."""
    etl = ETLPipeline(db_url="postgresql://test:test@localhost/test")
    raw_data = [
        {
            "compliance_rate": 0.85,
            "days_since_check": 30,
            "regulation_count": 5,
            "non_compliant_count": 1,
            "total_count": 10,
            "pending_count": 2,
            "alert_count": 3,
            "has_gap": False,
        },
        {
            "compliance_rate": 0.3,
            "days_since_check": 200,
            "regulation_count": 8,
            "non_compliant_count": 6,
            "total_count": 10,
            "pending_count": 4,
            "alert_count": 9,
            "has_gap": True,
        },
    ]
    features, labels = etl.transform_for_gap_analysis(raw_data)
    assert isinstance(features, np.ndarray)
    assert isinstance(labels, np.ndarray)
    assert features.shape[0] == labels.shape[0] == 2


def test_transform_for_gap_analysis_empty():
    """Empty raw data should produce empty arrays."""
    etl = ETLPipeline(db_url="postgresql://test:test@localhost/test")
    features, labels = etl.transform_for_gap_analysis([])
    assert features.shape[0] == 0
    assert labels.shape[0] == 0


def test_transform_for_predictions():
    """transform_for_predictions should return (sequences, labels) tuple."""
    etl = ETLPipeline(db_url="postgresql://test:test@localhost/test")
    raw_data = [
        {
            "regulation_id": "reg-1",
            "change_frequency": 4,
            "severity": 3,
            "days_between_changes": 90,
            "regulation_type": "data_privacy",
            "changed": True,
        },
        {
            "regulation_id": "reg-2",
            "change_frequency": 1,
            "severity": 1,
            "days_between_changes": 365,
            "regulation_type": "financial",
            "changed": False,
        },
    ]
    sequences, labels = etl.transform_for_predictions(raw_data)
    assert isinstance(sequences, np.ndarray)
    assert isinstance(labels, np.ndarray)
    assert sequences.shape[0] == labels.shape[0] == 2


def test_transform_for_predictions_empty():
    """Empty raw data should produce empty arrays."""
    etl = ETLPipeline(db_url="postgresql://test:test@localhost/test")
    sequences, labels = etl.transform_for_predictions([])
    assert sequences.shape[0] == 0
    assert labels.shape[0] == 0
