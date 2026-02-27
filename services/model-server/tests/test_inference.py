"""
Tests for the inference endpoints.

Validates that:
- POST /predict/compliance-gaps with valid data returns 200 + recommendations
- POST /predict/regulatory-changes with valid data returns 200 + predictions
- POST /predict/drift-analysis with valid data returns 200 + drift result
- POST /predict/optimize-deployment with valid data returns 200 + config
- POST /predict/market-signals with valid data returns 200 + predictions
- POST /predict/classify-regulations with valid data returns 200 + clusters
- Missing required fields return 422
- Rule-based fallback works when no trained model is loaded
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


# ----------------------------------------------------------------
# Compliance gap predictions
# ----------------------------------------------------------------


@pytest.mark.anyio
async def test_predict_compliance_gaps_valid_data():
    """POST /predict/compliance-gaps with valid payload returns 200."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/compliance-gaps",
            json={
                "user_id": "user-001",
                "compliance_data": [
                    {
                        "regulation_id": "reg-1",
                        "status": "non_compliant",
                        "compliance_rate": 0.6,
                        "last_check_date": "2025-12-01",
                        "category": "data_privacy",
                    }
                ],
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert "recommendations" in body
    assert isinstance(body["recommendations"], list)
    assert "model_version" in body
    assert "inference_time_ms" in body
    assert body["inference_time_ms"] >= 0


@pytest.mark.anyio
async def test_predict_compliance_gaps_returns_recommendations():
    """Recommendations must include gap_type, severity, confidence."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/compliance-gaps",
            json={
                "user_id": "user-002",
                "compliance_data": [
                    {
                        "regulation_id": "reg-1",
                        "status": "non_compliant",
                        "compliance_rate": 0.3,
                        "last_check_date": "2025-06-01",
                        "category": "financial",
                    }
                ],
            },
        )
    body = response.json()
    assert len(body["recommendations"]) > 0
    rec = body["recommendations"][0]
    assert "gap_type" in rec
    assert "severity" in rec
    assert "confidence" in rec


@pytest.mark.anyio
async def test_predict_compliance_gaps_missing_fields():
    """Missing required fields should return 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Missing user_id
        response = await client.post(
            "/predict/compliance-gaps",
            json={"compliance_data": []},
        )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_predict_compliance_gaps_empty_data():
    """Empty compliance_data should return 200 with empty recommendations."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/compliance-gaps",
            json={"user_id": "user-003", "compliance_data": []},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["recommendations"] == []


@pytest.mark.anyio
async def test_predict_compliance_gaps_rule_based_fallback():
    """Without a trained model, rule-based fallback must still produce results."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/compliance-gaps",
            json={
                "user_id": "user-fallback",
                "compliance_data": [
                    {
                        "regulation_id": "reg-x",
                        "status": "non_compliant",
                        "compliance_rate": 0.2,
                        "last_check_date": "2024-01-01",
                        "category": "security",
                    }
                ],
            },
        )
    assert response.status_code == 200
    body = response.json()
    # Rule-based fallback should flag low compliance_rate
    assert len(body["recommendations"]) > 0


# ----------------------------------------------------------------
# Regulatory change predictions
# ----------------------------------------------------------------


@pytest.mark.anyio
async def test_predict_regulatory_changes_valid_data():
    """POST /predict/regulatory-changes with valid payload returns 200."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/regulatory-changes",
            json={
                "user_id": "user-010",
                "regulation_ids": ["reg-1", "reg-2"],
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert "predictions" in body
    assert isinstance(body["predictions"], list)
    assert "model_version" in body
    assert "inference_time_ms" in body


@pytest.mark.anyio
async def test_predict_regulatory_changes_returns_predictions():
    """Each prediction must include regulation_id, predicted_change, likelihood."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/regulatory-changes",
            json={
                "user_id": "user-011",
                "regulation_ids": ["reg-1"],
            },
        )
    body = response.json()
    assert len(body["predictions"]) > 0
    pred = body["predictions"][0]
    assert "regulation_id" in pred
    assert "predicted_change" in pred
    assert "likelihood" in pred


@pytest.mark.anyio
async def test_predict_regulatory_changes_missing_fields():
    """Missing required fields should return 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/regulatory-changes",
            json={"regulation_ids": ["reg-1"]},
        )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_predict_regulatory_changes_empty_ids():
    """Empty regulation_ids should return 200 with empty predictions."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/regulatory-changes",
            json={"user_id": "user-012", "regulation_ids": []},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["predictions"] == []


# ----------------------------------------------------------------
# Drift analysis
# ----------------------------------------------------------------


@pytest.mark.anyio
async def test_predict_drift_analysis_valid_data():
    """POST /predict/drift-analysis with valid payload returns 200."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/drift-analysis",
            json={
                "agent_id": "agent-001",
                "metrics": {
                    "compliance_score": 0.85,
                    "response_time": 200.0,
                    "error_rate": 0.02,
                    "throughput": 100.0,
                    "latency_p99": 500.0,
                },
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert "agent_id" in body
    assert body["agent_id"] == "agent-001"
    assert "is_drifting" in body
    assert "anomaly_score" in body
    assert "threshold" in body
    assert "details" in body
    assert "model_version" in body
    assert "inference_time_ms" in body


@pytest.mark.anyio
async def test_predict_drift_analysis_missing_fields():
    """Missing required fields should return 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/drift-analysis",
            json={"metrics": {}},
        )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_predict_drift_analysis_detects_anomaly():
    """Highly deviant metrics should flag drift."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/drift-analysis",
            json={
                "agent_id": "agent-drift",
                "metrics": {
                    "compliance_score": 0.01,
                    "response_time": 9999.0,
                    "error_rate": 0.99,
                    "throughput": 0.1,
                    "latency_p99": 50000.0,
                },
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert body["is_drifting"] is True


# ----------------------------------------------------------------
# Deployment optimisation
# ----------------------------------------------------------------


@pytest.mark.anyio
async def test_predict_optimize_deployment_valid_data():
    """POST /predict/optimize-deployment with valid payload returns 200."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/optimize-deployment",
            json={
                "constraints": {
                    "max_cpu": 16,
                    "max_memory": 32768,
                    "target_latency": 100,
                    "agent_count": 4,
                },
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert "recommended_config" in body
    assert "fitness_score" in body
    assert "generations" in body
    assert "alternatives" in body
    assert "inference_time_ms" in body


@pytest.mark.anyio
async def test_predict_optimize_deployment_missing_fields():
    """Missing required fields should return 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/optimize-deployment",
            json={},
        )
    assert response.status_code == 422


# ----------------------------------------------------------------
# Market signals
# ----------------------------------------------------------------


@pytest.mark.anyio
async def test_predict_market_signals_valid_data():
    """POST /predict/market-signals with valid payload returns 200."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/market-signals",
            json={
                "industry": "fintech",
                "history": [
                    {"period": "2025-Q1", "activity_count": 10},
                    {"period": "2025-Q2", "activity_count": 15},
                    {"period": "2025-Q3", "activity_count": 20},
                ],
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert "predictions" in body
    assert "industry" in body
    assert body["industry"] == "fintech"
    assert "model_type" in body
    assert "inference_time_ms" in body


@pytest.mark.anyio
async def test_predict_market_signals_empty_history():
    """Empty history should return 200 with empty predictions."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/market-signals",
            json={
                "industry": "healthcare",
                "history": [],
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert body["predictions"] == []


@pytest.mark.anyio
async def test_predict_market_signals_missing_fields():
    """Missing required fields should return 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/market-signals",
            json={"history": []},
        )
    assert response.status_code == 422


# ----------------------------------------------------------------
# Regulation taxonomy classification
# ----------------------------------------------------------------


@pytest.mark.anyio
async def test_predict_classify_regulations_valid_data():
    """POST /predict/classify-regulations with valid payload returns 200."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/classify-regulations",
            json={
                "regulations": [
                    {
                        "id": "reg-1",
                        "title": "GDPR Data Protection",
                        "description": "EU data privacy regulation.",
                    },
                    {
                        "id": "reg-2",
                        "title": "SOX Financial Reporting",
                        "description": "Financial auditing requirements.",
                    },
                    {
                        "id": "reg-3",
                        "title": "HIPAA Health Data",
                        "description": "Health information privacy and security.",
                    },
                ],
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert "clusters" in body
    assert "total_clusters" in body
    assert "method" in body
    assert "inference_time_ms" in body
    assert body["total_clusters"] >= 1


@pytest.mark.anyio
async def test_predict_classify_regulations_missing_fields():
    """Missing required fields should return 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/classify-regulations",
            json={},
        )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_predict_classify_regulations_single():
    """Single regulation should fall back to keyword classification."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/predict/classify-regulations",
            json={
                "regulations": [
                    {
                        "id": "reg-solo",
                        "title": "GDPR Privacy",
                        "description": "Data protection regulation.",
                    },
                ],
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert body["method"] == "keyword_fallback"
