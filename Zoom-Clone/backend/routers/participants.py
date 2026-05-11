"""
routers/participants.py -- API endpoints for meeting participant operations.

This router handles participant-related endpoints:
  1. POST   /api/meetings/{id}/participants     → Join a meeting
  2. GET    /api/meetings/{id}/participants     → List meeting participants
  3. DELETE /api/meetings/{id}/participants/{user_id} → Leave/remove from meeting

These are nested under /meetings/{id} because participants only make sense
in the context of a specific meeting.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas import ParticipantCreate, ParticipantResponse
from services import meeting_service, participant_service

# ---------------------------------------------------------------------------
# Create the router
# ---------------------------------------------------------------------------
# Note: No prefix here — we set the full path on each route because
# these endpoints are nested under /api/meetings/{meeting_id}/participants.
# ---------------------------------------------------------------------------
router = APIRouter(tags=["Participants"])


# ---------------------------------------------------------------------------
# Helper: Fetch meeting or raise 404
# ---------------------------------------------------------------------------
async def _get_meeting_or_404(db: AsyncSession, meeting_id: int):
    """
    Look up a meeting by ID and raise 404 if it doesn't exist.

    This is used by every endpoint in this router, so we extract it
    into a helper to avoid repeating the same 4 lines.
    """
    meeting = await meeting_service.get_meeting_by_id(db, meeting_id)
    if meeting is None:
        raise HTTPException(
            status_code=404,
            detail=f"Meeting with id={meeting_id} not found",
        )
    return meeting


# ---------------------------------------------------------------------------
# 1. JOIN A MEETING  —  POST /api/meetings/{meeting_id}/participants
# ---------------------------------------------------------------------------
@router.post(
    "/api/meetings/{meeting_id}/participants",
    response_model=ParticipantResponse,
    status_code=201,
    summary="Add a participant to a meeting",
)
async def join_meeting(
    meeting_id: int,
    body: ParticipantCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Add a user as a participant to a meeting.

    The user_id and role are provided in the request body.
    Returns 404 if the meeting doesn't exist.
    Returns 400 if the user doesn't exist or is already in the meeting.
    """
    meeting = await _get_meeting_or_404(db, meeting_id)

    try:
        participant = await participant_service.add_participant(
            db=db,
            meeting=meeting,
            user_id=body.user_id,
            role=body.role,
        )
    except ValueError as e:
        # ValueError is raised by the service for business rule violations
        # (user not found, duplicate participant)
        raise HTTPException(status_code=400, detail=str(e))

    return participant


# ---------------------------------------------------------------------------
# 2. LIST PARTICIPANTS  —  GET /api/meetings/{meeting_id}/participants
# ---------------------------------------------------------------------------
@router.get(
    "/api/meetings/{meeting_id}/participants",
    response_model=list[ParticipantResponse],
    summary="List all participants in a meeting",
)
async def list_participants(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get all participants in a meeting, with their user details.

    Returns an empty list if the meeting has no participants.
    Returns 404 if the meeting doesn't exist.
    """
    # Verify meeting exists
    await _get_meeting_or_404(db, meeting_id)

    participants = await participant_service.get_participants(db, meeting_id)
    return participants


# ---------------------------------------------------------------------------
# 3. LEAVE / REMOVE  —  DELETE /api/meetings/{meeting_id}/participants/{user_id}
# ---------------------------------------------------------------------------
@router.delete(
    "/api/meetings/{meeting_id}/participants/{user_id}",
    status_code=204,
    summary="Remove a participant from a meeting",
)
async def leave_meeting(
    meeting_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Remove a user from a meeting (they left or were removed by the host).

    Returns 404 if the meeting doesn't exist.
    Returns 400 if the user is not in the meeting.
    Returns 204 (no body) on success.
    """
    meeting = await _get_meeting_or_404(db, meeting_id)

    try:
        await participant_service.remove_participant(db, meeting, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return None
