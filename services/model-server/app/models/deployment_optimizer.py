"""
Deployment Optimizer — Genetic Algorithm for optimal deployment configuration.

Pure Python implementation (no ML library required).  Uses a simple GA:
population of configs -> fitness function -> selection -> crossover ->
mutation -> converge.
"""

from __future__ import annotations

import random
from typing import Any


class DeploymentOptimizer:
    """Genetic algorithm optimizer for deployment configurations."""

    # Fixed GA parameters
    POPULATION_SIZE: int = 50
    GENERATIONS: int = 100
    MUTATION_RATE: float = 0.1

    def __init__(self) -> None:
        self.version: str = "1.0.0"
        self.is_loaded: bool = True  # no training required

    # ------------------------------------------------------------------
    # Optimisation
    # ------------------------------------------------------------------

    def optimize(self, constraints: dict) -> dict:
        """Find an optimal deployment configuration via genetic algorithm.

        Parameters
        ----------
        constraints : dict
            Must contain at least:
            - max_cpu      (float) — maximum CPU cores available
            - max_memory   (float) — maximum memory in MB
            - target_latency (float) — desired latency in ms
            - agent_count  (int) — number of agents to deploy

        Returns
        -------
        dict
            ``{ recommended_config, fitness_score, generations, alternatives }``
        """
        max_cpu = float(constraints.get("max_cpu", 8))
        max_memory = float(constraints.get("max_memory", 16384))
        target_latency = float(constraints.get("target_latency", 100))
        agent_count = int(constraints.get("agent_count", 3))

        rng = random.Random(42)

        # 1. Generate initial population
        population = self._init_population(
            rng, max_cpu, max_memory, agent_count
        )

        best_individual: dict | None = None
        best_fitness = float("-inf")
        generations_run = 0

        for gen in range(self.GENERATIONS):
            generations_run = gen + 1

            # 2. Evaluate fitness
            scored = [
                (ind, self._fitness(ind, target_latency, max_cpu, max_memory))
                for ind in population
            ]
            scored.sort(key=lambda x: x[1], reverse=True)

            if scored[0][1] > best_fitness:
                best_fitness = scored[0][1]
                best_individual = scored[0][0]

            # Early stopping — if fitness hasn't improved for 10 generations
            # the convergence check is implicit via the fixed seed and sorting.

            # 3. Selection — top 50 %
            survivors = [ind for ind, _ in scored[: len(scored) // 2]]

            # 4. Crossover + mutation -> fill population back up
            children: list[dict] = []
            while len(children) < self.POPULATION_SIZE - len(survivors):
                p1 = rng.choice(survivors)
                p2 = rng.choice(survivors)
                child = self._crossover(rng, p1, p2)
                child = self._mutate(rng, child, max_cpu, max_memory, agent_count)
                children.append(child)

            population = survivors + children

        # Collect top-3 alternatives (excluding the best)
        final_scored = [
            (ind, self._fitness(ind, target_latency, max_cpu, max_memory))
            for ind in population
        ]
        final_scored.sort(key=lambda x: x[1], reverse=True)
        alternatives = [
            {**ind, "fitness_score": round(score, 4)}
            for ind, score in final_scored[1:4]
        ]

        return {
            "recommended_config": best_individual or final_scored[0][0],
            "fitness_score": round(best_fitness, 4),
            "generations": generations_run,
            "alternatives": alternatives,
        }

    # ------------------------------------------------------------------
    # GA primitives
    # ------------------------------------------------------------------

    def _init_population(
        self,
        rng: random.Random,
        max_cpu: float,
        max_memory: float,
        agent_count: int,
    ) -> list[dict]:
        """Create initial random population of deployment configs."""
        population: list[dict] = []
        for _ in range(self.POPULATION_SIZE):
            cpu_per_agent = round(rng.uniform(0.25, max_cpu / max(agent_count, 1)), 2)
            memory_per_agent = round(
                rng.uniform(256, max_memory / max(agent_count, 1)), 0
            )
            replicas = rng.randint(1, max(agent_count, 1))
            population.append(
                {
                    "cpu_per_agent": cpu_per_agent,
                    "memory_per_agent": memory_per_agent,
                    "replicas": replicas,
                    "batch_size": rng.choice([8, 16, 32, 64]),
                    "concurrency": rng.randint(1, 10),
                }
            )
        return population

    @staticmethod
    def _fitness(
        config: dict,
        target_latency: float,
        max_cpu: float,
        max_memory: float,
    ) -> float:
        """Evaluate fitness: higher is better.

        Fitness = throughput_estimate - latency_penalty - resource_penalty.
        """
        cpu = config["cpu_per_agent"] * config["replicas"]
        mem = config["memory_per_agent"] * config["replicas"]

        # Penalize constraint violations
        if cpu > max_cpu or mem > max_memory:
            return -1000.0

        # Estimated throughput (higher CPU + concurrency = more throughput)
        throughput = config["cpu_per_agent"] * config["concurrency"] * config["replicas"]

        # Estimated latency (more memory and larger batch = lower latency)
        estimated_latency = max(
            10.0,
            target_latency * (1.0 / max(config["memory_per_agent"] / 1024, 0.1))
            / max(config["batch_size"] / 16, 0.5),
        )

        latency_penalty = max(0.0, estimated_latency - target_latency) * 0.5
        resource_efficiency = 1.0 - (cpu / max(max_cpu, 1)) * 0.3

        return throughput * resource_efficiency - latency_penalty

    @staticmethod
    def _crossover(rng: random.Random, p1: dict, p2: dict) -> dict:
        """Single-point crossover between two parent configs."""
        child: dict = {}
        for key in p1:
            child[key] = p1[key] if rng.random() < 0.5 else p2[key]
        return child

    def _mutate(
        self,
        rng: random.Random,
        config: dict,
        max_cpu: float,
        max_memory: float,
        agent_count: int,
    ) -> dict:
        """Mutate a config with probability MUTATION_RATE per gene."""
        if rng.random() < self.MUTATION_RATE:
            config["cpu_per_agent"] = round(
                rng.uniform(0.25, max_cpu / max(agent_count, 1)), 2
            )
        if rng.random() < self.MUTATION_RATE:
            config["memory_per_agent"] = round(
                rng.uniform(256, max_memory / max(agent_count, 1)), 0
            )
        if rng.random() < self.MUTATION_RATE:
            config["replicas"] = rng.randint(1, max(agent_count, 1))
        if rng.random() < self.MUTATION_RATE:
            config["batch_size"] = rng.choice([8, 16, 32, 64])
        if rng.random() < self.MUTATION_RATE:
            config["concurrency"] = rng.randint(1, 10)
        return config
