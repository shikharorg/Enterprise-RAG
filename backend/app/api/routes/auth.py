from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.models import User
from app.db.postgres import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.auth_service import (
    authenticate_user,
    create_tokens,
    register_user,
    revoke_refresh_token,
    rotate_refresh_token,
)
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
_s = get_settings()

_COOKIE_OPTS = {
    "httponly": True,
    "samesite": "lax",
    "secure": _s.app_env == "production",
}


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await register_user(db, body.email, body.password, body.role)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return UserResponse(id=str(user.id), email=user.email, role=user.role)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    try:
        user = await authenticate_user(db, body.email, body.password)
        access, refresh = await create_tokens(db, user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    response.set_cookie("access_token", access, max_age=_s.jwt_access_token_expire_minutes * 60, **_COOKIE_OPTS)
    response.set_cookie("refresh_token", refresh, max_age=_s.jwt_refresh_token_expire_days * 86400, **_COOKIE_OPTS)
    return TokenResponse(access_token=access)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    try:
        access, new_refresh, _ = await rotate_refresh_token(db, refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    response.set_cookie("access_token", access, max_age=_s.jwt_access_token_expire_minutes * 60, **_COOKIE_OPTS)
    response.set_cookie("refresh_token", new_refresh, max_age=_s.jwt_refresh_token_expire_days * 86400, **_COOKIE_OPTS)
    return TokenResponse(access_token=access)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if refresh_token:
        await revoke_refresh_token(db, refresh_token)
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse(id=str(current_user.id), email=current_user.email, role=current_user.role)
