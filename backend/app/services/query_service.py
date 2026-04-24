from collections.abc import AsyncIterator
from math import exp

from langsmith import traceable

from app.auth.rbac import get_allowed_collections
from app.db.models import RoleEnum
from app.generation.generator import generate, generate_stream
import app.state as _state
from app.retrieval.hybrid import hybrid_search
from app.retrieval.reranker import rerank
from app.utils.logger import get_logger

logger = get_logger(__name__)

_RELEVANCE_THRESHOLD = 0.3


def _filter_by_relevance(chunks: list[dict]) -> list[dict]:
    def sigmoid(x: float) -> float:
        return 1 / (1 + exp(-x))

    filtered = [c for c in chunks if sigmoid(c.get("rerank_score") or 0) >= _RELEVANCE_THRESHOLD]
    if not filtered:
        logger.info("All rerank scores below threshold=%.1f, returning empty", _RELEVANCE_THRESHOLD)
    return filtered


@traceable(name="run_query", run_type="chain")
async def run_query(query: str, role: RoleEnum, top_k: int) -> dict:
    allowed_roles = get_allowed_collections(role)

    try:
        async with _state.rag_semaphore:
            logger.info("RAG query start role=%s query=%r", role, query[:60])
            fused = await hybrid_search(query, allowed_roles, top_k=top_k * 3)
            ranked = rerank(query, fused, top_k=top_k)
            ranked = _filter_by_relevance(ranked)
            result = await generate(query, ranked)
    except Exception:
        logger.exception("RAG query failed role=%s query=%r", role, query[:60])
        raise

    logger.info("RAG query complete role=%s sources=%d", role, len(result["sources"]))
    return result


@traceable(name="run_query_stream", run_type="chain")
async def run_query_stream(
    query: str, role: RoleEnum, top_k: int
) -> tuple[AsyncIterator[str], list[dict]]:
    allowed_roles = get_allowed_collections(role)

    try:
        async with _state.rag_semaphore:
            logger.info("RAG stream start role=%s query=%r", role, query[:60])
            fused = await hybrid_search(query, allowed_roles, top_k=top_k * 3)
            ranked = rerank(query, fused, top_k=top_k)
            ranked = _filter_by_relevance(ranked)
    except Exception:
        logger.exception("RAG stream retrieval failed role=%s query=%r", role, query[:60])
        raise

    sources = [
        {
            "index": i + 1,
            "source": c.get("metadata", {}).get("source", "unknown"),
            "department": c.get("metadata", {}).get("role_access", "unknown"),
            "chunk_id": c.get("id"),
            "rerank_score": c.get("rerank_score"),
        }
        for i, c in enumerate(ranked)
    ]

    return generate_stream(query, ranked), sources
