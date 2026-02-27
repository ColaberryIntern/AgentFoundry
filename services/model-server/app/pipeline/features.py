"""
Feature engineering utilities.

Converts raw compliance and regulatory records into numeric feature
vectors suitable for model training and inference.
"""

from __future__ import annotations

import numpy as np


def extract_compliance_features(records: list[dict]) -> np.ndarray:
    """Convert compliance records to a 2-D feature matrix.

    Each record is expected to contain (at minimum):

    * ``compliance_rate``      — float in [0, 1]
    * ``days_since_check``     — int, days since last compliance check
    * ``regulation_count``     — int, number of applicable regulations
    * ``non_compliant_count``  — int
    * ``total_count``          — int
    * ``pending_count``        — int
    * ``alert_count``          — int

    Returns a ``(N, 6)`` ndarray with columns:
        compliance_rate, days_since_check, regulation_count,
        non_compliant_ratio, pending_ratio, alert_frequency
    """
    if not records:
        return np.empty((0, 6))

    rows: list[list[float]] = []
    for rec in records:
        compliance_rate = float(rec.get("compliance_rate", 0.0))
        days_since_check = float(rec.get("days_since_check", 0))
        regulation_count = float(rec.get("regulation_count", 0))
        total = float(rec.get("total_count", 1)) or 1.0  # avoid div-by-zero
        non_compliant_ratio = float(rec.get("non_compliant_count", 0)) / total
        pending_ratio = float(rec.get("pending_count", 0)) / total
        alert_frequency = float(rec.get("alert_count", 0))

        rows.append(
            [
                compliance_rate,
                days_since_check,
                regulation_count,
                non_compliant_ratio,
                pending_ratio,
                alert_frequency,
            ]
        )

    return np.array(rows, dtype=np.float64)


def extract_regulatory_features(records: list[dict]) -> np.ndarray:
    """Convert regulatory records to a 2-D feature matrix.

    Each record is expected to contain:

    * ``change_frequency``      — int
    * ``severity``              — int (1-5 scale)
    * ``days_between_changes``  — int
    * ``regulation_type``       — str (categorical, encoded numerically)

    Returns a ``(N, 4)`` ndarray with columns:
        change_frequency, severity_trend, days_between_changes,
        regulation_type_encoding
    """
    if not records:
        return np.empty((0, 4))

    # Simple ordinal encoding for regulation type
    _type_map: dict[str, int] = {}

    rows: list[list[float]] = []
    for rec in records:
        change_frequency = float(rec.get("change_frequency", 0))
        severity = float(rec.get("severity", 0))
        days_between = float(rec.get("days_between_changes", 0))
        reg_type = rec.get("regulation_type", "other")

        if reg_type not in _type_map:
            _type_map[reg_type] = len(_type_map)
        type_encoding = float(_type_map[reg_type])

        rows.append([change_frequency, severity, days_between, type_encoding])

    return np.array(rows, dtype=np.float64)
