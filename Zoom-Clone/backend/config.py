"""
config.py — Central configuration for the Zoom Clone backend.

This file holds all app-wide constants: database connection string,
the hardcoded demo user, and any future feature flags.
Keeping config in one place makes it easy to change settings
without hunting through multiple files.
"""

import os

# ---------------------------------------------------------------------------
# Database Configuration
# ---------------------------------------------------------------------------
# We use SQLite for simplicity. The database file lives right next to
# the backend code. "aiosqlite" is the async driver that lets us use
# SQLAlchemy's async engine with SQLite.
# The "sqlite+aiosqlite:///" prefix tells SQLAlchemy:
#   1. Use the SQLite dialect
#   2. Use the aiosqlite async driver
# ---------------------------------------------------------------------------
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./zoom_clone.db"  # default: local file
)

# ---------------------------------------------------------------------------
# NO AUTH – DEMO MODE
# ---------------------------------------------------------------------------
# Instead of building a full login/signup system, we hardcode a single
# default user. This dict mirrors the User model's fields so we can
# seed the database and reference this user throughout the app.
# In a real product, this would come from a JWT token or session.
# ---------------------------------------------------------------------------
DEFAULT_USER: dict = {
    "id": 1,
    "name": "Alex Johnson",
    "email": "alex@demo.com",
}
