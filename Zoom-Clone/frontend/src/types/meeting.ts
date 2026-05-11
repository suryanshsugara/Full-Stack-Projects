/**
 * types/meeting.ts — TypeScript interfaces matching FastAPI response schemas.
 *
 * These interfaces mirror the Pydantic models in backend/schemas.py exactly.
 * Every field name and type matches what the API actually returns.
 * No extra fields, no guessing.
 *
 * Source of truth: backend/schemas.py
 *   - UserResponse     → User
 *   - MeetingResponse   → Meeting
 *   - MeetingListResponse → MeetingListResponse
 *   - ParticipantResponse → Participant
 */

/**
 * Mirrors backend UserResponse schema.
 * Represents a user of the platform.
 */
export interface User {
  id: number;                    // Unique user ID
  name: string;                  // Display name
  email: string;                 // Email address
  created_at: string;            // ISO datetime string (Python datetime → JSON string)
}

/**
 * Mirrors backend MeetingResponse schema.
 * Represents a meeting (scheduled, in-progress, or completed).
 */
export interface Meeting {
  id: number;                              // Internal meeting ID
  title: string;                           // Meeting name
  meeting_code: string;                    // Human-readable join code (e.g., "abc-defg-hij")
  host_id: number;                         // Host's user ID
  host: User | null;                       // Nested host details (eagerly loaded)
  scheduled_at: string | null;             // ISO datetime — when it's scheduled (null for instant)
  started_at: string | null;               // ISO datetime — when it actually started
  ended_at: string | null;                 // ISO datetime — when it ended
  duration_minutes: number | null;         // How long it lasted (set on completion)
  status: "scheduled" | "in_progress" | "completed";  // Meeting status enum
  participant_count: number;               // Denormalized participant count
  daily_room_name: string | null;          // Daily.co room name (future video integration)
  daily_room_url: string | null;           // Daily.co room URL (future video integration)
  created_at: string;                      // ISO datetime — when the record was created
}

/**
 * Mirrors backend MeetingListResponse schema.
 * Wraps a list of meetings with a total count for pagination.
 */
export interface MeetingListResponse {
  meetings: Meeting[];   // Array of meeting objects
  total: number;         // Total count (for pagination UI)
}

/**
 * Mirrors backend ParticipantResponse schema.
 * Represents a user's participation in a meeting.
 */
export interface Participant {
  id: number;                    // Participant record ID
  user_id: number;               // Which user
  meeting_id: number;            // Which meeting
  role: "host" | "participant";  // Role in the meeting
  joined_at: string | null;      // ISO datetime — when they joined
  left_at: string | null;        // ISO datetime — when they left
  user: User | null;             // Nested user details
}
