/**
 * components/NewMeetingModal.tsx — Modal for creating an instant meeting.
 *
 * Triggered by the "New Meeting" button on the dashboard.
 * On confirm: calls POST /api/meetings with a default title,
 * then redirects to /room/[generated-code].
 *
 * States:
 *   - idle: modal is open, waiting for user to confirm
 *   - loading: API call in progress (button shows spinner)
 *   - error: API call failed (shows error message)
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import type { Meeting } from "@/types/meeting";

// ---------------------------------------------------------------------------
// Props interface
// ---------------------------------------------------------------------------
interface NewMeetingModalProps {
  isOpen: boolean;           // Whether the modal is visible
  onClose: () => void;       // Callback to close the modal
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function NewMeetingModal({ isOpen, onClose }: NewMeetingModalProps) {
  const router = useRouter();

  // Local state for loading and error
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Handle the "Start Meeting" button click */
  async function handleConfirm() {
    setIsLoading(true);
    setError(null);

    try {
      // POST /api/meetings — create an instant meeting (no scheduled_at)
      const meeting = await apiFetch<Meeting>("/api/meetings", {
        method: "POST",
        body: JSON.stringify({
          title: "Instant Meeting",   // Default title for instant meetings
          // scheduled_at omitted → backend creates an instant (in_progress) meeting
        }),
      });

      // On success: close modal and redirect to the meeting room
      onClose();
      router.push(`/room/${meeting.meeting_code}`);
    } catch (err) {
      // Show the error message from the API, or a generic fallback
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to create meeting. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  /** Handle clicking the backdrop or pressing Escape */
  function handleBackdropClick() {
    if (!isLoading) {
      onClose();
    }
  }

  // Don't render anything if the modal is closed
  if (!isOpen) return null;

  return (
    <div
      id="new-meeting-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6
                   animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            New Meeting
          </h2>
          <button
            type="button"
            onClick={handleBackdropClick}
            className="text-gray-400 hover:text-gray-600 transition-colors
                       cursor-pointer"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="mb-6">
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg mb-4">
            <div className="flex items-center justify-center w-10 h-10
                           rounded-full bg-[#0B5CFF]/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0B5CFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
                <rect x="2" y="6" width="14" height="12" rx="2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Start an instant meeting
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                A new meeting room will be created immediately
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer: action buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            id="cancel-new-meeting"
            type="button"
            onClick={handleBackdropClick}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700
                       bg-gray-100 rounded-md hover:bg-gray-200
                       disabled:opacity-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="confirm-new-meeting"
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white
                       bg-[#0B5CFF] rounded-md hover:bg-[#0A4FE0]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors cursor-pointer
                       flex items-center gap-2"
          >
            {isLoading && (
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isLoading ? "Creating..." : "Start Meeting"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewMeetingModal;
