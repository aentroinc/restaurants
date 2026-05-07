from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings


SESSION_COOKIE_NAME = "aentro_session"

SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    try:
        return pwd_context.hash(password[:72])
    except Exception:
        import hashlib
        return "sha256:" + hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain: str, hashed: str) -> bool:
    if hashed.startswith("sha256:"):
        import hashlib
        return hashed == "sha256:" + hashlib.sha256(plain.encode()).hexdigest()
    try:
        return pwd_context.verify(plain[:72], hashed)
    except Exception:
        return False


def create_access_token(
    user_id: str,
    tenant_id: str,
    role: str,
    scopes: list[dict],
    current_store_id: Optional[str] = None,
    purpose_token: Optional[str] = None,
) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "scopes": scopes,
        "exp": expire,
    }
    if current_store_id:
        payload["current_store_id"] = current_store_id
    if purpose_token:
        payload["purpose_token"] = purpose_token
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def _extract_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[str]:
    """Bearer header takes precedence; otherwise fall back to httpOnly cookie."""
    if credentials is not None:
        return credentials.credentials
    cookie_token = request.cookies.get(SESSION_COOKIE_NAME)
    return cookie_token or None


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = _extract_token(request, credentials)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return decode_token(token)


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    token = _extract_token(request, credentials)
    if not token:
        return None
    try:
        return decode_token(token)
    except HTTPException:
        return None


async def get_tenant_id(
    user: Optional[dict] = Depends(get_current_user_optional),
) -> str:
    if user and user.get("tenant_id"):
        return user["tenant_id"]
    return DEMO_TENANT_ID


def require_role(*allowed_roles):
    async def check(user: Optional[dict] = Depends(get_current_user_optional)):
        if user and user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return check
