"""
Market Signal Predictor — lightweight time-series forecasting.

Instead of a full ARIMA/statsmodels dependency this module implements
moving-average + linear-trend extrapolation, keeping the server
dependency-light while still providing useful predictions.
"""

from __future__ import annotations

import math
from typing import Any


class MarketSignalPredictor:
    """Moving-average + trend predictor for regulatory market signals."""

    def __init__(self) -> None:
        self.version: str = "1.0.0"
        self.is_loaded: bool = True  # no training required

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------

    def predict(
        self,
        industry: str,
        history: list[dict],
        forecast_periods: int = 4,
    ) -> dict:
        """Predict future regulatory activity for an industry.

        Parameters
        ----------
        industry : str
            Industry vertical (e.g. ``"fintech"``, ``"healthcare"``).
        history : list[dict]
            Time-ordered observations.  Each dict must contain at least:
            - ``period`` (str) — e.g. ``"2025-Q1"``
            - ``activity_count`` (int | float)
        forecast_periods : int
            How many future periods to forecast (default 4).

        Returns
        -------
        dict
            ``{ predictions, industry, model_type }``
        """
        if not history:
            return self._empty_prediction(industry)

        # Extract the numeric series
        values = [float(h.get("activity_count", 0)) for h in history]
        periods = [h.get("period", f"T-{i}") for i, h in enumerate(history)]

        # Compute linear trend from last min(6, len) data points
        window = min(6, len(values))
        recent = values[-window:]
        slope, intercept = self._linear_trend(recent)

        # Moving average for baseline
        ma_window = min(3, len(values))
        moving_avg = sum(values[-ma_window:]) / ma_window

        # Generate predictions
        predictions: list[dict] = []
        last_period = periods[-1] if periods else "T-0"

        for i in range(1, forecast_periods + 1):
            trend_value = intercept + slope * (window + i)
            # Blend: 60 % trend, 40 % moving average
            blended = trend_value * 0.6 + moving_avg * 0.4
            predicted = max(0.0, blended)

            # Confidence decays with forecast horizon
            confidence = max(0.1, 1.0 - 0.15 * i)

            trend_label = (
                "increasing" if slope > 0.5
                else "decreasing" if slope < -0.5
                else "stable"
            )

            predictions.append(
                {
                    "period": self._next_period(last_period, i),
                    "predicted_activity": round(predicted, 2),
                    "confidence": round(confidence, 4),
                    "trend": trend_label,
                }
            )

        return {
            "predictions": predictions,
            "industry": industry,
            "model_type": "moving_average",
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _linear_trend(values: list[float]) -> tuple[float, float]:
        """Compute slope and intercept via least-squares on *values*.

        Returns ``(slope, intercept)``.
        """
        n = len(values)
        if n < 2:
            return 0.0, values[0] if values else 0.0

        x_mean = (n - 1) / 2.0
        y_mean = sum(values) / n

        numerator = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
        denominator = sum((i - x_mean) ** 2 for i in range(n))

        if denominator == 0:
            return 0.0, y_mean

        slope = numerator / denominator
        intercept = y_mean - slope * x_mean
        return slope, intercept

    @staticmethod
    def _next_period(last_period: str, offset: int) -> str:
        """Generate a future period label.

        Supports ``YYYY-QN`` format; falls back to ``T+offset``.
        """
        try:
            if "-Q" in last_period:
                year_str, q_str = last_period.split("-Q")
                year = int(year_str)
                quarter = int(q_str)
                total_q = (year * 4 + quarter - 1) + offset
                new_year = total_q // 4
                new_quarter = (total_q % 4) + 1
                return f"{new_year}-Q{new_quarter}"
        except (ValueError, IndexError):
            pass
        return f"T+{offset}"

    @staticmethod
    def _empty_prediction(industry: str) -> dict:
        """Return an empty prediction set when no history is provided."""
        return {
            "predictions": [],
            "industry": industry,
            "model_type": "moving_average",
        }
