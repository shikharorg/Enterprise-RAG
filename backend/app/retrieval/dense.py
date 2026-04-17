from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchAny

from app.config import get_settings
from app.retrieval.embedder import embed
from app.utils.logger import get_logger

logger = get_logger(__name__)
_s = get_settings()

_client: AsyncQdrantClient | None = None


def load_dense_client() -> None:
    global _client
    _client = AsyncQdrantClient(host=_s.qdrant_host, port=_s.qdrant_port)


def get_client() -> AsyncQdrantClient:
    if _client is None:
        raise RuntimeError("Qdrant client not loaded. Call load_dense_client() at startup.")
    return _client


async def dense_search(
    query: str,
    allowed_roles: list[str],
    top_k: int = 20,
) -> list[dict]:
    vector = embed([query])[0]

    role_filter = Filter(
        must=[
            FieldCondition(
                key="role_access",
                match=MatchAny(any=allowed_roles),
            )
        ]
    )

    results = await get_client().search(
        collection_name=_s.qdrant_collection,
        query_vector=vector,
        query_filter=role_filter,
        limit=top_k,
        with_payload=True,
    )

    hits = []
    for r in results:
        hits.append({
            "id": str(r.id),
            "score": r.score,
            "text": r.payload.get("text", ""),
            "metadata": {k: v for k, v in r.payload.items() if k != "text"},
        })

    logger.info("Dense search returned %d hits", len(hits))
    return hits
