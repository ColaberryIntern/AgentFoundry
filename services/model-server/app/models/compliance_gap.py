"""
Compliance Gap Model — Random Forest classifier with rule-based fallback.

When no trained model is available the ``predict_fallback`` method
applies deterministic rules to flag obvious compliance gaps.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split


class ComplianceGapModel:
    """Random Forest classifier for compliance gap detection."""

    def __init__(self) -> None:
        self.model: RandomForestClassifier | None = None
        self.version: str = "1.0.0"
        self.is_loaded: bool = False
        self.metrics: dict = {}

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(self, features: np.ndarray, labels: np.ndarray) -> dict:
        """Train a Random Forest on compliance feature vectors.

        Parameters
        ----------
        features : np.ndarray
            2-D array of compliance metrics.
        labels : np.ndarray
            Binary labels (1 = gap, 0 = no gap).

        Returns
        -------
        dict
            Training metrics: accuracy, f1, precision, recall.
        """
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1,
        )

        # Use a train/validation split when there is enough data
        if len(features) >= 10:
            X_train, X_val, y_train, y_val = train_test_split(
                features, labels, test_size=0.2, random_state=42
            )
        else:
            X_train, X_val, y_train, y_val = features, features, labels, labels

        self.model.fit(X_train, y_train)
        y_pred = self.model.predict(X_val)

        self.metrics = {
            "accuracy": float(accuracy_score(y_val, y_pred)),
            "f1": float(f1_score(y_val, y_pred, zero_division=0)),
            "precision": float(precision_score(y_val, y_pred, zero_division=0)),
            "recall": float(recall_score(y_val, y_pred, zero_division=0)),
            "training_samples": int(len(X_train)),
            "validation_samples": int(len(X_val)),
        }
        self.is_loaded = True
        return self.metrics

    # ------------------------------------------------------------------
    # Prediction (trained model)
    # ------------------------------------------------------------------

    def predict(self, features: np.ndarray) -> list[dict]:
        """Predict compliance gaps from feature vectors.

        Requires a trained or loaded model.  For raw compliance data
        dicts (when no model is available) use :meth:`predict_fallback`.
        """
        if self.model is None:
            raise RuntimeError(
                "Model not loaded. Call train() or load() first, "
                "or use predict_fallback() for rule-based analysis."
            )

        predictions = self.model.predict(features)
        probabilities = self.model.predict_proba(features)

        results: list[dict] = []
        for i, (pred, proba) in enumerate(zip(predictions, probabilities)):
            is_gap = bool(pred == 1)
            confidence = float(max(proba))
            severity = self._severity_from_confidence(confidence, is_gap)
            results.append(
                {
                    "gap_type": "compliance_gap" if is_gap else "no_gap",
                    "severity": severity,
                    "confidence": round(confidence, 4),
                    "title": (
                        "Compliance gap detected" if is_gap else "No gap detected"
                    ),
                    "description": (
                        f"Model predicts {'a gap' if is_gap else 'no gap'} "
                        f"with {confidence:.1%} confidence."
                    ),
                }
            )
        return results

    # ------------------------------------------------------------------
    # Rule-based fallback
    # ------------------------------------------------------------------

    def predict_fallback(self, compliance_records: list[dict]) -> list[dict]:
        """Deterministic rule-based compliance gap analysis.

        Used when no trained model is available.  Analyzes raw
        compliance data fields and flags obvious gaps.
        """
        results: list[dict] = []
        for rec in compliance_records:
            compliance_rate = float(rec.get("compliance_rate", 1.0))
            status = rec.get("status", "compliant")
            category = rec.get("category", "general")

            flags: list[dict] = []

            # Rule 1: Low compliance rate
            if compliance_rate < 0.5:
                flags.append(
                    {
                        "gap_type": "low_compliance_rate",
                        "severity": "critical" if compliance_rate < 0.3 else "high",
                        "confidence": round(1.0 - compliance_rate, 4),
                        "title": f"Low compliance rate ({compliance_rate:.0%})",
                        "description": (
                            f"Compliance rate of {compliance_rate:.0%} in "
                            f"'{category}' is below acceptable threshold."
                        ),
                    }
                )
            elif compliance_rate < 0.7:
                flags.append(
                    {
                        "gap_type": "moderate_compliance_rate",
                        "severity": "medium",
                        "confidence": round(1.0 - compliance_rate, 4),
                        "title": f"Moderate compliance rate ({compliance_rate:.0%})",
                        "description": (
                            f"Compliance rate of {compliance_rate:.0%} in "
                            f"'{category}' may need attention."
                        ),
                    }
                )

            # Rule 2: Non-compliant status
            if status == "non_compliant":
                flags.append(
                    {
                        "gap_type": "non_compliant_status",
                        "severity": "high",
                        "confidence": 0.95,
                        "title": f"Non-compliant status in {category}",
                        "description": (
                            f"Record is marked as non-compliant in '{category}'."
                        ),
                    }
                )

            # Rule 3: Stale check date
            last_check = rec.get("last_check_date")
            if last_check:
                try:
                    check_date = datetime.fromisoformat(last_check)
                    if check_date.tzinfo is None:
                        check_date = check_date.replace(tzinfo=timezone.utc)
                    days_since = (
                        datetime.now(timezone.utc) - check_date
                    ).days
                    if days_since > 180:
                        flags.append(
                            {
                                "gap_type": "stale_compliance_check",
                                "severity": "high" if days_since > 365 else "medium",
                                "confidence": min(0.99, days_since / 730),
                                "title": f"Stale compliance check ({days_since} days)",
                                "description": (
                                    f"Last compliance check was {days_since} days ago."
                                ),
                            }
                        )
                except (ValueError, TypeError):
                    pass

            results.extend(flags)

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
    def _severity_from_confidence(confidence: float, is_gap: bool) -> str:
        if not is_gap:
            return "none"
        if confidence >= 0.9:
            return "critical"
        if confidence >= 0.75:
            return "high"
        if confidence >= 0.6:
            return "medium"
        return "low"
