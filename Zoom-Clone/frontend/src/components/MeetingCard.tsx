/**
 * components/MeetingCard.tsx — Reusable card for upcoming meetings.
 *
 * Displays: title, formatted date/time, duration, and a "Start" button.
 * Used in the Upcoming Meetings section of the dashboard.
 */

"use client";

import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Props interface
// ---------------------------------------------------------------------------
interface MeetingCardProps {
  title: string;                  // Meeting name
  meetingCode: string;            // Human-readable join code (used for routing)
  scheduledAt: string | null;     // ISO datetime string (or null for instant meetings)
  durationMinutes: number | null; // Duration in minutes (null if not yet ended)
  status: string;                 // "scheduled" | "in_progress" | "completed"
  participantCount: number;       // Number of participants
  hostName: string | null;        // Host's display name
}

// ---------------------------------------------------------------------------
// Helper functions (extracted from JSX to keep the return clean)
// ---------------------------------------------------------------------------

/** Format an ISO datetime string into a human-friendly format */
function formatDateTime(iso: string | null): string {
  if (!iso) return "Instant Meeting";

  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format duration into a readable string */
function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/** Get a color-coded status indicator */
function getStatusStyles(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case "in_progress":
      return { bg: "bg-green-100", text: "text-green-700", label: "Live" };
    case "scheduled":
      return { bg: "bg-blue-100", text: "text-blue-700", label: "Upcoming" };
    case "completed":
      return { bg: "bg-gray-100", text: "text-gray-600", label: "Ended" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-600", label: status };
  }
}

// ---------------------------------------------------------------------------
// Calendar icon SVG
// ---------------------------------------------------------------------------
function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-400"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function MeetingCard({
  title,
  meetingCode,
  scheduledAt,
  durationMinutes,
  status,
  participantCount,
  hostName,
}: MeetingCardProps) {
  const router = useRouter();
  const statusStyle = getStatusStyles(status);

  /** Navigate to the meeting room when "Start" / "Join" is clicked */
  function handleStart() {
    router.push(`/room/${meetingCode}`);
  }

  return (
    <div
      id={`meeting-card-${meetingCode}`}
      className="flex flex-col justify-between p-5 bg-white rounded-xl
                 border border-gray-200 shadow-sm hover:shadow-md
                 transition-shadow duration-200"
    >
      {/* Top section: status badge + title */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full
                        text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
          >
            {status === "in_progress" && (
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
            )}
            {statusStyle.label}
          </span>
          <span className="text-xs text-gray-400 font-mono">
            {meetingCode}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
          {title}
        </h3>

        {hostName && (
          <p className="text-sm text-gray-500 mb-3">
            Hosted by {hostName}
          </p>
        )}
      </div>

      {/* Bottom section: date/time + actions */}
      <div>
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1.5">
            <CalendarIcon />
            {formatDateTime(scheduledAt)}
          </span>
          {durationMinutes && (
            <span className="text-gray-400">
              · {formatDuration(durationMinutes)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {participantCount} participant{participantCount !== 1 ? "s" : ""}
          </span>
          <button
            id={`start-meeting-${meetingCode}`}
            type="button"
            onClick={handleStart}
            className="px-4 py-2 bg-[#0B5CFF] text-white text-sm font-medium
                       rounded-md hover:bg-[#0A4FE0] active:bg-[#0943C4]
                       transition-colors cursor-pointer"
          >
            {status === "in_progress" ? "Join" : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MeetingCard;
