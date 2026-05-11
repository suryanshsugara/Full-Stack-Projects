"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import MeetingCard from "@/components/MeetingCard";
import RecentMeetingRow from "@/components/RecentMeetingRow";
import NewMeetingModal from "@/components/NewMeetingModal";
import ScheduleModal from "@/components/ScheduleModal";
import { apiFetch } from "@/lib/api";
import type { Meeting, MeetingListResponse } from "@/types/meeting";

function VideoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}

function CalendarPlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" />
      <line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <line x1="19" x2="19" y1="16" y2="22" /><line x1="16" x2="22" y1="19" y2="19" />
    </svg>
  );
}

function JoinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y2="12" />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="p-5 bg-white rounded-xl border border-gray-200 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-16 bg-gray-200 rounded-full" />
        <div className="h-4 w-20 bg-gray-100 rounded" />
      </div>
      <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-1/2 bg-gray-100 rounded mb-4" />
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-gray-100 rounded" />
        <div className="h-9 w-20 bg-gray-200 rounded-md" />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 bg-white rounded-lg border border-gray-100 animate-pulse">
      <div className="flex-1">
        <div className="h-4 w-40 bg-gray-200 rounded mb-1.5" />
        <div className="h-3 w-28 bg-gray-100 rounded" />
      </div>
      <div className="h-5 w-16 bg-gray-200 rounded-full" />
    </div>
  );
}

function Dashboard() {
  const router = useRouter();
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const fetchUpcoming = useCallback(async () => {
    setIsLoadingUpcoming(true);
    setUpcomingError(null);
    try {
      const scheduledRes = await apiFetch<MeetingListResponse>("/api/meetings?status=scheduled");
      const inProgressRes = await apiFetch<MeetingListResponse>("/api/meetings?status=in_progress");
      setUpcomingMeetings([...inProgressRes.meetings, ...scheduledRes.meetings]);
    } catch {
      setUpcomingError("Failed to load upcoming meetings");
    } finally {
      setIsLoadingUpcoming(false);
    }
  }, []);

  const fetchRecent = useCallback(async () => {
    setIsLoadingRecent(true);
    setRecentError(null);
    try {
      const res = await apiFetch<MeetingListResponse>("/api/meetings?status=completed");
      setRecentMeetings(res.meetings);
    } catch {
      setRecentError("Failed to load recent meetings");
    } finally {
      setIsLoadingRecent(false);
    }
  }, []);

  // Fetch all meetings on mount. Dependencies are stable useCallback refs.
  useEffect(() => {
    fetchUpcoming();
    fetchRecent();
  }, [fetchUpcoming, fetchRecent]);

  function handleRefresh() {
    fetchUpcoming();
    fetchRecent();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <section className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Welcome back, Alex</h1>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button id="action-new-meeting" type="button" onClick={() => setIsNewMeetingOpen(true)}
              className="flex items-center gap-4 p-5 bg-[#0B5CFF] text-white rounded-xl hover:bg-[#0A4FE0] transition-colors cursor-pointer shadow-sm hover:shadow-md">
              <div className="flex items-center justify-center w-11 h-11 bg-white/20 rounded-lg"><VideoIcon /></div>
              <div className="text-left"><p className="font-semibold">New Meeting</p><p className="text-sm text-blue-100">Start an instant meeting</p></div>
            </button>
            <button id="action-join-meeting" type="button" onClick={() => router.push("/join")}
              className="flex items-center gap-4 p-5 bg-white text-gray-900 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm hover:shadow-md">
              <div className="flex items-center justify-center w-11 h-11 bg-[#0B5CFF]/10 rounded-lg text-[#0B5CFF]"><JoinIcon /></div>
              <div className="text-left"><p className="font-semibold">Join Meeting</p><p className="text-sm text-gray-500">Enter a meeting code</p></div>
            </button>
            <button id="action-schedule-meeting" type="button" onClick={() => setIsScheduleOpen(true)}
              className="flex items-center gap-4 p-5 bg-white text-gray-900 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm hover:shadow-md">
              <div className="flex items-center justify-center w-11 h-11 bg-[#0B5CFF]/10 rounded-lg text-[#0B5CFF]"><CalendarPlusIcon /></div>
              <div className="text-left"><p className="font-semibold">Schedule</p><p className="text-sm text-gray-500">Plan a future meeting</p></div>
            </button>
          </div>
        </section>

        {/* Upcoming Meetings */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Meetings</h2>
            {!isLoadingUpcoming && <span className="text-sm text-gray-500">{upcomingMeetings.length} meeting{upcomingMeetings.length !== 1 ? "s" : ""}</span>}
          </div>
          {isLoadingUpcoming && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>}
          {upcomingError && <div className="p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">{upcomingError}</p><button type="button" onClick={fetchUpcoming} className="mt-2 text-sm text-red-600 underline cursor-pointer">Try again</button></div>}
          {!isLoadingUpcoming && !upcomingError && upcomingMeetings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-center w-14 h-14 bg-gray-100 rounded-full mb-4 text-gray-400"><CalendarPlusIcon /></div>
              <p className="text-gray-600 font-medium">No upcoming meetings</p>
              <p className="text-sm text-gray-400 mt-1">Schedule a meeting or start an instant one</p>
            </div>
          )}
          {!isLoadingUpcoming && !upcomingError && upcomingMeetings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingMeetings.map((m) => (
                <MeetingCard key={m.id} title={m.title} meetingCode={m.meeting_code} scheduledAt={m.scheduled_at}
                  durationMinutes={m.duration_minutes} status={m.status} participantCount={m.participant_count} hostName={m.host?.name ?? null} />
              ))}
            </div>
          )}
        </section>

        {/* Recent Meetings */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Meetings</h2>
            {!isLoadingRecent && <span className="text-sm text-gray-500">{recentMeetings.length} meeting{recentMeetings.length !== 1 ? "s" : ""}</span>}
          </div>
          {isLoadingRecent && <div className="space-y-2"><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>}
          {recentError && <div className="p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">{recentError}</p><button type="button" onClick={fetchRecent} className="mt-2 text-sm text-red-600 underline cursor-pointer">Try again</button></div>}
          {!isLoadingRecent && !recentError && recentMeetings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-600 font-medium">No recent meetings</p>
              <p className="text-sm text-gray-400 mt-1">Completed meetings will appear here</p>
            </div>
          )}
          {!isLoadingRecent && !recentError && recentMeetings.length > 0 && (
            <div className="space-y-2">
              {recentMeetings.map((m) => (
                <RecentMeetingRow key={m.id} title={m.title} meetingCode={m.meeting_code} endedAt={m.ended_at}
                  startedAt={m.started_at} durationMinutes={m.duration_minutes} status={m.status} participantCount={m.participant_count} />
              ))}
            </div>
          )}
        </section>
      </main>

      <NewMeetingModal isOpen={isNewMeetingOpen} onClose={() => setIsNewMeetingOpen(false)} />
      <ScheduleModal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} onSuccess={handleRefresh} />
    </div>
  );
}

export default Dashboard;
