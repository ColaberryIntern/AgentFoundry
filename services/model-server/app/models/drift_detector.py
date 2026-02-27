"""
Drift Detector — Isolation Forest for behavioural drift detection.

Uses scikit-learn's IsolationForest to learn the "normal" operating
envelope (compliance scores, response times, error rates) and flags
incoming metrics that deviate from that envelope.

When no trained model is available the ``detect_fallback`` method
applies a simple >2-standard-deviation rule.
"""

from __future__ import annotations

import os
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest


class DriftDetector:
    """Isolation Forest model for detecting operational drift."""

    # Expected metric keys in the order used for feature vectors.
    METRIC_KEYS = [
        "compliance_score",
        "response_time",
        "error_rate",
        "throughput",
        "latency_p99",
    ]

    def __init__(self) -> None:
        self.model: IsolationForest | None = None
        self.version: str = "1.0.0"
        self.is_loaded: bool = False
        self.metrics: dict = {}
        # Running statistics for fallback detection
        self._means: np.ndarray | None = None
        self._stds: np.ndarray | None = None

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(self, data: list[dict]) -> dict:
        """Train on normal-behaviour data.

        Parameters
        ----------
        data : list[dict]
            Each dict should contain some/all of :pyattr:`METRIC_KEYS`.

        Returns
        -------
        dict
            Training summary with sample count and contamination.
        """
        features = self._to_matrix(data)

        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(features)

        # Store running statistics for the fallback path as well
        self._means = np.mean(features, axis=0)
        self._stds = np.std(features, axis=0)
        # Replace zero stds with 1.0 to avoid division by zero
        self._stds[self._stds == 0] = 1.0

        self.is_loaded = True
        self.metrics = {
            "training_samples": len(data),
            "contamination": 0.05,
            "feature_count": features.shape[1],
        }
        return self.metrics

    # ------------------------------------------------------------------
    # Detection (trained model)
    # ------------------------------------------------------------------

    def detect(self, data: dict) -> dict:
        """Detect drift for a single observation.

        Parameters
        ----------
        data : dict
            Metrics dict (keys from :pyattr:`METRIC_KEYS`).

        Returns
        -------
        dict
            ``{ is_drifting, anomaly_score, threshold, details }``
        """
        if self.model is None:
            return self.detect_fallback(data)

        features = self._to_matrix([data])
        score = float(self.model.decision_function(features)[0])
        prediction = int(self.model.predict(features)[0])
        is_drifting = prediction == -1

        return {
            "is_drifting": is_drifting,
            "anomaly_score": round(score, 4),
            "threshold": 0.0,  # IsolationForest threshold is at 0
            "details": (
                "Anomalous behaviour detected — metrics deviate from "
                "learned normal envelope."
                if is_drifting
                else "Metrics are within the normal operating envelope."
            ),
        }

    # ------------------------------------------------------------------
    # Rule-based fallback
    # ------------------------------------------------------------------

    def detect_fallback(self, data: dict) -> dict:
        """Flag drift if any metric is >2 std from expected range.

        Uses stored statistics when available; otherwise falls back to
        hard-coded reference ranges.
        """
        if self._means is not None and self._stds is not None:
            means = self._means
            stds = self._stds
        else:
            # Hard-coded reference ranges (reasonable defaults)
            means = np.array([0.85, 200.0, 0.02, 100.0, 500.0])
            stds = np.array([0.10, 50.0, 0.01, 30.0, 100.0])

        features = self._to_vector(data)
        z_scores = np.abs((features - means) / stds)
        max_z = float(np.max(z_scores))
        is_drifting = bool(max_z > 2.0)

        deviating_keys = [
            self.METRIC_KEYS[i]
            for i in range(len(self.METRIC_KEYS))
            if i < len(z_scores) and z_scores[i] > 2.0
        ]

        details = (
            f"Drift detected — metrics deviating >2 std: {', '.join(deviating_keys)}"
            if is_drifting
            else "All metrics within 2 standard deviations of expected range."
        )

        return {
            "is_drifting": is_drifting,
            "anomaly_score": round(-max_z, 4),  # negative = more anomalous
            "threshold": -2.0,
            "details": details,
        }

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, path: str) -> None:
        """Save the trained model and statistics to *path*."""
        os.makedirs(path, exist_ok=True)
        if self.model is not None:
            joblib.dump(self.model, os.path.join(path, "model.joblib"))
        if self._means is not None:
            joblib.dump(
                {"means": self._means, "stds": self._stds},
                os.path.join(path, "stats.joblib"),
            )

    def load(self, path: str) -> None:
        """Load a trained model and statistics from *path*."""
        model_path = os.path.join(path, "model.joblib")
        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
            self.is_loaded = True

        stats_path = os.path.join(path, "stats.joblib")
        if os.path.exists(stats_path):
            stats = joblib.load(stats_path)
            self._means = stats["means"]
            self._stds = stats["stds"]

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _to_matrix(self, data: list[dict]) -> np.ndarray:
        """Convert a list of metric dicts to a 2-D numpy array."""
        rows = [self._to_vector(d) for d in data]
        return np.array(rows, dtype=np.float64)

    def _to_vector(self, data: dict) -> np.ndarray:
        """Convert a single metric dict to a 1-D numpy array."""
        return np.array(
            [float(data.get(k, 0.0)) for k in self.METRIC_KEYS],
            dtype=np.float64,
        )
