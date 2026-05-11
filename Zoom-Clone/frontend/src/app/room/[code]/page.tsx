// VIDEO INTEGRATION POINT
// To add real video, initialize your SDK here using meetingCode
// and the display name passed via query params or state.
// Example: import DailyIframe from '@daily-co/daily-js';
// const callFrame = DailyIframe.createFrame({ url: meeting.daily_room_url });

/**
 * app/room/[code]/page.tsx — Meeting room page.
 *
 * Fetches meeting details on mount using GET /api/meetings/code/{code}.
 * Shows meeting info, a video placeholder, and a Leave button.
 */

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Meeting } from "@/types/meeting";

// NO AUTH – DEMO MODE
const DEMO_DISPLAY_NAME = "Alex Johnson";

function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const meetingCode = params.code as string;
  
  // Read name from query params or fallback to demo name
  const displayName = searchParams.get("name") || DEMO_DISPLAY_NAME;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch meeting details on mount using the code from the URL.
  // Dependency: meetingCode — refetches if the URL changes.
  useEffect(() => {
    async function fetchMeeting() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiFetch<Meeting>(`/api/meetings/code/${meetingCode}`);
        setMeeting(data);
      } catch {
        setError("Failed to load meeting details");
      } finally {
        setIsLoading(false);
      }
    }
    if (meetingCode) fetchMeeting();
  }, [meetingCode]);

  function handleLeave() {
    router.push("/");
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-[#0B5CFF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-400 text-sm">Loading meeting...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md mx-4 text-center">
          <div className="flex items-center justify-center w-14 h-14 bg-red-500/10 rounded-full mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          </div>
          <p className="text-white font-medium mb-2">Meeting not found</p>
          <p className="text-gray-400 text-sm mb-6">{error || "This meeting code may be invalid"}</p>
          <button type="button" onClick={handleLeave}
            className="px-6 py-2 text-sm font-medium text-white bg-[#0B5CFF] rounded-md hover:bg-[#0A4FE0] transition-colors cursor-pointer">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-gray-800/80 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0B5CFF]">
            <span className="text-white font-bold text-sm">Z</span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">{meeting.title}</h1>
            <p className="text-gray-400 text-xs font-mono">{meeting.meeting_code}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>{meeting.participant_count}</span>
          </div>
          {/* NO AUTH – DEMO MODE: Using name from query params or fallback */}
          <span className="text-gray-400 text-sm hidden sm:block">{displayName}</span>
        </div>
      </header>

      {/* Video placeholder area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl aspect-video bg-gray-800 rounded-2xl border border-gray-700
                        flex flex-col items-center justify-center gap-4">
          <div className="flex items-center justify-center w-20 h-20 bg-gray-700 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none"
              stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
              <rect x="2" y="6" width="14" height="12" rx="2" />
            </svg>
          </div>
          <p className="text-gray-400 text-lg font-medium">Video conferencing coming soon</p>
          <p className="text-gray-500 text-sm max-w-md text-center">
            This is a placeholder for the video SDK integration. The meeting room is active and participants can join.
          </p>
        </div>
      </div>

      {/* Bottom control bar */}
      <footer className="flex items-center justify-center px-6 py-4 bg-gray-800/80 border-t border-gray-700">
        <div className="flex items-center gap-4">
          {/* Mic button (placeholder) */}
          <button type="button" disabled
            className="flex items-center justify-center w-12 h-12 bg-gray-700 rounded-full text-gray-400 cursor-not-allowed"
            aria-label="Microphone (disabled)">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </button>
          {/* Camera button (placeholder) */}
          <button type="button" disabled
            className="flex items-center justify-center w-12 h-12 bg-gray-700 rounded-full text-gray-400 cursor-not-allowed"
            aria-label="Camera (disabled)">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
              <rect x="2" y="6" width="14" height="12" rx="2" />
            </svg>
          </button>
          {/* Leave Meeting button */}
          <button id="leave-meeting-btn" type="button" onClick={handleLeave}
            className="flex items-center justify-center gap-2 px-6 h-12 bg-red-600 rounded-full text-white font-medium hover:bg-red-700 transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            Leave Meeting
          </button>
        </div>
      </footer>
    </div>
  );
}

export default RoomPage;
