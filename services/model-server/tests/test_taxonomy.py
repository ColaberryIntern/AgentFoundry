"""
Tests for the TaxonomyClassifier model.

Validates:
- Classification with multiple regulations (clustering path)
- Fallback keyword-based categorisation
- Cluster quality (similarity scores)
- Single regulation fallback
- Correct structure of returned clusters
"""

import pytest

from app.models.taxonomy_classifier import TaxonomyClassifier


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------


@pytest.fixture
def classifier() -> TaxonomyClassifier:
    return TaxonomyClassifier()


@pytest.fixture
def mixed_regulations() -> list[dict]:
    """Regulations spanning multiple categories."""
    return [
        {
            "id": "reg-1",
            "title": "GDPR Data Protection Regulation",
            "description": "Rules governing personal data protection and privacy in the EU.",
        },
        {
            "id": "reg-2",
            "title": "CCPA Privacy Act",
            "description": "California consumer privacy act for data protection rights.",
        },
        {
            "id": "reg-3",
            "title": "SOX Financial Reporting",
            "description": "Sarbanes-Oxley act for financial reporting and auditing.",
        },
        {
            "id": "reg-4",
            "title": "HIPAA Health Information",
            "description": "Health insurance portability and accountability for patient data.",
        },
        {
            "id": "reg-5",
            "title": "EPA Emissions Standards",
            "description": "Environmental protection agency rules on carbon emissions and pollution.",
        },
        {
            "id": "reg-6",
            "title": "NIST Cybersecurity Framework",
            "description": "National institute of standards for cybersecurity and vulnerability management.",
        },
        {
            "id": "reg-7",
            "title": "PCI DSS Payment Security",
            "description": "Payment card industry data security standard for financial transactions.",
        },
        {
            "id": "reg-8",
            "title": "FISMA Federal Security",
            "description": "Federal information security management act for cyber protection.",
        },
    ]


@pytest.fixture
def keyword_regulations() -> list[dict]:
    """Regulations with explicit categories for fallback testing."""
    return [
        {
            "id": "reg-a",
            "title": "Privacy Regulation A",
            "description": "A regulation about data privacy.",
            "category": "data_privacy",
        },
        {
            "id": "reg-b",
            "title": "Banking Regulation B",
            "description": "A regulation about financial compliance.",
            "category": "financial",
        },
    ]


# ------------------------------------------------------------------
# Clustering path (>= 2 regulations)
# ------------------------------------------------------------------


def test_classify_returns_required_keys(
    classifier: TaxonomyClassifier,
    mixed_regulations: list[dict],
):
    result = classifier.classify(mixed_regulations)

    assert "clusters" in result
    assert "total_clusters" in result
    assert "method" in result


def test_classify_uses_clustering(
    classifier: TaxonomyClassifier,
    mixed_regulations: list[dict],
):
    result = classifier.classify(mixed_regulations)

    assert result["method"] == "hierarchical_clustering"
    assert result["total_clusters"] >= 2


def test_cluster_structure(
    classifier: TaxonomyClassifier,
    mixed_regulations: list[dict],
):
    result = classifier.classify(mixed_regulations)

    for cluster in result["clusters"]:
        assert "id" in cluster
        assert "label" in cluster
        assert "regulations" in cluster
        assert "similarity_score" in cluster
        assert isinstance(cluster["regulations"], list)
        assert len(cluster["regulations"]) > 0
        for reg in cluster["regulations"]:
            assert "id" in reg
            assert "title" in reg


def test_all_regulations_assigned(
    classifier: TaxonomyClassifier,
    mixed_regulations: list[dict],
):
    """Every input regulation must appear in exactly one cluster."""
    result = classifier.classify(mixed_regulations)

    all_ids = set()
    for cluster in result["clusters"]:
        for reg in cluster["regulations"]:
            all_ids.add(reg["id"])

    input_ids = {r["id"] for r in mixed_regulations}
    assert all_ids == input_ids


def test_similarity_scores_valid(
    classifier: TaxonomyClassifier,
    mixed_regulations: list[dict],
):
    result = classifier.classify(mixed_regulations)

    for cluster in result["clusters"]:
        assert 0.0 <= cluster["similarity_score"] <= 1.0


# ------------------------------------------------------------------
# Fallback — keyword-based
# ------------------------------------------------------------------


def test_classify_fallback_single_regulation(classifier: TaxonomyClassifier):
    """Single regulation should use keyword fallback."""
    result = classifier.classify([
        {
            "id": "reg-solo",
            "title": "GDPR Privacy",
            "description": "Data protection regulation.",
        }
    ])

    assert result["method"] == "keyword_fallback"
    assert result["total_clusters"] >= 1


def test_classify_fallback_with_categories(
    classifier: TaxonomyClassifier,
    keyword_regulations: list[dict],
):
    """When regulations have explicit categories, fallback should use them."""
    # Force fallback by providing only 1 regulation
    result = classifier._classify_fallback(keyword_regulations)

    assert result["method"] == "keyword_fallback"
    labels = [c["label"] for c in result["clusters"]]
    assert "data_privacy" in labels
    assert "financial" in labels


def test_classify_fallback_unknown_category(classifier: TaxonomyClassifier):
    """Regulations with no matching keywords go to 'general'."""
    result = classifier._classify_fallback([
        {
            "id": "reg-x",
            "title": "Abstract Regulation",
            "description": "An obscure rule with no matching keywords.",
        }
    ])

    labels = [c["label"] for c in result["clusters"]]
    assert "general" in labels


# ------------------------------------------------------------------
# Edge cases
# ------------------------------------------------------------------


def test_classify_empty_list(classifier: TaxonomyClassifier):
    """Empty list should return keyword_fallback with no clusters."""
    result = classifier.classify([])

    assert result["method"] == "keyword_fallback"
    assert result["total_clusters"] == 0
    assert result["clusters"] == []
