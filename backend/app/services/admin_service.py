import asyncio
import uuid
from datetime import datetime, timezone

from qdrant_client.models import FieldCondition, Filter, MatchValue
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import Document, EvalResult, RoleEnum, User
from app.retrieval.dense import get_client as get_qdrant_client
from app.state import rag_slots_in_use
from app.utils.logger import get_logger

_s = get_settings()

logger = get_logger(__name__)

_eval_lock = asyncio.Lock()
EVAL_MAX_RAG_SLOTS_IN_USE = 2


class ServerUnderLoadError(Exception):
    pass


async def list_documents(
    db: AsyncSession,
    department: RoleEnum | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Document], int]:
    q = select(Document)
    count_q = select(func.count()).select_from(Document)
    if department:
        q = q.where(Document.department == department)
        count_q = count_q.where(Document.department == department)
    q = q.order_by(Document.uploaded_at.desc()).offset(offset).limit(limit)
    docs = list((await db.scalars(q)).all())
    total = await db.scalar(count_q)
    logger.info("Listed %d documents (total=%d)", len(docs), total)
    return docs, total


async def delete_document(db: AsyncSession, document_id: uuid.UUID) -> None:
    doc = await db.get(Document, document_id)
    if not doc:
        raise ValueError(f"Document not found: {document_id}")

    doc_id_str = str(document_id)

    logger.info("Deleting Qdrant chunks for doc_id=%s collection=%s", doc_id_str, _s.qdrant_collection)
    result = await get_qdrant_client().delete(
        collection_name=_s.qdrant_collection,
        points_selector=Filter(
            must=[FieldCondition(key="doc_id", match=MatchValue(value=doc_id_str))]
        ),
    )
    logger.info("Qdrant delete result for doc_id=%s: %s", doc_id_str, result)

    from app.ingestion.pipeline import rebuild_bm25_index
    logger.info("Rebuilding BM25 index after deletion of doc_id=%s", doc_id_str)
    await asyncio.to_thread(rebuild_bm25_index, None)
    logger.info("BM25 index rebuilt after deletion of doc_id=%s", doc_id_str)

    await db.delete(doc)
    logger.info("Deleted Postgres document row for doc_id=%s", doc_id_str)


async def list_users(
    db: AsyncSession,
    offset: int = 0,
    limit: int = 50,
) -> list[User]:
    q = select(User).order_by(User.created_at.desc()).offset(offset).limit(limit)
    users = list((await db.scalars(q)).all())
    logger.info("Listed %d users", len(users))
    return users


async def set_user_active(db: AsyncSession, user_id: uuid.UUID, is_active: bool) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise ValueError(f"User not found: {user_id}")
    user.is_active = is_active
    logger.info("Set user %s is_active=%s", user_id, is_active)
    return user


async def get_eval_results(
    db: AsyncSession,
    metric_name: str | None = None,
    limit: int = 100,
) -> list[EvalResult]:
    q = select(EvalResult)
    if metric_name:
        q = q.where(EvalResult.metric_name == metric_name)
    q = q.order_by(EvalResult.run_at.desc(), EvalResult.metric_name.asc()).limit(limit)
    rows = list((await db.scalars(q)).all())
    logger.info("Listed %d eval results", len(rows))
    return rows


async def trigger_eval_run() -> dict:
    in_use = rag_slots_in_use()
    if in_use > EVAL_MAX_RAG_SLOTS_IN_USE:
        logger.warning("Eval run rejected: %d RAG slots in use", in_use)
        raise ServerUnderLoadError("server under load, try again later")

    if _eval_lock.locked():
        raise RuntimeError("An evaluation run is already in progress")

    started_at = datetime.now(timezone.utc)

    async def _runner() -> None:
        async with _eval_lock:
            from eval.run_eval import run_evaluation
            try:
                await run_evaluation()
            except Exception as exc:
                logger.exception("Background eval run failed: %s", exc)

    asyncio.create_task(_runner())
    logger.info("Eval run triggered at %s", started_at.isoformat())
    return {"status": "started", "started_at": started_at}
