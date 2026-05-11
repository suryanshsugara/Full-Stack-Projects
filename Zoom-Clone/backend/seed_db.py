"""
seed_db.py — Populates the database with realistic sample data.

Run this script directly:  python seed_db.py
It will:
  1. Create all tables (if they don't exist)
  2. Insert 5 sample users (including the hardcoded demo user)
  3. Insert 6 meetings with various statuses
  4. Insert ~15 participant records
  5. Insert ~10 chat messages
  6. Insert 2 recordings

The data is designed to look realistic on a dashboard — different meeting
statuses, varied participant counts, and natural-sounding chat messages.
"""

import asyncio
from datetime import datetime, timezone, timedelta

from database import engine, async_session_factory, Base
from models import User, Meeting, MeetingParticipant, ChatMessage, Recording
from config import DEFAULT_USER  # NO AUTH – DEMO MODE


def utc(year: int, month: int, day: int, hour: int = 0, minute: int = 0) -> datetime:
    """Helper: create a timezone-aware UTC datetime."""
    return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)


async def seed() -> None:
    """Main seed function — creates tables and inserts sample data."""

    # Step 1: Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)   # Start fresh
        await conn.run_sync(Base.metadata.create_all)  # Create tables

    async with async_session_factory() as session:
        # =====================================================================
        # USERS — 5 sample users
        # =====================================================================
        # NO AUTH – DEMO MODE: User #1 matches DEFAULT_USER from config.py
        users = [
            User(id=1, name=DEFAULT_USER["name"], email=DEFAULT_USER["email"]),  # NO AUTH – DEMO MODE
            User(id=2, name="Priya Sharma", email="priya@demo.com"),
            User(id=3, name="Sam Wilson", email="sam@demo.com"),
            User(id=4, name="Maria Garcia", email="maria@demo.com"),
            User(id=5, name="James Chen", email="james@demo.com"),
        ]
        session.add_all(users)
        await session.flush()  # Flush to get IDs assigned before referencing them

        # =====================================================================
        # MEETINGS — 6 meetings with different statuses
        # =====================================================================
        now = datetime.now(timezone.utc)

        meetings = [
            # Meeting 1: Completed yesterday
            Meeting(
                id=1,
                title="Sprint Planning",
                meeting_code="spr-plan-001",
                host_id=1,
                scheduled_at=utc(2025, 7, 10, 10, 0),
                started_at=utc(2025, 7, 10, 10, 2),
                ended_at=utc(2025, 7, 10, 11, 5),
                duration_minutes=63,
                status="completed",
                participant_count=4,
            ),
            # Meeting 2: Completed last week
            Meeting(
                id=2,
                title="Design Review",
                meeting_code="des-revw-002",
                host_id=2,
                scheduled_at=utc(2025, 7, 7, 14, 0),
                started_at=utc(2025, 7, 7, 14, 5),
                ended_at=utc(2025, 7, 7, 15, 0),
                duration_minutes=55,
                status="completed",
                participant_count=3,
            ),
            # Meeting 3: Currently in progress
            Meeting(
                id=3,
                title="Standup Call",
                meeting_code="std-call-003",
                host_id=1,
                scheduled_at=now - timedelta(minutes=15),
                started_at=now - timedelta(minutes=10),
                status="in_progress",
                participant_count=3,
            ),
            # Meeting 4: Scheduled for tomorrow
            Meeting(
                id=4,
                title="Client Demo",
                meeting_code="cli-demo-004",
                host_id=1,
                scheduled_at=now + timedelta(days=1, hours=2),
                status="scheduled",
                participant_count=0,
            ),
            # Meeting 5: Scheduled for next week
            Meeting(
                id=5,
                title="Team Retro",
                meeting_code="ret-team-005",
                host_id=3,
                scheduled_at=now + timedelta(days=5),
                status="scheduled",
                participant_count=0,
            ),
            # Meeting 6: Completed — an instant meeting (no scheduled_at)
            Meeting(
                id=6,
                title="Quick Sync",
                meeting_code="qck-sync-006",
                host_id=4,
                started_at=utc(2025, 7, 9, 16, 30),
                ended_at=utc(2025, 7, 9, 16, 50),
                duration_minutes=20,
                status="completed",
                participant_count=2,
            ),
        ]
        session.add_all(meetings)
        await session.flush()

        # =====================================================================
        # MEETING PARTICIPANTS — ~15 records
        # =====================================================================
        participants = [
            # Sprint Planning (meeting 1) — 4 participants
            MeetingParticipant(user_id=1, meeting_id=1, role="host", joined_at=utc(2025, 7, 10, 10, 0), left_at=utc(2025, 7, 10, 11, 5)),
            MeetingParticipant(user_id=2, meeting_id=1, role="participant", joined_at=utc(2025, 7, 10, 10, 3), left_at=utc(2025, 7, 10, 11, 5)),
            MeetingParticipant(user_id=3, meeting_id=1, role="participant", joined_at=utc(2025, 7, 10, 10, 5), left_at=utc(2025, 7, 10, 11, 0)),
            MeetingParticipant(user_id=5, meeting_id=1, role="participant", joined_at=utc(2025, 7, 10, 10, 1), left_at=utc(2025, 7, 10, 11, 5)),

            # Design Review (meeting 2) — 3 participants
            MeetingParticipant(user_id=2, meeting_id=2, role="host", joined_at=utc(2025, 7, 7, 14, 0), left_at=utc(2025, 7, 7, 15, 0)),
            MeetingParticipant(user_id=1, meeting_id=2, role="participant", joined_at=utc(2025, 7, 7, 14, 5), left_at=utc(2025, 7, 7, 15, 0)),
            MeetingParticipant(user_id=4, meeting_id=2, role="participant", joined_at=utc(2025, 7, 7, 14, 8), left_at=utc(2025, 7, 7, 14, 55)),

            # Standup Call (meeting 3) — 3 participants (still in progress)
            MeetingParticipant(user_id=1, meeting_id=3, role="host", joined_at=now - timedelta(minutes=10)),
            MeetingParticipant(user_id=2, meeting_id=3, role="participant", joined_at=now - timedelta(minutes=8)),
            MeetingParticipant(user_id=3, meeting_id=3, role="participant", joined_at=now - timedelta(minutes=7)),

            # Quick Sync (meeting 6) — 2 participants
            MeetingParticipant(user_id=4, meeting_id=6, role="host", joined_at=utc(2025, 7, 9, 16, 30), left_at=utc(2025, 7, 9, 16, 50)),
            MeetingParticipant(user_id=5, meeting_id=6, role="participant", joined_at=utc(2025, 7, 9, 16, 32), left_at=utc(2025, 7, 9, 16, 50)),
        ]
        session.add_all(participants)
        await session.flush()

        # =====================================================================
        # CHAT MESSAGES — ~10 messages across meetings
        # =====================================================================
        messages = [
            # Sprint Planning chat
            ChatMessage(meeting_id=1, sender_id=1, content="Good morning team! Let's go through the backlog.", sent_at=utc(2025, 7, 10, 10, 3)),
            ChatMessage(meeting_id=1, sender_id=2, content="I've updated the Jira board with new estimates.", sent_at=utc(2025, 7, 10, 10, 5)),
            ChatMessage(meeting_id=1, sender_id=3, content="Can we prioritize the auth module this sprint?", sent_at=utc(2025, 7, 10, 10, 8)),
            ChatMessage(meeting_id=1, sender_id=1, content="Yes, auth is top priority. Let's assign it to Sam.", sent_at=utc(2025, 7, 10, 10, 10)),
            ChatMessage(meeting_id=1, sender_id=5, content="I can help with the API tests for that module.", sent_at=utc(2025, 7, 10, 10, 12)),

            # Design Review chat
            ChatMessage(meeting_id=2, sender_id=2, content="Here's the updated Figma link for the dashboard.", sent_at=utc(2025, 7, 7, 14, 10)),
            ChatMessage(meeting_id=2, sender_id=1, content="Looks great! The color palette is much better now.", sent_at=utc(2025, 7, 7, 14, 15)),
            ChatMessage(meeting_id=2, sender_id=4, content="Should we add a dark mode toggle?", sent_at=utc(2025, 7, 7, 14, 20)),

            # Standup Call chat
            ChatMessage(meeting_id=3, sender_id=1, content="Let's keep this quick — round-robin updates.", sent_at=now - timedelta(minutes=9)),
            ChatMessage(meeting_id=3, sender_id=2, content="I finished the payment integration yesterday.", sent_at=now - timedelta(minutes=7)),
        ]
        session.add_all(messages)
        await session.flush()

        # =====================================================================
        # RECORDINGS — 2 recordings
        # =====================================================================
        recordings = [
            Recording(
                meeting_id=1,
                file_name="sprint-planning-2025-07-10.mp4",
                file_path="/recordings/sprint-planning-2025-07-10.mp4",
                file_size_mb=245.5,
                duration_seconds=3780,
                recorded_at=utc(2025, 7, 10, 11, 5),
            ),
            Recording(
                meeting_id=2,
                file_name="design-review-2025-07-07.mp4",
                file_path="/recordings/design-review-2025-07-07.mp4",
                file_size_mb=189.2,
                duration_seconds=3300,
                recorded_at=utc(2025, 7, 7, 15, 0),
            ),
        ]
        session.add_all(recordings)

        # Commit everything in one transaction
        await session.commit()

    print("[OK] Database seeded successfully!")
    print("   - 5 users")
    print("   - 6 meetings (3 completed, 1 in-progress, 2 scheduled)")
    print("   - 12 participant records")
    print("   - 10 chat messages")
    print("   - 2 recordings")


# ---------------------------------------------------------------------------
# Entry point: run the seed function
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    asyncio.run(seed())
