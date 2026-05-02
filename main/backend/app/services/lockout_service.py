from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.auth_enterprise import LoginAttempt, AccountLock
from app.models.user import User


MFA_REQUIRED_ROLES = {"admin", "executive", "brand_manager"}
MAX_ATTEMPTS = 5
LOCKOUT_WINDOW_MINUTES = 10
LOCKOUT_DURATION_MINUTES = 30


async def check_lockout(db: AsyncSession, email: str) -> bool:
    user_q = await db.execute(select(User).where(User.email == email))
    user = user_q.scalar_one_or_none()
    if user:
        lock_q = await db.execute(
            select(AccountLock).where(AccountLock.user_id == user.id)
        )
        lock = lock_q.scalar_one_or_none()
        if lock and lock.locked_until > datetime.now(timezone.utc):
            return True
        if lock and lock.locked_until <= datetime.now(timezone.utc):
            await db.delete(lock)
            await db.commit()

    window_start = datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_WINDOW_MINUTES)
    failures = await db.execute(
        select(func.count(LoginAttempt.id)).where(
            and_(
                LoginAttempt.email == email,
                LoginAttempt.success == False,
                LoginAttempt.attempted_at > window_start,
            )
        )
    )
    if failures.scalar() >= MAX_ATTEMPTS:
        if user:
            lock = AccountLock(
                user_id=user.id,
                locked_until=datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MINUTES),
                reason="too_many_attempts",
            )
            await db.merge(lock)
            await db.commit()
        return True
    return False


async def record_attempt(db: AsyncSession, email: str, success: bool, tenant_id=None, ip=None, reason=None):
    db.add(LoginAttempt(
        email=email,
        tenant_id=tenant_id,
        success=success,
        ip_address=ip,
        failure_reason=reason,
    ))
    await db.commit()
