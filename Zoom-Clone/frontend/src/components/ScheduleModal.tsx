/**
 * components/ScheduleModal.tsx — Modal for scheduling a future meeting.
 *
 * Triggered by the "Schedule Meeting" button on the dashboard.
 * Form fields: Title, Description (optional), Date, Time, Duration.
 * Client-side validation before API call:
 *   - Title must not be empty
 *   - Date must not be in the past
 * Calls POST /api/meetings on submit with a scheduled_at datetime.
 */

"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Meeting } from "@/types/meeting";

// ---------------------------------------------------------------------------
// Props interface
// ---------------------------------------------------------------------------
interface ScheduleModalProps {
  isOpen: boolean;                     // Whether the modal is visible
  onClose: () => void;                 // Callback to close the modal
  onSuccess: () => void;              // Callback after successful scheduling (to refetch meetings)
}

// ---------------------------------------------------------------------------
// Form field error type
// ---------------------------------------------------------------------------
interface FormErrors {
  title?: string;
  date?: string;
  time?: string;
}

// ---------------------------------------------------------------------------
// Duration options for the select dropdown
// ---------------------------------------------------------------------------
const DURATION_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
  { value: 120, label: "120 minutes" },
];

// ---------------------------------------------------------------------------
// Helper: get today's date as YYYY-MM-DD string for the date input's min value
// ---------------------------------------------------------------------------
function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function ScheduleModal({ isOpen, onClose, onSuccess }: ScheduleModalProps) {
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /** Validate all form fields. Returns true if valid. */
  function validateForm(): boolean {
    const newErrors: FormErrors = {};

    // Title must not be empty
    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    // Date must be provided
    if (!date) {
      newErrors.date = "Date is required";
    } else {
      // Date must not be in the past
      const selectedDate = new Date(`${date}T${time || "23:59"}`);
      const now = new Date();
      if (selectedDate < now) {
        newErrors.date = "Date cannot be in the past";
      }
    }

    // Time must be provided
    if (!time) {
      newErrors.time = "Time is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /** Handle form submission */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    setSuccessMessage(null);

    // Validate before calling the API
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Build the ISO datetime string from separate date and time inputs
      // Format: "2025-07-15T14:00:00" — the backend accepts ISO datetime
      const scheduledAt = `${date}T${time}:00`;

      // POST /api/meetings — create a scheduled meeting
      await apiFetch<Meeting>("/api/meetings", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          duration_minutes: duration,
          scheduled_at: scheduledAt,
        }),
      });

      // Show success message briefly, then close
      setSuccessMessage("Meeting scheduled!");
      setTimeout(() => {
        resetForm();
        onClose();
        onSuccess();
      }, 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.detail);
      } else {
        setApiError("Failed to schedule meeting. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  /** Reset all form fields to defaults */
  function resetForm() {
    setTitle("");
    setDescription("");
    setDate("");
    setTime("");
    setDuration(60);
    setErrors({});
    setApiError(null);
    setSuccessMessage(null);
  }

  /** Handle modal close (reset form + call parent onClose) */
  function handleClose() {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  }

  // Don't render if modal is closed
  if (!isOpen) return null;

  return (
    <div
      id="schedule-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Schedule Meeting
          </h2>
          <button
            type="button"
            onClick={handleClose}
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

        {/* Success message */}
        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4
                          flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="text-sm text-green-700 font-medium">
              {successMessage}
            </p>
          </div>
        )}

        {/* API error message */}
        {apiError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label
              htmlFor="schedule-title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="schedule-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Sprint Planning"
              className={`w-full px-3 py-2 border rounded-md text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#0B5CFF]/30
                         focus:border-[#0B5CFF] transition-colors
                         ${errors.title ? "border-red-300 bg-red-50" : "border-gray-300"}`}
            />
            {errors.title && (
              <p className="text-xs text-red-600 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description (optional) */}
          <div>
            <label
              htmlFor="schedule-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="schedule-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this meeting about?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#0B5CFF]/30
                         focus:border-[#0B5CFF] transition-colors resize-none"
            />
          </div>

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="schedule-date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="schedule-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={getTodayString()}
                className={`w-full px-3 py-2 border rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#0B5CFF]/30
                           focus:border-[#0B5CFF] transition-colors
                           ${errors.date ? "border-red-300 bg-red-50" : "border-gray-300"}`}
              />
              {errors.date && (
                <p className="text-xs text-red-600 mt-1">{errors.date}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="schedule-time"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Time <span className="text-red-500">*</span>
              </label>
              <input
                id="schedule-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#0B5CFF]/30
                           focus:border-[#0B5CFF] transition-colors
                           ${errors.time ? "border-red-300 bg-red-50" : "border-gray-300"}`}
              />
              {errors.time && (
                <p className="text-xs text-red-600 mt-1">{errors.time}</p>
              )}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label
              htmlFor="schedule-duration"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Duration
            </label>
            <select
              id="schedule-duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#0B5CFF]/30
                         focus:border-[#0B5CFF] transition-colors bg-white"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Footer: action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              id="cancel-schedule"
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700
                         bg-gray-100 rounded-md hover:bg-gray-200
                         disabled:opacity-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-schedule"
              type="submit"
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
              {isLoading ? "Scheduling..." : "Schedule Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ScheduleModal;
