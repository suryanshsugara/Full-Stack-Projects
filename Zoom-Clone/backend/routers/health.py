"""
routers/health.py -- Health check endpoint.

This is the simplest router — just one GET endpoint that returns
a status message. It's useful for:
  - Verifying the API is running after deployment
  - Load balancer health probes
  - Quick smoke tests during development
"""

from fastapi import APIRouter

# ---------------------------------------------------------------------------
# Create the router with a prefix and tag
# ---------------------------------------------------------------------------
# prefix="/api" → all routes in this file start with /api
# tags=["System"] → groups these endpoints in the auto-generated docs (/docs)
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/api", tags=["System"])


@router.get("/health")
async def health_check():
    """
    Returns a simple status message.
    Use this to verify the backend is running and reachable.

    Response example:
        { "status": "ok", "message": "Zoom Clone API is running" }
    """
    return {"status": "ok", "message": "Zoom Clone API is running"}
