"""
Training orchestrator.

Coordinates ETL extraction, feature engineering, model training, and
artifact persistence for both the Compliance Gap and Regulatory
Predictor models.
"""

from __future__ import annotations

import logging
import time

import numpy as np
from sklearn.model_selection import train_test_split

from app.models.compliance_gap import ComplianceGapModel
from app.models.regulatory_predictor import RegulatoryPredictor
from app.pipeline.etl import ETLPipeline
from app.utils.model_store import ModelStore

logger = logging.getLogger(__name__)


class TrainingOrchestrator:
    """Orchestrates end-to-end training pipelines."""

    def __init__(self, etl: ETLPipeline, model_store: ModelStore) -> None:
        self.etl = etl
        self.model_store = model_store

    # ------------------------------------------------------------------
    # Compliance gap model
    # ------------------------------------------------------------------

    async def train_compliance_gap_model(self) -> dict:
        """Full training pipeline for the compliance gap model.

        Steps:
        1. ETL extract
        2. Transform / feature engineering
        3. Train model
        4. Evaluate
        5. Save model + metrics

        Returns a dict with model_name, version, metrics, artifact_path.
        """
        start = time.time()
        logger.info("Starting compliance gap model training")

        # 1. Extract
        raw_data = await self.etl.extract_compliance_data()

        if not raw_data:
            logger.warning(
                "No compliance data available — generating synthetic data "
                "for initial model bootstrap"
            )
            raw_data = self._generate_synthetic_compliance_data(200)

        # 2. Transform
        features, labels = self.etl.transform_for_gap_analysis(raw_data)

        # 3. Train
        model = ComplianceGapModel()
        metrics = model.train(features, labels)

        # 4. Determine version
        latest = self.model_store.get_latest_version("compliance-gap")
        version = self._next_version(latest)

        # 5. Save
        artifact_path = self.model_store.save_model(
            model, "compliance-gap", version, metrics
        )

        elapsed = time.time() - start
        logger.info(
            "Compliance gap model trained in %.1fs — version %s, accuracy %.3f",
            elapsed,
            version,
            metrics.get("accuracy", 0),
        )

        return {
            "model_name": "compliance-gap",
            "version": version,
            "metrics": metrics,
            "artifact_path": artifact_path,
            "training_time_s": round(elapsed, 2),
        }

    # ------------------------------------------------------------------
    # Regulatory predictor
    # ------------------------------------------------------------------

    async def train_regulatory_predictor(self) -> dict:
        """Full training pipeline for the regulatory predictor.

        Returns a dict with model_name, version, metrics, artifact_path.
        """
        start = time.time()
        logger.info("Starting regulatory predictor training")

        raw_data = await self.etl.extract_regulatory_data()

        if not raw_data:
            logger.warning(
                "No regulatory data available — generating synthetic data "
                "for initial model bootstrap"
            )
            raw_data = self._generate_synthetic_regulatory_data(200)

        sequences, labels = self.etl.transform_for_predictions(raw_data)

        model = RegulatoryPredictor()
        metrics = model.train(sequences, labels)

        latest = self.model_store.get_latest_version("regulatory-predictor")
        version = self._next_version(latest)

        artifact_path = self.model_store.save_model(
            model, "regulatory-predictor", version, metrics
        )

        elapsed = time.time() - start
        logger.info(
            "Regulatory predictor trained in %.1fs — version %s, accuracy %.3f",
            elapsed,
            version,
            metrics.get("accuracy", 0),
        )

        return {
            "model_name": "regulatory-predictor",
            "version": version,
            "metrics": metrics,
            "artifact_path": artifact_path,
            "training_time_s": round(elapsed, 2),
        }

    # ------------------------------------------------------------------
    # Synthetic data generators (for bootstrap / testing)
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_synthetic_compliance_data(n: int) -> list[dict]:
        """Generate *n* synthetic compliance records for bootstrapping."""
        rng = np.random.default_rng(42)
        records: list[dict] = []
        for _ in range(n):
            rate = float(rng.uniform(0.1, 1.0))
            records.append(
                {
                    "compliance_rate": rate,
                    "days_since_check": int(rng.integers(1, 400)),
                    "regulation_count": int(rng.integers(1, 20)),
                    "non_compliant_count": int(rng.integers(0, 10)),
                    "total_count": 10,
                    "pending_count": int(rng.integers(0, 5)),
                    "alert_count": int(rng.integers(0, 15)),
                    "has_gap": rate < 0.5,
                }
            )
        return records

    @staticmethod
    def _generate_synthetic_regulatory_data(n: int) -> list[dict]:
        """Generate *n* synthetic regulatory records for bootstrapping."""
        rng = np.random.default_rng(42)
        reg_types = ["data_privacy", "financial", "security", "healthcare", "environmental"]
        records: list[dict] = []
        for i in range(n):
            freq = int(rng.integers(0, 10))
            records.append(
                {
                    "regulation_id": f"reg-{i}",
                    "change_frequency": freq,
                    "severity": int(rng.integers(1, 6)),
                    "days_between_changes": int(rng.integers(30, 730)),
                    "regulation_type": rng.choice(reg_types),
                    "changed": freq > 4,
                }
            )
        return records

    # ------------------------------------------------------------------
    # Version helpers
    # ------------------------------------------------------------------

    @staticmethod
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
