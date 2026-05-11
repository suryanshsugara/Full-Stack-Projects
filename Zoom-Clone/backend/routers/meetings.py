"""
routers/meetings.py -- API endpoints for meeting CRUD operations.

This router handles 5 endpoints:
  1. POST   /api/meetings          → Create a new meeting
  2. GET    /api/meetings          → List all meetings (with filters)
  3. GET    /api/meetings/{id}     → Get a single meeting by ID
  4. PATCH  /api/meetings/{id}     → Update a meeting (partial update)
  5. DELETE /api/meetings/{id}     → Delete a meeting

DESIGN RULE: Route handlers stay THIN.
  - Parse the request (FastAPI does this via type hints)
  - Call a service function (the service does the real work)
  - Return the response

No raw SQL or complex logic belongs in this file.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas import MeetingCreate, MeetingUpdate, MeetingResponse, MeetingListResponse
from services import meeting_service

# ---------------------------------------------------------------------------
# Create the router
# ---------------------------------------------------------------------------
# prefix="/api/meetings" → all routes start with /api/meetings
# tags=["Meetings"]      → groups endpoints under "Meetings" in /docs
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/api/meetings", tags=["Meetings"])


# ---------------------------------------------------------------------------
# 1. CREATE A MEETING  —  POST /api/meetings
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=MeetingResponse,
    status_code=201,  # 201 = "Created" (not the default 200)
    summary="Create a new meeting",
)
async def create_meeting(
    body: MeetingCreate,                      # Parsed + validated from JSON body
    db: AsyncSession = Depends(get_db),       # Injected DB session
):
    """
    Create a new meeting with a unique join code.

    The currently logged-in user (hardcoded demo user) becomes the host
    and is automatically added as a participant.

    Request body:
        - title (required): Name of the meeting
        - scheduled_at (optional): ISO datetime for scheduled meetings
    """
    meeting = await meeting_service.create_meeting(
        db=db,
        title=body.title,
        description=body.description,
        duration_minutes=body.duration_minutes,
        scheduled_at=body.scheduled_at,
    )
    return meeting


# ---------------------------------------------------------------------------
# 2. LIST MEETINGS  —  GET /api/meetings
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=MeetingListResponse,
    summary="List all meetings",
)
async def list_meetings(
    # Query parameters (appear in URL like ?status=scheduled&skip=0&limit=10)
    status: Optional[str] = Query(
        default=None,
        pattern="^(scheduled|in_progress|completed)$",
        description="Filter by meeting status",
    ),
    skip: int = Query(default=0, ge=0, description="Records to skip (pagination)"),
    limit: int = Query(default=20, ge=1, le=100, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
):
    """
    List meetings with optional filters and pagination.

    Examples:
        GET /api/meetings                      → all meetings (newest first)
        GET /api/meetings?status=scheduled     → only scheduled meetings
        GET /api/meetings?skip=10&limit=5      → page 3 (5 per page)
    """
    meetings, total = await meeting_service.get_meetings(
        db=db,
        status=status,
        skip=skip,
        limit=limit,
    )
    return MeetingListResponse(meetings=meetings, total=total)


# ---------------------------------------------------------------------------
# 3. GET SINGLE MEETING  —  GET /api/meetings/{meeting_id}
# ---------------------------------------------------------------------------
@router.get(
    "/{meeting_id}",
    response_model=MeetingResponse,
    summary="Get a meeting by ID",
)
async def get_meeting(
    meeting_id: int,                          # Parsed from the URL path
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch a single meeting by its internal ID.

    Returns 404 if no meeting exists with that ID.
    """
    meeting = await meeting_service.get_meeting_by_id(db, meeting_id)

    if meeting is None:
        raise HTTPException(
            status_code=404,
            detail=f"Meeting with id={meeting_id} not found",
        )

    return meeting


# ---------------------------------------------------------------------------
# 4. UPDATE MEETING  —  PATCH /api/meetings/{meeting_id}
# ---------------------------------------------------------------------------
@router.patch(
    "/{meeting_id}",
    response_model=MeetingResponse,
    summary="Update a meeting (partial)",
)
async def update_meeting(
    meeting_id: int,
    body: MeetingUpdate,                      # Only non-None fields are applied
    db: AsyncSession = Depends(get_db),
):
    """
    Partially update a meeting's title, schedule, or status.

    Only send the fields you want to change — omitted fields stay the same.
    When status changes to 'in_progress', started_at is set automatically.
    When status changes to 'completed', ended_at and duration are calculated.
    """
    # First, fetch the meeting
    meeting = await meeting_service.get_meeting_by_id(db, meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail=f"Meeting {meeting_id} not found")

    # Apply updates via the service function
    updated = await meeting_service.update_meeting(
        db=db,
        meeting=meeting,
        title=body.title,
        scheduled_at=body.scheduled_at,
        status=body.status,
    )
    return updated


# ---------------------------------------------------------------------------
# 5. DELETE MEETING  —  DELETE /api/meetings/{meeting_id}
# ---------------------------------------------------------------------------
@router.delete(
    "/{meeting_id}",
    status_code=204,  # 204 = "No Content" (nothing to return after deleting)
    summary="Delete a meeting",
)
async def delete_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Permanently delete a meeting and all related data
    (participants, chat messages, recordings).

    Returns 404 if the meeting doesn't exist.
    Returns 204 (no body) on successful deletion.
    """
    meeting = await meeting_service.get_meeting_by_id(db, meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail=f"Meeting {meeting_id} not found")

    await meeting_service.delete_meeting(db, meeting)
    # 204 response has no body, so we return None
    return None


# ---------------------------------------------------------------------------
# 6. GET MEETING BY CODE  —  GET /api/meetings/code/{meeting_code}
# ---------------------------------------------------------------------------
# The frontend's "Join Meeting" flow uses the human-readable meeting_code
# (e.g., "abc-defg-hij") to look up meetings, not the internal integer ID.
# ---------------------------------------------------------------------------
@router.get(
    "/code/{meeting_code}",
    response_model=MeetingResponse,
    summary="Get a meeting by its join code",
)
async def get_meeting_by_code(
    meeting_code: str,                        # Parsed from the URL path
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch a single meeting by its human-readable join code.

    Returns 404 if no meeting exists with that code.
    """
    meeting = await meeting_service.get_meeting_by_code(db, meeting_code)

    if meeting is None:
        raise HTTPException(
            status_code=404,
            detail=f"No meeting found with code '{meeting_code}'",
        )

    return meeting


# ---------------------------------------------------------------------------
# 7. JOIN MEETING BY CODE  —  POST /api/meetings/code/{meeting_code}/join
# ---------------------------------------------------------------------------
# Convenience endpoint: looks up the meeting by code and adds the demo user
# as a participant. Used by the frontend's join flow.
# ---------------------------------------------------------------------------
@router.post(
    "/code/{meeting_code}/join",
    response_model=MeetingResponse,
    summary="Join a meeting by its code",
)
async def join_meeting_by_code(
    meeting_code: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Join a meeting using its human-readable join code.

    NO AUTH – DEMO MODE: Always adds DEFAULT_USER as a participant.
    Returns 404 if no meeting exists with that code.
    Returns the meeting data after joining.
    """
    from config import DEFAULT_USER  # NO AUTH – DEMO MODE
    from services import participant_service

    meeting = await meeting_service.get_meeting_by_code(db, meeting_code)

    if meeting is None:
        raise HTTPException(
            status_code=404,
            detail=f"No meeting found with code '{meeting_code}'",
        )

    # Try to add the default user as a participant
    try:
        await participant_service.add_participant(
            db=db,
            meeting=meeting,
            user_id=DEFAULT_USER["id"],
            role="participant",
        )
    except ValueError:
        # User is already in this meeting — that's fine, just continue
        pass

    # Re-fetch to get updated participant_count
    meeting = await meeting_service.get_meeting_by_code(db, meeting_code)
    return meeting

