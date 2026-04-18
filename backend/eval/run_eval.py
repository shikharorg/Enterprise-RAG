import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import csv
import json
from datetime import datetime, timezone

from datasets import Dataset
from langchain_openai import ChatOpenAI
from ragas import evaluate
from ragas.metrics import (
    answer_relevancy,
    context_precision,
    context_recall,
    faithfulness,
)

from app.config import get_settings
from app.ingestion.metadata import load_pii_engines
from app.retrieval.embedder import load_embedder
from app.retrieval.dense import load_dense_client
from app.retrieval.sparse import load_sparse_index
from app.retrieval.reranker import load_reranker
from app.retrieval.hybrid import hybrid_search
from app.retrieval.reranker import rerank
from app.utils.logger import get_logger

logger = get_logger(__name__)
_s = get_settings()

DATASET_PATH = Path(__file__).parent / "datasets" / "test_dataset.json"
RESULTS_DIR = Path(__file__).parent / "results"

METRICS = [faithfulness, answer_relevancy, context_recall, context_precision]


def load_dataset() -> list[dict]:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Test dataset not found: {DATASET_PATH}")
    with open(DATASET_PATH) as f:
        data = json.load(f)
    logger.info("Loaded %d test cases from %s", len(data), DATASET_PATH)
    return data


async def build_ragas_row(item: dict) -> dict:
    role = item["role"]
    query = item["question"]
    ground_truth = item["ground_truth"]

    fused = await hybrid_search(query, allowed_roles=[role], top_k=15)
    ranked = rerank(query, fused, top_k=5)

    contexts = [c["text"] for c in ranked]

    from app.generation.generator import generate
    result = await generate(query, ranked)

    return {
        "question": query,
        "answer": result["answer"],
        "contexts": contexts,
        "ground_truth": ground_truth,
    }


async def collect_rows(test_cases: list[dict]) -> list[dict]:
    rows = []
    for i, item in enumerate(test_cases):
        try:
            row = await build_ragas_row(item)
            rows.append(row)
            logger.info("Processed test case %d/%d", i + 1, len(test_cases))
        except Exception as exc:
            logger.error("Failed test case %d (%s): %s", i + 1, item.get("question", "")[:60], exc)
    return rows


def save_results(scores: dict, timestamp: str) -> Path:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RESULTS_DIR / f"eval_{timestamp}.csv"

    with open(out_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["metric", "score"])
        for metric, score in scores.items():
            writer.writerow([metric, f"{score:.4f}"])

    logger.info("Results saved to %s", out_path)
    return out_path


async def main() -> None:
    logger.info("Loading models...")
    load_embedder()
    load_reranker()
    load_dense_client()
    load_sparse_index()
    load_pii_engines()

    from app.generation.generator import load_generator
    load_generator()

    test_cases = load_dataset()
    rows = await collect_rows(test_cases)

    if not rows:
        logger.error("No rows collected, aborting evaluation.")
        sys.exit(1)

    dataset = Dataset.from_list(rows)

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=_s.openai_api_key,
        timeout=_s.openai_timeout_seconds,
    )

    logger.info("Running RAGAS evaluation on %d samples...", len(rows))
    result = evaluate(dataset=dataset, metrics=METRICS, llm=llm)

    scores = {
        "faithfulness": result["faithfulness"],
        "answer_relevancy": result["answer_relevancy"],
        "context_recall": result["context_recall"],
        "context_precision": result["context_precision"],
    }

    for metric, score in scores.items():
        logger.info("  %-25s %.4f", metric, score)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_path = save_results(scores, timestamp)
    logger.info("Evaluation complete. Results at %s", out_path)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
