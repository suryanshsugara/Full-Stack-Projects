"""
meeting_service.py -- Business logic for meeting operations.

This module contains ALL the database queries and logic for meetings.
Route handlers in routers/meetings.py call these functions instead of
writing SQL directly — this keeps handlers thin and testable.

Every function takes an AsyncSession as its first argument so the
caller (the route handler) controls the session lifecycle.
"""

import random
import string
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload  # Eager-load relationships in one query

from models import Meeting, MeetingParticipant
from config import DEFAULT_USER


def _generate_meeting_code() -> str:
    """
    Generate a random meeting code like 'abc-defg-hij'.

    Format: 3 lowercase letters, dash, 4 lowercase letters, dash, 3 lowercase letters.
    This mimics Zoom's meeting ID format and is human-readable.
    """
    part1 = "".join(random.choices(string.ascii_lowercase, k=3))
    part2 = "".join(random.choices(string.ascii_lowercase, k=4))
    part3 = "".join(random.choices(string.ascii_lowercase, k=3))
    return f"{part1}-{part2}-{part3}"


async def create_meeting(
    db: AsyncSession,
    title: str,
    description: Optional[str] = None,
    duration_minutes: Optional[int] = None,
    scheduled_at: Optional[datetime] = None,
) -> Meeting:
    """
    Create a new meeting and automatically add the host as a participant.

    Steps:
      1. Generate a unique meeting code
      2. Create the Meeting row
      3. Create a MeetingParticipant row for the host (role='host')
      4. Update participant_count to 1
      5. Commit and return the meeting with host relationship loaded

    Args:
        db: Async database session
        title: Name of the meeting
        description: Optional description of the meeting
        duration_minutes: Optional expected duration in minutes
        scheduled_at: Optional scheduled start time (None = instant meeting)

    Returns:
        The newly created Meeting object with host loaded
    """
    # Step 1: Generate a unique meeting code (retry if collision)
    meeting_code = _generate_meeting_code()

    # Step 2: Create the meeting record
    # NO AUTH -- DEMO MODE: host is always the default user
    meeting = Meeting(
        title=title,
        description=description,
        duration_minutes=duration_minutes,
        meeting_code=meeting_code,
        host_id=DEFAULT_USER["id"],
        scheduled_at=scheduled_at,
        status="scheduled" if scheduled_at else "in_progress",
        participant_count=1,  # The host counts as a participant
    )
    db.add(meeting)
    await db.flush()  # Flush to get the auto-generated meeting.id

    # Step 3: Add the host as a participant
    host_participant = MeetingParticipant(
        user_id=DEFAULT_USER["id"],
        meeting_id=meeting.id,
        role="host",
        joined_at=datetime.now(timezone.utc) if not scheduled_at else None,
    )
    db.add(host_participant)

    # Step 4: Commit the transaction
    await db.commit()

    # Step 5: Re-fetch with host relationship loaded
    result = await db.execute(
        select(Meeting)
        .options(selectinload(Meeting.host))  # Eager-load the host User object
        .where(Meeting.id == meeting.id)
    )
    return result.scalar_one()


async def get_meetings(
    db: AsyncSession,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[Meeting], int]:
    """
    List meetings with optional status filter and pagination.

    Args:
        db: Async database session
        status: Optional filter — 'scheduled', 'in_progress', or 'completed'
        skip: Number of records to skip (for pagination)
        limit: Max records to return (page size)

    Returns:
        A tuple of (list_of_meetings, total_count)
    """
    # Build the base query
    query = select(Meeting).options(selectinload(Meeting.host))

    # Apply optional status filter
    if status:
        query = query.where(Meeting.status == status)

    # Get total count (before pagination) for the frontend to show "page X of Y"
    count_query = select(func.count(Meeting.id))
    if status:
        count_query = count_query.where(Meeting.status == status)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Apply pagination and ordering (newest first)
    query = query.order_by(Meeting.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    meetings = list(result.scalars().all())

    return meetings, total


async def get_meeting_by_id(db: AsyncSession, meeting_id: int) -> Optional[Meeting]:
    """
    Fetch a single meeting by its ID, with host info loaded.

    Returns None if no meeting exists with that ID.
    """
    result = await db.execute(
        select(Meeting)
        .options(selectinload(Meeting.host))
        .where(Meeting.id == meeting_id)
    )
    return result.scalar_one_or_none()


async def get_meeting_by_code(db: AsyncSession, meeting_code: str) -> Optional[Meeting]:
    """
    Fetch a single meeting by its human-readable join code.

    This is used when a participant clicks a meeting link like
    "/join/abc-defg-hij" — we look up the meeting by code, not by ID.
    """
    result = await db.execute(
        select(Meeting)
        .options(selectinload(Meeting.host))
        .where(Meeting.meeting_code == meeting_code)
    )
    return result.scalar_one_or_none()


async def update_meeting(
    db: AsyncSession,
    meeting: Meeting,
    title: Optional[str] = None,
    scheduled_at: Optional[datetime] = None,
    status: Optional[str] = None,
) -> Meeting:
    """
    Update an existing meeting's fields.

    Only non-None arguments are applied — this supports partial updates
    (the PATCH pattern). If status changes to 'in_progress', we record
    started_at. If it changes to 'completed', we record ended_at and
    calculate duration.

    Args:
        db: Async database session
        meeting: The Meeting ORM object to update (already fetched)
        title: New title (or None to keep current)
        scheduled_at: New scheduled time (or None to keep current)
        status: New status (or None to keep current)

    Returns:
        The updated Meeting object
    """
    if title is not None:
        meeting.title = title

    if scheduled_at is not None:
        meeting.scheduled_at = scheduled_at

    if status is not None and status != meeting.status:
        meeting.status = status

        # When meeting starts, record the start time
        if status == "in_progress":
            meeting.started_at = datetime.now(timezone.utc)

        # When meeting ends, record end time and calculate duration
        if status == "completed":
            meeting.ended_at = datetime.now(timezone.utc)
            if meeting.started_at:
                # Calculate duration in minutes
                delta = meeting.ended_at - meeting.started_at
                meeting.duration_minutes = int(delta.total_seconds() / 60)

    await db.commit()
    await db.refresh(meeting)
    return meeting


async def delete_meeting(db: AsyncSession, meeting: Meeting) -> None:
    """
    Delete a meeting and all related records (participants, messages, recordings).

    CASCADE delete is configured in the model's foreign keys, so SQLAlchemy
    handles deleting related rows automatically.
    """
    await db.delete(meeting)
    await db.commit()
