"""
database.py — Async SQLAlchemy engine, session factory, and DB initialization.

This module sets up everything we need to talk to the SQLite database:
  1. An async ENGINE  — the low-level connection pool.
  2. A SESSION FACTORY — creates short-lived sessions for each request.
  3. An init_db()      — creates all tables on first run.
  4. A get_db()        — FastAPI dependency that hands a session to route handlers.

Why async?  FastAPI is async-first.  Using an async DB driver (aiosqlite)
means our API never blocks a thread while waiting for disk I/O.
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,       # The async version of SQLAlchemy's Session
    create_async_engine, # Creates an async connection pool
    async_sessionmaker,  # Factory that produces AsyncSession instances
)
from sqlalchemy.orm import DeclarativeBase  # Base class for our models

from config import DATABASE_URL

# ---------------------------------------------------------------------------
# 1. ASYNC ENGINE
# ---------------------------------------------------------------------------
# echo=False → don't print every SQL query (set True for debugging).
# connect_args → SQLite-specific: allow the same connection across threads
#   (required because FastAPI runs handlers in an async event loop).
# ---------------------------------------------------------------------------
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

# ---------------------------------------------------------------------------
# 2. SESSION FACTORY
# ---------------------------------------------------------------------------
# expire_on_commit=False → after committing, we can still read object
#   attributes without triggering a lazy load (which would fail outside
#   an async context).
# ---------------------------------------------------------------------------
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# ---------------------------------------------------------------------------
# 3. DECLARATIVE BASE
# ---------------------------------------------------------------------------
# Every model in models.py inherits from this Base.
# When we call Base.metadata.create_all(), SQLAlchemy reads every model
# that subclasses Base and creates the corresponding SQL tables.
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models in this project."""
    pass


# ---------------------------------------------------------------------------
# 4. INIT_DB — Create all tables
# ---------------------------------------------------------------------------
async def init_db() -> None:
    """
    Create all database tables if they don't already exist.

    Called once at application startup (inside FastAPI's lifespan handler).
    Uses `run_sync` because `create_all` is a synchronous SQLAlchemy method —
    we wrap it so it plays nicely with our async engine.
    """
    # Import models here so their table definitions are registered on Base
    import models  # noqa: F401  (imported for side effect: registering tables)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ---------------------------------------------------------------------------
# 5. GET_DB — FastAPI dependency for database sessions
# ---------------------------------------------------------------------------
async def get_db():
    """
    FastAPI dependency that provides an async database session.

    Usage in a route handler:
        @app.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db)):
            ...

    The `async with` block ensures the session is properly closed
    even if the handler raises an exception.
    """
    async with async_session_factory() as session:
        yield session
