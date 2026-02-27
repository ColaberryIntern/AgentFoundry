"""
ETL pipeline for extracting, transforming, and loading compliance and
regulatory data.

When the database is unavailable (e.g. during tests), extraction
methods return empty lists gracefully.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np

from app.pipeline.features import extract_compliance_features, extract_regulatory_features

logger = logging.getLogger(__name__)


class ETLPipeline:
    """Extract-Transform-Load pipeline for model training data."""

    def __init__(self, db_url: str) -> None:
        self.db_url = db_url

    # ------------------------------------------------------------------
    # Extract (async, database-aware)
    # ------------------------------------------------------------------

    async def extract_compliance_data(self) -> list[dict]:
        """Extract compliance records from the database.

        Returns an empty list when the database is unreachable so that
        callers can degrade gracefully.
        """
        try:
            from sqlalchemy.ext.asyncio import create_async_engine
            from sqlalchemy import text

            # Convert sync postgres URL to async
            async_url = self.db_url.replace("postgresql://", "postgresql+asyncpg://")
            engine = create_async_engine(async_url)
            async with engine.connect() as conn:
                result = await conn.execute(
                    text(
                        "SELECT * FROM compliance_records "
                        "ORDER BY created_at DESC LIMIT 10000"
                    )
                )
                rows = result.mappings().all()
                return [dict(r) for r in rows]
        except Exception as exc:
            logger.warning("Could not extract compliance data: %s", exc)
            return []

    async def extract_user_data(self) -> list[dict]:
        """Extract user activity data from the database."""
        try:
            from sqlalchemy.ext.asyncio import create_async_engine
            from sqlalchemy import text

            async_url = self.db_url.replace("postgresql://", "postgresql+asyncpg://")
            engine = create_async_engine(async_url)
            async with engine.connect() as conn:
                result = await conn.execute(
                    text("SELECT * FROM users ORDER BY created_at DESC LIMIT 10000")
                )
                rows = result.mappings().all()
                return [dict(r) for r in rows]
        except Exception as exc:
            logger.warning("Could not extract user data: %s", exc)
            return []

    async def extract_regulatory_data(self) -> list[dict]:
        """Extract regulatory compliance records from the database."""
        try:
            from sqlalchemy.ext.asyncio import create_async_engine
            from sqlalchemy import text

            async_url = self.db_url.replace("postgresql://", "postgresql+asyncpg://")
            engine = create_async_engine(async_url)
            async with engine.connect() as conn:
                result = await conn.execute(
                    text(
                        "SELECT * FROM compliance_records "
                        "WHERE regulation_id IS NOT NULL "
                        "ORDER BY created_at DESC LIMIT 10000"
                    )
                )
                rows = result.mappings().all()
                return [dict(r) for r in rows]
        except Exception as exc:
            logger.warning("Could not extract regulatory data: %s", exc)
            return []

    # ------------------------------------------------------------------
    # Transform (pure, no I/O)
    # ------------------------------------------------------------------

    def transform_for_gap_analysis(
        self, raw_data: list[dict]
    ) -> tuple[np.ndarray, np.ndarray]:
        """Transform compliance records into (features, labels).

        Each record is expected to have a ``has_gap`` boolean field used
        as the label.  Feature columns are produced by
        :func:`extract_compliance_features`.
        """
        if not raw_data:
            return np.empty((0, 6)), np.empty((0,))

        features = extract_compliance_features(raw_data)
        labels = np.array(
            [1 if rec.get("has_gap", False) else 0 for rec in raw_data],
            dtype=np.int64,
        )
        return features, labels

    def transform_for_predictions(
        self, raw_data: list[dict]
    ) -> tuple[np.ndarray, np.ndarray]:
        """Transform regulatory records into (sequences, labels).

        Each record is expected to have a ``changed`` boolean field used
        as the label.  Feature columns are produced by
        :func:`extract_regulatory_features`.
        """
        if not raw_data:
            return np.empty((0, 4)), np.empty((0,))

        sequences = extract_regulatory_features(raw_data)
        labels = np.array(
            [1 if rec.get("changed", False) else 0 for rec in raw_data],
            dtype=np.int64,
        )
        return sequences, labels
