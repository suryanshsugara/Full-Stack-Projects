/**
 * components/RecentMeetingRow.tsx — Compact row for recent/ended meetings.
 *
 * Displays: title, date, duration, and a color-coded status badge.
 * Used in the Recent Meetings section of the dashboard.
 */

"use client";

// ---------------------------------------------------------------------------
// Props interface
// ---------------------------------------------------------------------------
interface RecentMeetingRowProps {
  title: string;                   // Meeting name
  meetingCode: string;             // Human-readable join code
  endedAt: string | null;          // ISO datetime when the meeting ended
  startedAt: string | null;        // ISO datetime when the meeting started
  durationMinutes: number | null;  // Duration in minutes
  status: string;                  // "completed" | "in_progress" | "scheduled"
  participantCount: number;        // Number of participants
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Format an ISO datetime into a short date string */
function formatDate(iso: string | null): string {
  if (!iso) return "—";

  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format an ISO datetime into a time string */
function formatTime(iso: string | null): string {
  if (!iso) return "";

  const date = new Date(iso);
  return date.toLocaleTimeString("en-US", {
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

/** Get badge styling based on meeting status */
function getStatusBadge(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case "in_progress":
      return { bg: "bg-green-100", text: "text-green-700", label: "Active" };
    case "completed":
      return { bg: "bg-gray-100", text: "text-gray-600", label: "Ended" };
    case "scheduled":
      return { bg: "bg-blue-100", text: "text-blue-700", label: "Scheduled" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-600", label: status };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function RecentMeetingRow({
  title,
  meetingCode,
  endedAt,
  startedAt,
  durationMinutes,
  status,
  participantCount,
}: RecentMeetingRowProps) {
  const badge = getStatusBadge(status);

  // Use endedAt for completed, startedAt for in_progress, fallback to "—"
  const displayDate = endedAt || startedAt;

  return (
    <div
      id={`recent-meeting-${meetingCode}`}
      className="flex items-center justify-between px-4 py-3.5
                 bg-white rounded-lg border border-gray-100
                 hover:bg-gray-50 transition-colors duration-150"
    >
      {/* Left: Title + date */}
      <div className="flex-1 min-w-0 mr-4">
        <h4 className="text-sm font-semibold text-gray-900 truncate">
          {title}
        </h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">
            {formatDate(displayDate)}
          </span>
          {displayDate && (
            <span className="text-xs text-gray-400">
              {formatTime(displayDate)}
            </span>
          )}
          {durationMinutes && (
            <span className="text-xs text-gray-400">
              · {formatDuration(durationMinutes)}
            </span>
          )}
        </div>
      </div>

      {/* Right: participant count + status badge */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 hidden sm:block">
          {participantCount} participant{participantCount !== 1 ? "s" : ""}
        </span>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full
                      text-xs font-medium ${badge.bg} ${badge.text}`}
        >
          {status === "in_progress" && (
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
          )}
          {badge.label}
        </span>
      </div>
    </div>
  );
}

export default RecentMeetingRow;
