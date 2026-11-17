"""
db.py - the ONLY place the app connects to PostgreSQL.

Routers never create connections themselves. They ask for a session with
    db: Session = Depends(get_db)
and FastAPI opens one session per request and closes it afterwards.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

# The engine manages a pool of connections to the database in DATABASE_URL (from .env).
# pool_pre_ping checks a connection is alive before using it (avoids errors after PostgreSQL restarts).
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

# A factory that creates new Session objects bound to the engine
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    """Parent class for every table model in models.py."""


def get_db():
    """FastAPI dependency: one database session per request, always closed at the end."""
    db = SessionLocal()
    try:
        yield db          # the endpoint runs here, using this session
    finally:
        db.close()        # runs even if the endpoint raised an error
