"""
Tests for the DeploymentOptimizer model.

Validates:
- Optimisation with standard constraints
- Convergence (generations run)
- Alternatives returned
- Fitness score is non-negative for valid constraints
- Config respects constraints
"""

import pytest

from app.models.deployment_optimizer import DeploymentOptimizer


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------


@pytest.fixture
def optimizer() -> DeploymentOptimizer:
    return DeploymentOptimizer()


@pytest.fixture
def constraints() -> dict:
    return {
        "max_cpu": 16,
        "max_memory": 32768,
        "target_latency": 100,
        "agent_count": 4,
    }


# ------------------------------------------------------------------
# Optimisation
# ------------------------------------------------------------------


def test_optimize_returns_required_keys(optimizer: DeploymentOptimizer, constraints: dict):
    result = optimizer.optimize(constraints)

    assert "recommended_config" in result
    assert "fitness_score" in result
    assert "generations" in result
    assert "alternatives" in result


def test_optimize_config_has_expected_fields(optimizer: DeploymentOptimizer, constraints: dict):
    result = optimizer.optimize(constraints)
    config = result["recommended_config"]

    assert "cpu_per_agent" in config
    assert "memory_per_agent" in config
    assert "replicas" in config
    assert "batch_size" in config
    assert "concurrency" in config


def test_optimize_convergence(optimizer: DeploymentOptimizer, constraints: dict):
    """GA should run for the expected number of generations."""
    result = optimizer.optimize(constraints)

    assert result["generations"] == optimizer.GENERATIONS


def test_optimize_alternatives(optimizer: DeploymentOptimizer, constraints: dict):
    """Should return up to 3 alternative configurations."""
    result = optimizer.optimize(constraints)

    assert isinstance(result["alternatives"], list)
    assert len(result["alternatives"]) <= 3
    for alt in result["alternatives"]:
        assert "fitness_score" in alt
        assert "cpu_per_agent" in alt


def test_optimize_fitness_positive(optimizer: DeploymentOptimizer, constraints: dict):
    """Best fitness score should be positive for reasonable constraints."""
    result = optimizer.optimize(constraints)

    assert result["fitness_score"] > 0


def test_optimize_respects_constraints(optimizer: DeploymentOptimizer, constraints: dict):
    """Recommended config total resources should not exceed constraints."""
    result = optimizer.optimize(constraints)
    config = result["recommended_config"]

    total_cpu = config["cpu_per_agent"] * config["replicas"]
    total_memory = config["memory_per_agent"] * config["replicas"]

    assert total_cpu <= constraints["max_cpu"]
    assert total_memory <= constraints["max_memory"]


def test_optimize_with_minimal_constraints(optimizer: DeploymentOptimizer):
    """Should handle minimal / tight constraints without error."""
    result = optimizer.optimize({
        "max_cpu": 1,
        "max_memory": 512,
        "target_latency": 500,
        "agent_count": 1,
    })

    assert "recommended_config" in result
    assert result["generations"] == optimizer.GENERATIONS


def test_optimize_with_defaults(optimizer: DeploymentOptimizer):
    """Should use default constraints when keys are missing."""
    result = optimizer.optimize({})

    assert "recommended_config" in result
    assert result["fitness_score"] is not None
