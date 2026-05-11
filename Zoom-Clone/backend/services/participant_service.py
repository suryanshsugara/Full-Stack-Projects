"""
participant_service.py -- Business logic for meeting participant operations.

Handles adding/removing users from meetings and listing who's in a meeting.
Each function takes an AsyncSession so the route handler controls the session.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload  # Eager-load user info with participant

from models import Meeting, MeetingParticipant, User


async def add_participant(
    db: AsyncSession,
    meeting: Meeting,
    user_id: int,
    role: str = "participant",
) -> MeetingParticipant:
    """
    Add a user as a participant to a meeting.

    Steps:
      1. Verify the user exists
      2. Check they haven't already joined this meeting
      3. Create the MeetingParticipant record
      4. Increment the meeting's denormalized participant_count
      5. Commit and return the participant with user info loaded

    Args:
        db: Async database session
        meeting: The Meeting ORM object (already fetched by the router)
        user_id: ID of the user to add
        role: 'host' or 'participant' (default: 'participant')

    Returns:
        The newly created MeetingParticipant object

    Raises:
        ValueError: If the user doesn't exist or is already in the meeting
    """
    # Step 1: Verify the user exists
    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()
    if user is None:
        raise ValueError(f"User with id={user_id} does not exist")

    # Step 2: Check for duplicate participation
    existing = await db.execute(
        select(MeetingParticipant).where(
            MeetingParticipant.user_id == user_id,
            MeetingParticipant.meeting_id == meeting.id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ValueError(f"User {user_id} is already in meeting {meeting.id}")

    # Step 3: Create the participant record
    participant = MeetingParticipant(
        user_id=user_id,
        meeting_id=meeting.id,
        role=role,
        # If the meeting is in progress, set joined_at to now
        joined_at=datetime.now(timezone.utc) if meeting.status == "in_progress" else None,
    )
    db.add(participant)

    # Step 4: Increment denormalized counter
    meeting.participant_count += 1

    # Step 5: Commit and re-fetch with user info
    await db.commit()

    result = await db.execute(
        select(MeetingParticipant)
        .options(selectinload(MeetingParticipant.user))
        .where(MeetingParticipant.id == participant.id)
    )
    return result.scalar_one()


async def get_participants(
    db: AsyncSession,
    meeting_id: int,
) -> list[MeetingParticipant]:
    """
    List all participants in a meeting, with user details loaded.

    Returns an empty list if the meeting has no participants.
    """
    result = await db.execute(
        select(MeetingParticipant)
        .options(selectinload(MeetingParticipant.user))  # Load user name/email
        .where(MeetingParticipant.meeting_id == meeting_id)
        .order_by(MeetingParticipant.joined_at.asc())  # Earliest joiners first
    )
    return list(result.scalars().all())


async def remove_participant(
    db: AsyncSession,
    meeting: Meeting,
    user_id: int,
) -> None:
    """
    Remove a user from a meeting (they left or were kicked).

    Steps:
      1. Find the participant record
      2. Delete it
      3. Decrement the denormalized participant_count

    Raises:
        ValueError: If the user is not in this meeting
    """
    result = await db.execute(
        select(MeetingParticipant).where(
            MeetingParticipant.user_id == user_id,
            MeetingParticipant.meeting_id == meeting.id,
        )
    )
    participant = result.scalar_one_or_none()

    if participant is None:
        raise ValueError(f"User {user_id} is not in meeting {meeting.id}")

    await db.delete(participant)

    # Decrement counter (floor at 0 to avoid negative counts from bugs)
    meeting.participant_count = max(0, meeting.participant_count - 1)

    await db.commit()
