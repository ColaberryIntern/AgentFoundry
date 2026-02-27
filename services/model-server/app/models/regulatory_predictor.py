"""
Regulatory Predictor — statistical model for regulatory change prediction.

For the MVP this uses a Gradient Boosting classifier (scikit-learn) as a
stand-in for the LSTM architecture.  A ``USE_NEURAL_MODEL`` class flag
is provided so the implementation can be swapped to a PyTorch LSTM later
without touching callers.

When no trained model is available the ``predict_fallback`` method
performs simple statistical trend analysis.
"""

from __future__ import annotations

import os

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split


class RegulatoryPredictor:
    """Statistical/ML model for predicting regulatory changes.

    Set ``USE_NEURAL_MODEL = True`` to enable a future PyTorch LSTM
    backend (not implemented in MVP).
    """

    USE_NEURAL_MODEL: bool = False  # flip to True when LSTM is ready

    def __init__(self) -> None:
        self.model: GradientBoostingClassifier | None = None
        self.version: str = "1.0.0"
        self.is_loaded: bool = False
        self.metrics: dict = {}

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(self, sequences: np.ndarray, labels: np.ndarray) -> dict:
        """Train the statistical model on regulatory feature sequences.

        Parameters
        ----------
        sequences : np.ndarray
            2-D array — each row is a feature vector for one regulation.
        labels : np.ndarray
            Binary labels (1 = change expected, 0 = no change).

        Returns
        -------
        dict
            Training metrics.
        """
        if self.USE_NEURAL_MODEL:
            raise NotImplementedError(
                "Neural LSTM backend is not implemented in the MVP. "
                "Set USE_NEURAL_MODEL = False."
            )

        self.model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
        )

        if len(sequences) >= 10:
            X_train, X_val, y_train, y_val = train_test_split(
                sequences, labels, test_size=0.2, random_state=42
            )
        else:
            X_train, X_val, y_train, y_val = (
                sequences,
                sequences,
                labels,
                labels,
            )

        self.model.fit(X_train, y_train)
        y_pred = self.model.predict(X_val)

        self.metrics = {
            "accuracy": float(accuracy_score(y_val, y_pred)),
            "f1": float(f1_score(y_val, y_pred, zero_division=0)),
            "training_samples": int(len(X_train)),
            "validation_samples": int(len(X_val)),
        }
        self.is_loaded = True
        return self.metrics

    # ------------------------------------------------------------------
    # Prediction (trained model)
    # ------------------------------------------------------------------

    def predict(
        self,
        features: np.ndarray,
        regulation_ids: list[str] | None = None,
    ) -> list[dict]:
        """Predict regulatory changes from feature vectors.

        Parameters
        ----------
        features : np.ndarray
            2-D array of regulatory feature vectors.
        regulation_ids : list[str] | None
            Optional list of regulation IDs matching the rows.
        """
        if self.model is None:
            raise RuntimeError(
                "Model not loaded. Call train() or load() first, "
                "or use predict_fallback() for statistical analysis."
            )

        predictions = self.model.predict(features)
        probabilities = self.model.predict_proba(features)

        if regulation_ids is None:
            regulation_ids = [f"reg-{i}" for i in range(len(features))]

        results: list[dict] = []
        for i, (pred, proba) in enumerate(zip(predictions, probabilities)):
            change_expected = bool(pred == 1)
            likelihood = float(proba[1]) if len(proba) > 1 else float(max(proba))
            results.append(
                {
                    "regulation_id": regulation_ids[i] if i < len(regulation_ids) else f"reg-{i}",
                    "predicted_change": "change_expected" if change_expected else "stable",
                    "likelihood": round(likelihood, 4),
                    "timeframe": self._estimate_timeframe(likelihood),
                    "impact": self._estimate_impact(likelihood, change_expected),
                }
            )
        return results

    # ------------------------------------------------------------------
    # Statistical fallback
    # ------------------------------------------------------------------

    def predict_fallback(self, regulation_data: list[dict]) -> list[dict]:
        """Simple statistical trend analysis when no trained model exists.

        Estimates likelihood of regulatory change based on historical
        change frequency and severity signals.
        """
        results: list[dict] = []
        for rec in regulation_data:
            reg_id = rec.get("regulation_id", "unknown")
            change_freq = float(rec.get("change_frequency", 0))
            severity = float(rec.get("severity", 0))

            # Exponential smoothing heuristic: higher frequency & severity
            # imply higher likelihood of upcoming changes.
            likelihood = min(1.0, (change_freq * 0.15) + (severity * 0.1))
            change_expected = likelihood >= 0.5

            results.append(
                {
                    "regulation_id": reg_id,
                    "predicted_change": (
                        "change_expected" if change_expected else "stable"
                    ),
                    "likelihood": round(likelihood, 4),
                    "timeframe": self._estimate_timeframe(likelihood),
                    "impact": self._estimate_impact(likelihood, change_expected),
                }
            )
        return results

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, path: str) -> None:
        """Save the trained model to *path* via joblib."""
        os.makedirs(path, exist_ok=True)
        if self.model is not None:
            joblib.dump(self.model, os.path.join(path, "model.joblib"))

    def load(self, path: str) -> None:
        """Load a trained model from *path*."""
        model_path = os.path.join(path, "model.joblib")
        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
            self.is_loaded = True

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _estimate_timeframe(likelihood: float) -> str:
        if likelihood >= 0.8:
            return "1-3 months"
        if likelihood >= 0.5:
            return "3-6 months"
        if likelihood >= 0.3:
            return "6-12 months"
        return "12+ months"

    @staticmethod
    def _estimate_impact(likelihood: float, change_expected: bool) -> str:
        if not change_expected:
            return "low"
        if likelihood >= 0.8:
            return "high"
        if likelihood >= 0.5:
            return "medium"
        return "low"
