"""
Taxonomy Classifier — Hierarchical Clustering for regulation categorisation.

Uses scikit-learn's AgglomerativeClustering on TF-IDF vectors to
automatically group regulation descriptions into thematic clusters.

When fewer than 2 regulations are provided, or TF-IDF cannot produce
useful vectors, the classifier falls back to a keyword-based taxonomy.
"""

from __future__ import annotations

import math
import re
from collections import defaultdict
from typing import Any

import numpy as np
from sklearn.cluster import AgglomerativeClustering


class TaxonomyClassifier:
    """Hierarchical clustering classifier for regulation taxonomy."""

    # Predefined keyword-based taxonomy for the fallback path
    TAXONOMY_KEYWORDS: dict[str, list[str]] = {
        "data_privacy": [
            "privacy", "data protection", "gdpr", "ccpa", "personal data",
            "consent", "data breach", "pii", "right to erasure", "cookies",
        ],
        "financial": [
            "financial", "banking", "payment", "aml", "anti-money",
            "sox", "sarbanes", "dodd-frank", "sec", "finra", "kyc",
        ],
        "healthcare": [
            "health", "hipaa", "medical", "patient", "clinical",
            "pharmaceutical", "fda", "drug", "diagnosis", "treatment",
        ],
        "environmental": [
            "environment", "emission", "carbon", "pollution", "waste",
            "epa", "climate", "sustainability", "renewable", "hazardous",
        ],
        "cybersecurity": [
            "cyber", "security", "encryption", "vulnerability", "firewall",
            "incident response", "penetration", "malware", "nist", "iso 27001",
        ],
    }

    def __init__(self) -> None:
        self.version: str = "1.0.0"
        self.is_loaded: bool = True  # no training required

    # ------------------------------------------------------------------
    # Classification
    # ------------------------------------------------------------------

    def classify(self, regulations: list[dict]) -> dict:
        """Classify regulations into thematic clusters.

        Parameters
        ----------
        regulations : list[dict]
            Each dict must contain:
            - ``id`` (str)
            - ``title`` (str)
            - ``description`` (str)
            Optional:
            - ``category`` (str) — existing label (used in fallback)

        Returns
        -------
        dict
            ``{ clusters, total_clusters, method }``
        """
        if len(regulations) < 2:
            return self._classify_fallback(regulations)

        # Build text corpus from title + description
        corpus = [
            f"{r.get('title', '')} {r.get('description', '')}"
            for r in regulations
        ]

        # TF-IDF vectorization (hand-rolled to avoid extra dependencies)
        try:
            tfidf_matrix = self._tfidf(corpus)
        except Exception:
            return self._classify_fallback(regulations)

        if tfidf_matrix.shape[1] == 0:
            return self._classify_fallback(regulations)

        # Determine number of clusters (heuristic: sqrt(n), min 2, max 10)
        n_clusters = max(2, min(10, int(math.sqrt(len(regulations)))))

        model = AgglomerativeClustering(
            n_clusters=n_clusters,
            metric="euclidean",
            linkage="ward",
        )
        labels = model.fit_predict(tfidf_matrix)

        # Group regulations by cluster label
        cluster_map: dict[int, list[dict]] = defaultdict(list)
        for i, label in enumerate(labels):
            cluster_map[int(label)].append(regulations[i])

        clusters: list[dict] = []
        for cluster_id in sorted(cluster_map.keys()):
            members = cluster_map[cluster_id]
            # Compute intra-cluster similarity (average pairwise cosine)
            indices = [i for i, l in enumerate(labels) if l == cluster_id]
            similarity = self._avg_cosine_similarity(tfidf_matrix, indices)

            clusters.append(
                {
                    "id": cluster_id,
                    "label": self._infer_cluster_label(members),
                    "regulations": [
                        {"id": r.get("id", ""), "title": r.get("title", "")}
                        for r in members
                    ],
                    "similarity_score": round(similarity, 4),
                }
            )

        return {
            "clusters": clusters,
            "total_clusters": len(clusters),
            "method": "hierarchical_clustering",
        }

    # ------------------------------------------------------------------
    # Keyword-based fallback
    # ------------------------------------------------------------------

    def _classify_fallback(self, regulations: list[dict]) -> dict:
        """Keyword-based categorisation using the predefined taxonomy."""
        clusters_map: dict[str, list[dict]] = defaultdict(list)

        for reg in regulations:
            text = (
                f"{reg.get('title', '')} {reg.get('description', '')}"
            ).lower()

            # Check provided category first
            category = reg.get("category", "")
            if category and category in self.TAXONOMY_KEYWORDS:
                clusters_map[category].append(reg)
                continue

            # Keyword matching
            matched = False
            for cat, keywords in self.TAXONOMY_KEYWORDS.items():
                if any(kw in text for kw in keywords):
                    clusters_map[cat].append(reg)
                    matched = True
                    break

            if not matched:
                clusters_map["general"].append(reg)

        clusters: list[dict] = []
        for idx, (cat, members) in enumerate(sorted(clusters_map.items())):
            clusters.append(
                {
                    "id": idx,
                    "label": cat,
                    "regulations": [
                        {"id": r.get("id", ""), "title": r.get("title", "")}
                        for r in members
                    ],
                    "similarity_score": 1.0,  # exact keyword match
                }
            )

        return {
            "clusters": clusters,
            "total_clusters": len(clusters),
            "method": "keyword_fallback",
        }

    # ------------------------------------------------------------------
    # Lightweight TF-IDF implementation
    # ------------------------------------------------------------------

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        """Simple whitespace + punctuation tokenizer."""
        return re.findall(r"[a-z0-9]+", text.lower())

    def _tfidf(self, corpus: list[str]) -> np.ndarray:
        """Compute a TF-IDF matrix for *corpus*.

        Returns an ``(N, V)`` numpy array where V is the vocabulary size.
        """
        tokenized = [self._tokenize(doc) for doc in corpus]
        # Build vocabulary
        vocab: dict[str, int] = {}
        for tokens in tokenized:
            for tok in tokens:
                if tok not in vocab:
                    vocab[tok] = len(vocab)

        n_docs = len(corpus)
        n_vocab = len(vocab)

        if n_vocab == 0:
            return np.empty((n_docs, 0))

        # Term frequency (normalised)
        tf = np.zeros((n_docs, n_vocab))
        for i, tokens in enumerate(tokenized):
            if not tokens:
                continue
            for tok in tokens:
                tf[i, vocab[tok]] += 1
            tf[i] /= len(tokens)

        # Document frequency
        df = np.zeros(n_vocab)
        for i, tokens in enumerate(tokenized):
            seen: set[str] = set()
            for tok in tokens:
                if tok not in seen:
                    df[vocab[tok]] += 1
                    seen.add(tok)

        # IDF with smoothing
        idf = np.log((n_docs + 1) / (df + 1)) + 1

        return tf * idf

    # ------------------------------------------------------------------
    # Similarity helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _avg_cosine_similarity(matrix: np.ndarray, indices: list[int]) -> float:
        """Average pairwise cosine similarity among rows in *indices*."""
        if len(indices) < 2:
            return 1.0

        sub = matrix[indices]
        norms = np.linalg.norm(sub, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        normalised = sub / norms

        sim_matrix = normalised @ normalised.T
        n = len(indices)
        # Average of upper triangle (excluding diagonal)
        total = 0.0
        count = 0
        for i in range(n):
            for j in range(i + 1, n):
                total += sim_matrix[i, j]
                count += 1

        return total / count if count > 0 else 1.0

    @staticmethod
    def _infer_cluster_label(members: list[dict]) -> str:
        """Infer a human-readable label for a cluster from member titles."""
        # Use the most common provided category, or synthesize from titles
        categories = [m.get("category", "") for m in members if m.get("category")]
        if categories:
            from collections import Counter
            most_common = Counter(categories).most_common(1)[0][0]
            return most_common

        # Fall back to first member's title (truncated)
        if members:
            title = members[0].get("title", "Unknown")
            return title[:50]
        return "Unknown"
