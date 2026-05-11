"""
models.py — SQLAlchemy ORM models for the Zoom Clone database.

Tables:
  1. users                — People who use the platform
  2. meetings             — Video call sessions (scheduled or instant)
  3. meeting_participants  — Which users are in which meetings (many-to-many)
  4. chat_messages         — Text messages sent during a meeting
  5. recordings            — Metadata about meeting recordings
"""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import (
    String, Integer, DateTime, Text, ForeignKey,
    UniqueConstraint, Float,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def utc_now() -> datetime:
    """Return the current UTC time as a timezone-aware datetime."""
    return datetime.now(timezone.utc)


class User(Base):
    """Represents a registered user of the Zoom Clone platform."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)  # Unique user ID
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # Display name in meetings
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)  # Unique login identifier
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)  # Account creation time

    # Relationships
    hosted_meetings: Mapped[List["Meeting"]] = relationship("Meeting", back_populates="host", cascade="all, delete-orphan")
    participations: Mapped[List["MeetingParticipant"]] = relationship("MeetingParticipant", back_populates="user", cascade="all, delete-orphan")
    chat_messages: Mapped[List["ChatMessage"]] = relationship("ChatMessage", back_populates="sender", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, name='{self.name}', email='{self.email}')>"


class Meeting(Base):
    """
    Represents a video meeting session.
    Status can be: 'scheduled', 'in_progress', or 'completed'.
    Each meeting has a unique human-readable meeting_code for joining.
    """

    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)  # Internal meeting ID
    title: Mapped[str] = mapped_column(String(200), nullable=False)  # Meeting name (e.g., 'Sprint Planning')
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Meeting description
    meeting_code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)  # Join code (e.g., 'abc-defg-hij')
    host_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # Who created this meeting
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)  # When it's scheduled (NULL = instant)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)  # When it actually started
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)  # When it ended
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Total duration (set on end)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="scheduled")  # scheduled | in_progress | completed
    participant_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # Denormalized counter (see SCHEMA_RATIONALE.md)
    daily_room_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Daily.co room name
    daily_room_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # Daily.co room URL
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)  # Record creation time

    # Relationships
    host: Mapped["User"] = relationship("User", back_populates="hosted_meetings")
    participants: Mapped[List["MeetingParticipant"]] = relationship("MeetingParticipant", back_populates="meeting", cascade="all, delete-orphan")
    chat_messages: Mapped[List["ChatMessage"]] = relationship("ChatMessage", back_populates="meeting", cascade="all, delete-orphan")
    recordings: Mapped[List["Recording"]] = relationship("Recording", back_populates="meeting", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Meeting(id={self.id}, title='{self.title}', code='{self.meeting_code}', status='{self.status}')>"


class MeetingParticipant(Base):
    """
    Join table: tracks which users participate in which meetings.
    Also stores per-participant metadata (join/leave times, role).
    The (user_id, meeting_id) pair must be unique.
    """

    __tablename__ = "meeting_participants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)  # Surrogate PK
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # Which user
    meeting_id: Mapped[int] = mapped_column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)  # Which meeting
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="participant")  # 'host' or 'participant'
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)  # When they joined the call
    left_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)  # When they left the call

    __table_args__ = (
        UniqueConstraint("user_id", "meeting_id", name="uq_user_meeting"),  # Can't join same meeting twice
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="participations")
    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="participants")

    def __repr__(self) -> str:
        return f"<MeetingParticipant(user_id={self.user_id}, meeting_id={self.meeting_id}, role='{self.role}')>"


class ChatMessage(Base):
    """A text message sent by a user during a meeting. Ordered by sent_at."""

    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)  # Message ID
    meeting_id: Mapped[int] = mapped_column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)  # Which meeting
    sender_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # Who sent it
    content: Mapped[str] = mapped_column(Text, nullable=False)  # The message text
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)  # When it was sent

    # Relationships
    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="chat_messages")
    sender: Mapped["User"] = relationship("User", back_populates="chat_messages")

    def __repr__(self) -> str:
        preview = self.content[:30] + "..." if len(self.content) > 30 else self.content
        return f"<ChatMessage(id={self.id}, sender_id={self.sender_id}, preview='{preview}')>"


class Recording(Base):
    """
    Metadata about a meeting recording. The actual video file is stored
    on disk/cloud — we only track the path, size, and duration here.
    """

    __tablename__ = "recordings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)  # Recording ID
    meeting_id: Mapped[int] = mapped_column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)  # Which meeting
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g., 'sprint-planning-2025-01-15.mp4'
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)  # Full storage path or URL
    file_size_mb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # File size in MB
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Recording length
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)  # When recorded

    # Relationships
    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="recordings")

    def __repr__(self) -> str:
        return f"<Recording(id={self.id}, meeting_id={self.meeting_id}, file='{self.file_name}')>"
