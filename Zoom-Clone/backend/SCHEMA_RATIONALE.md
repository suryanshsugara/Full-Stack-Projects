# Schema Design Rationale

> **Purpose:** This document explains every schema decision in first-person, interview-ready prose.
> It was written *before* any code so the design drives the implementation, not the other way around.

---

## How I Identified the Entities

I started by asking: "What are the real-world *things* in a video conferencing platform?" I opened Zoom, used it for a few calls, and wrote down every noun I interacted with:

- **A person** uses the platform → that's a **User**.
- **A meeting** is the central activity → that's a **Meeting**.
- **A person joins a meeting** — this is a relationship, not a thing, but it carries its own data (when they joined, their role), so it deserves its own table → **MeetingParticipant**.
- **A chat message** is sent during a meeting → **ChatMessage**.
- **A recording** is created when someone records a meeting → **Recording**.

I deliberately kept the scope tight. A production Zoom has breakout rooms, waiting rooms, polls, reactions, virtual backgrounds, and calendar integrations — but none of those are needed to demonstrate a working MVP. I can always add tables later without breaking the existing ones.

---

## Relationships and Cardinality

### User → Meeting (as Host): One-to-Many

Every meeting has exactly one host, but a single user can host many meetings. I modeled this with a `host_id` foreign key on the `meetings` table pointing to `users.id`.

**Example:** Alex Johnson (user 1) hosts "Sprint Planning," "Standup Call," and "Client Demo" — three rows in `meetings` all with `host_id = 1`.

### User ↔ Meeting (as Participant): Many-to-Many

A user can participate in many meetings, and a meeting can have many participants. This classic many-to-many relationship needs a join table: `meeting_participants`.

**Example:** The "Sprint Planning" meeting has Alex, Priya, Sam, and James as participants → 4 rows in `meeting_participants` with `meeting_id = 1`. Meanwhile, Alex is also in the "Standup Call" → another row in `meeting_participants` with `user_id = 1, meeting_id = 3`.

I chose to make this join table "rich" (not just two foreign keys) because I need to track *when* each person joined and left, and *what role* they played. A thin join table would have forced me to store that data somewhere awkward.

### Meeting → ChatMessage: One-to-Many

Each chat message belongs to exactly one meeting, but a meeting can have many messages. The `meeting_id` foreign key on `chat_messages` handles this.

**Example:** During Sprint Planning, 5 messages are sent → 5 rows in `chat_messages` with `meeting_id = 1`.

### User → ChatMessage: One-to-Many

Each message has exactly one sender. The `sender_id` foreign key on `chat_messages` points to `users.id`.

### Meeting → Recording: One-to-Many

A meeting can have multiple recordings (if the host stops and restarts recording), but each recording belongs to exactly one meeting.

---

## Deliberate Denormalization

### `meetings.participant_count`

The fully normalized approach would be to always compute the participant count with:
```sql
SELECT COUNT(*) FROM meeting_participants WHERE meeting_id = ?
```

But on the dashboard, I need to display a list of meetings *with* their participant counts. If I have 50 meetings, that's 50 extra COUNT queries (the classic N+1 problem). Instead, I store `participant_count` directly on the `meetings` table and update it whenever someone joins or leaves.

**Tradeoff I accepted:** The counter can drift out of sync if a bug skips the update. I'll mitigate this with a service function that always updates the count atomically when modifying participants. For a demo app, this is a worthwhile trade — dashboard performance matters more than theoretical consistency risk.

---

## Fields I Considered But Excluded

### 1. `users.avatar_url` (Profile Picture)

I almost added this because Zoom shows profile pictures in the participant list. But then I realized: (a) in demo mode we only have one real user, so avatars are pointless, (b) during actual video calls the camera feed replaces the avatar anyway, and (c) adding it later is a single `ALTER TABLE ADD COLUMN` — zero risk in deferring it.

### 2. `meetings.password` (Meeting Password)

Zoom lets hosts set a password that participants must enter. I excluded this because: (a) our app has no authentication system, so a "password" would be security theater, (b) it would require building a password-entry modal in the frontend which adds complexity without advancing the core demo, and (c) if we ever add auth, the password feature would need to be redesigned anyway to use proper hashing.

---

## Primary Key and Constraint Decisions

I chose **auto-incrementing integers** for all primary keys. UUIDs are popular in distributed systems, but SQLite is a single-file database with no replication — auto-increment is simpler, sequential, and easy to reference in seed data and during debugging.

**Unique constraints I added:**

1. `users.email` — Even without login, emails are the natural business identifier for users. Making them unique prevents duplicate seed data and sets us up for future auth.

2. `meetings.meeting_code` — This is the human-readable code (like "abc-defg-hij") that participants share to join a meeting. It *must* be unique system-wide; two meetings with the same code would be a showstopper bug.

3. `meeting_participants (user_id, meeting_id)` — A composite unique constraint prevents the same user from being added to the same meeting twice. Without this, a buggy API call could create duplicate participant records, inflating the count and causing UI glitches.
