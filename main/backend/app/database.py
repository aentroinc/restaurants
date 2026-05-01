from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import create_engine, event
from app.config import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

engine_kwargs = {"echo": False}
if not is_sqlite:
    engine_kwargs.update({"pool_size": 20, "max_overflow": 10})

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

sync_engine = create_engine(settings.DATABASE_URL_SYNC, echo=False)
SyncSession = sessionmaker(sync_engine)

if is_sqlite:
    @event.listens_for(sync_engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session
