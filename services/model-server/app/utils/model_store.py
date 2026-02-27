"""
Model artifact storage and loading.

Handles saving/loading model artifacts and metadata to/from disk with
semantic versioning support.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import TYPE_CHECKING

import joblib

if TYPE_CHECKING:
    from app.models.compliance_gap import ComplianceGapModel
    from app.models.regulatory_predictor import RegulatoryPredictor


class ModelStore:
    """Manages model artifacts on the local filesystem.

    Directory layout::

        {model_dir}/{name}/{version}/model.joblib
        {model_dir}/{name}/{version}/metadata.json
    """

    def __init__(self, model_dir: str) -> None:
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)

    # ------------------------------------------------------------------
    # Save
    # ------------------------------------------------------------------

    def save_model(
        self,
        model: "ComplianceGapModel | RegulatoryPredictor",
        name: str,
        version: str,
        metrics: dict,
    ) -> str:
        """Save a model artifact and its metadata to disk.

        Returns the path to the version directory.
        """
        version_dir = os.path.join(self.model_dir, name, version)
        os.makedirs(version_dir, exist_ok=True)

        # Persist the model using its own save method
        model.save(version_dir)

        # Write metadata sidecar
        metadata = {
            "name": name,
            "version": version,
            "metrics": metrics,
            "saved_at": datetime.now(timezone.utc).isoformat(),
            "model_class": type(model).__name__,
        }
        metadata_path = os.path.join(version_dir, "metadata.json")
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)

        return version_dir

    # ------------------------------------------------------------------
    # Load
    # ------------------------------------------------------------------

    def load_model(
        self, name: str, version: str = "latest"
    ) -> "ComplianceGapModel | RegulatoryPredictor | None":
        """Load a model artifact from disk.

        If *version* is ``"latest"``, the highest semantic version found
        on disk is used.  Returns ``None`` if no artifact exists.
        """
        if version == "latest":
            version = self.get_latest_version(name)
            if version is None:
                return None

        version_dir = os.path.join(self.model_dir, name, version)
        if not os.path.isdir(version_dir):
            return None

        # Read metadata to determine model class
        metadata_path = os.path.join(version_dir, "metadata.json")
        if not os.path.exists(metadata_path):
            return None

        with open(metadata_path) as f:
            metadata = json.load(f)

        model_class_name = metadata.get("model_class", "")

        # Lazy imports to avoid circular dependencies
        if model_class_name == "ComplianceGapModel":
            from app.models.compliance_gap import ComplianceGapModel

            model = ComplianceGapModel()
        elif model_class_name == "RegulatoryPredictor":
            from app.models.regulatory_predictor import RegulatoryPredictor

            model = RegulatoryPredictor()
        else:
            return None

        model.load(version_dir)
        return model

    # ------------------------------------------------------------------
    # Listing / versioning
    # ------------------------------------------------------------------

    def list_models(self) -> list[dict]:
        """Return a list of all stored models with their versions."""
        result: list[dict] = []
        if not os.path.isdir(self.model_dir):
            return result

        for name in sorted(os.listdir(self.model_dir)):
            name_dir = os.path.join(self.model_dir, name)
            if not os.path.isdir(name_dir):
                continue
            versions: list[str] = []
            for ver in sorted(os.listdir(name_dir)):
                ver_dir = os.path.join(name_dir, ver)
                if os.path.isdir(ver_dir):
                    versions.append(ver)
            if versions:
                latest = self._pick_latest(versions)
                # Read metadata for the latest version
                metadata_path = os.path.join(name_dir, latest, "metadata.json")
                metrics = None
                if os.path.exists(metadata_path):
                    with open(metadata_path) as f:
                        meta = json.load(f)
                    metrics = meta.get("metrics")
                result.append(
                    {
                        "name": name,
                        "versions": versions,
                        "latest_version": latest,
                        "metrics": metrics,
                    }
                )
        return result

    def get_latest_version(self, name: str) -> str | None:
        """Return the latest semantic version string for *name*, or None."""
        name_dir = os.path.join(self.model_dir, name)
        if not os.path.isdir(name_dir):
            return None
        versions = [
            v
            for v in os.listdir(name_dir)
            if os.path.isdir(os.path.join(name_dir, v))
        ]
        if not versions:
            return None
        return self._pick_latest(versions)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _pick_latest(versions: list[str]) -> str:
        """Pick the highest semantic version from a list of version strings."""

        def _version_key(v: str) -> tuple[int, ...]:
            parts = v.replace("v", "").split(".")
            result = []
            for p in parts:
                try:
                    result.append(int(p))
                except ValueError:
                    result.append(0)
            return tuple(result)

        return max(versions, key=_version_key)
