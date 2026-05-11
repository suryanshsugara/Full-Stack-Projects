"""
main.py -- FastAPI application entry point.

This is the "front door" of the backend. It:
  1. Creates the FastAPI app instance
  2. Runs database initialization on startup (via lifespan)
  3. Registers all route modules (routers/)

Route handlers live in the routers/ package — this file only
wires them together and configures middleware.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db

# Import routers — each file defines its own APIRouter
from routers.health import router as health_router
from routers.meetings import router as meetings_router
from routers.participants import router as participants_router


# ---------------------------------------------------------------------------
# LIFESPAN — Startup / Shutdown logic
# ---------------------------------------------------------------------------
# FastAPI's "lifespan" replaces the older @app.on_event("startup") pattern.
# Everything before `yield` runs on startup; everything after runs on shutdown.
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    - Startup: Initialize the database (create tables if needed).
    - Shutdown: (nothing to clean up for now).
    """
    print("[START] Starting up -- initializing database...")
    await init_db()
    print("[OK] Database ready.")
    yield  # App runs between startup and shutdown
    print("[STOP] Shutting down...")


# ---------------------------------------------------------------------------
# CREATE THE APP
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Zoom Clone API",
    description="Backend API for the Zoom Clone video conferencing app",
    version="0.2.0",  # Bumped from 0.1.0 → 0.2.0 for Phase 2
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS MIDDLEWARE
# ---------------------------------------------------------------------------
# Allow the Next.js frontend (running on port 3000) to call our API.
# In production, we read the FRONTEND_URL environment variable.
# ---------------------------------------------------------------------------
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],  # Next.js dev server or Prod URL
    allow_credentials=True,
    allow_methods=["*"],   # Allow all HTTP methods (GET, POST, PUT, DELETE)
    allow_headers=["*"],   # Allow all headers
)

# ---------------------------------------------------------------------------
# REGISTER ROUTERS
# ---------------------------------------------------------------------------
# Each router handles a group of related endpoints.
# The router's `prefix` determines the URL path.
# ---------------------------------------------------------------------------
app.include_router(health_router)          # GET /api/health
app.include_router(meetings_router)        # /api/meetings/*
app.include_router(participants_router)    # /api/meetings/{id}/participants/*
