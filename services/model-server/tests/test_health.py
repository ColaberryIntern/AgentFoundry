"""
Tests for the /health endpoint.

Validates that:
- GET /health returns 200
- Response includes model status information
- Response includes service metadata
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_health_returns_200():
    """GET /health must return HTTP 200."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200


@pytest.mark.anyio
async def test_health_includes_status_field():
    """Response body must contain a top-level 'status' field."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    body = response.json()
    assert "status" in body
    assert body["status"] == "healthy"


@pytest.mark.anyio
async def test_health_includes_models_status():
    """Response body must include information about loaded models."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    body = response.json()
    assert "models" in body
    assert isinstance(body["models"], dict)
    # Each model entry should have an 'is_loaded' key
    for model_name, model_info in body["models"].items():
        assert "is_loaded" in model_info


@pytest.mark.anyio
async def test_health_includes_version():
    """Response body must include service version."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    body = response.json()
    assert "version" in body
