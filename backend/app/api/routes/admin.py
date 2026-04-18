import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.models import RoleEnum, User
from app.db.postgres import get_db
from app.schemas.admin import DocumentListResponse, DocumentResponse, SetActiveRequest, UserAdminResponse
from app.services.admin_service import delete_document, list_documents, list_users, set_user_active

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (RoleEnum.hr, RoleEnum.engineering, RoleEnum.finance):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


@router.get("/documents", response_model=DocumentListResponse)
async def get_documents(
    department: RoleEnum | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    if current_user.role != RoleEnum.hr and department and department != current_user.role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view other departments")
    docs, total = await list_documents(db, department=department, offset=offset, limit=limit)
    return DocumentListResponse(
        documents=[DocumentResponse.model_validate(d) for d in docs],
        total=total,
    )


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    try:
        await delete_document(db, document_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/users", response_model=list[UserAdminResponse])
async def get_users(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    users = await list_users(db, offset=offset, limit=limit)
    return [UserAdminResponse.model_validate(u) for u in users]


@router.patch("/users/{user_id}/active", response_model=UserAdminResponse)
async def update_user_active(
    user_id: uuid.UUID,
    body: SetActiveRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    try:
        user = await set_user_active(db, user_id, body.is_active)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return UserAdminResponse.model_validate(user)
