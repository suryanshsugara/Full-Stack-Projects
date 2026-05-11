"""
schemas.py -- Pydantic models for request/response validation.

These schemas sit between the API layer (routers/) and the database layer (models.py).
They define:
  1. What data the client must SEND in a request body (Create / Update schemas)
  2. What data the server RETURNS in a response (Response schemas)

Why separate from SQLAlchemy models?
  - SQLAlchemy models map to DB rows; Pydantic schemas map to JSON payloads.
  - We can expose a SUBSET of fields (e.g., never expose internal IDs in create requests).
  - Pydantic validates types automatically — if a client sends a string where
    we expect an int, FastAPI returns a 422 error without us writing any code.

Naming convention:
  - *Create  → fields required to CREATE a new record
  - *Update  → fields allowed when UPDATING (all optional)
  - *Response → fields returned TO the client
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict


# =============================================================================
# USER SCHEMAS
# =============================================================================

class UserResponse(BaseModel):
    """Data we return when the client asks about a user."""

    id: int                         # Unique user ID
    name: str                       # Display name
    email: str                      # Email address
    created_at: datetime            # When they signed up

    # Tell Pydantic to read data from SQLAlchemy model attributes (not just dicts).
    # Without this, `UserResponse.model_validate(user_orm_object)` would fail.
    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# MEETING SCHEMAS
# =============================================================================

class MeetingCreate(BaseModel):
    """
    Fields required to create a new meeting.

    The client sends this JSON in a POST request body.
    Fields like id, meeting_code, status, and timestamps are set
    automatically by the backend — the client never provides them.
    """

    title: str = Field(
        ...,                                    # "..." means required (no default)
        min_length=1,                           # Must not be empty
        max_length=200,                         # Match the DB column limit
        description="Name of the meeting",
        examples=["Sprint Planning"],
    )
    description: Optional[str] = Field(
        default=None,
        description="Optional description of the meeting",
    )
    duration_minutes: Optional[int] = Field(
        default=None,
        description="Expected duration in minutes",
    )
    scheduled_at: Optional[datetime] = Field(
        default=None,                           # NULL = instant meeting
        description="When the meeting is scheduled (omit for instant meetings)",
    )


class MeetingUpdate(BaseModel):
    """
    Fields allowed when updating an existing meeting.

    All fields are optional — the client only sends what they want to change.
    This is the "PATCH" pattern: partial updates.
    """

    title: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=200,
        description="New title for the meeting",
    )
    scheduled_at: Optional[datetime] = Field(
        default=None,
        description="New scheduled time",
    )
    status: Optional[str] = Field(
        default=None,
        pattern="^(scheduled|in_progress|completed)$",  # Only these 3 values
        description="New status (scheduled, in_progress, or completed)",
    )


class MeetingResponse(BaseModel):
    """
    Full meeting data returned to the client.

    Includes all fields from the DB model, plus the host's info
    as a nested object (so the frontend doesn't need a second API call).
    """

    id: int                                     # Internal meeting ID
    title: str                                  # Meeting name
    meeting_code: str                           # Join code (e.g., 'abc-defg-hij')
    host_id: int                                # Host's user ID
    host: Optional[UserResponse] = None         # Nested host details
    scheduled_at: Optional[datetime] = None     # Scheduled start time
    started_at: Optional[datetime] = None       # Actual start time
    ended_at: Optional[datetime] = None         # End time
    duration_minutes: Optional[int] = None      # How long it lasted
    status: str                                 # scheduled | in_progress | completed
    participant_count: int                      # Number of participants
    daily_room_name: Optional[str] = None       # Daily.co room name
    daily_room_url: Optional[str] = None        # Daily.co room URL
    created_at: datetime                        # When the record was created

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# PARTICIPANT SCHEMAS
# =============================================================================

class ParticipantCreate(BaseModel):
    """
    Fields required to add a participant to a meeting.

    The client sends the user_id of who's joining and optionally their role.
    The meeting_id comes from the URL path, not the body.
    """

    user_id: int = Field(
        ...,
        description="ID of the user joining the meeting",
    )
    role: str = Field(
        default="participant",
        pattern="^(host|participant)$",         # Only these 2 values
        description="Role in the meeting: 'host' or 'participant'",
    )


class ParticipantResponse(BaseModel):
    """Data returned when listing or adding a meeting participant."""

    id: int                                     # Participant record ID
    user_id: int                                # Which user
    meeting_id: int                             # Which meeting
    role: str                                   # host or participant
    joined_at: Optional[datetime] = None        # When they joined
    left_at: Optional[datetime] = None          # When they left
    user: Optional[UserResponse] = None         # Nested user details

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# CHAT MESSAGE SCHEMAS
# =============================================================================

class ChatMessageCreate(BaseModel):
    """Fields required to send a chat message during a meeting."""

    content: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The message text",
    )


class ChatMessageResponse(BaseModel):
    """Data returned for a chat message."""

    id: int                                     # Message ID
    meeting_id: int                             # Which meeting
    sender_id: int                              # Who sent it
    content: str                                # The text
    sent_at: datetime                           # Timestamp
    sender: Optional[UserResponse] = None       # Nested sender details

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# GENERIC LIST RESPONSE (for paginated endpoints)
# =============================================================================

class MeetingListResponse(BaseModel):
    """Wraps a list of meetings with a total count — useful for pagination."""

    meetings: List[MeetingResponse]             # The meeting objects
    total: int                                  # Total count (for pagination)
