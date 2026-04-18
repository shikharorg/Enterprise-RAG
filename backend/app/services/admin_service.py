import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Document, RoleEnum, User
from app.utils.logger import get_logger

logger = get_logger(__name__)


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
    await db.delete(doc)
    logger.info("Deleted document %s", document_id)


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
