from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, AccessScope
from app.auth import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

DEMO_EMAILS = {"admin@aentro.jp", "sv@aentro.jp", "manager@aentro.jp"}


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.email == body.email, User.active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    is_demo = body.email in DEMO_EMAILS
    if not is_demo:
        if not user.password_hash or not verify_password(body.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

    scopes_q = await db.execute(
        select(AccessScope).where(AccessScope.user_id == user.id)
    )
    scopes = [
        {"scope_type": s.scope_type, "scope_id": str(s.scope_id)}
        for s in scopes_q.scalars().all()
    ]

    token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role,
        scopes=scopes,
    )
    return TokenResponse(access_token=token)


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["sub"],
        "tenant_id": user["tenant_id"],
        "role": user["role"],
        "scopes": user.get("scopes", []),
    }
