/**
 * app/join/page.tsx — Join a meeting by entering its code.
 *
 * Two-step flow on the same page:
 *   Step 1: Enter meeting code → validates with GET /api/meetings/code/{code}
 *   Step 2: Enter display name → joins with POST /api/meetings/code/{code}/join
 *
 * NO AUTH – DEMO MODE: Display name is pre-filled with "Alex Johnson".
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { apiFetch, ApiError } from "@/lib/api";
import type { Meeting } from "@/types/meeting";

// NO AUTH – DEMO MODE
const DEMO_DISPLAY_NAME = "Alex Johnson";

function JoinPage() {
  const router = useRouter();

  // Step tracking: 1 = enter code, 2 = enter name + join
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [meetingCode, setMeetingCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Step 2 state
  const [validatedMeeting, setValidatedMeeting] = useState<Meeting | null>(null);
  const [displayName, setDisplayName] = useState(DEMO_DISPLAY_NAME); // NO AUTH – DEMO MODE
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  /** Step 1: Validate the meeting code by calling GET /api/meetings/code/{code} */
  async function handleValidateCode() {
    const trimmed = meetingCode.trim();
    if (!trimmed) {
      setCodeError("Please enter a meeting code");
      return;
    }

    setIsValidating(true);
    setCodeError(null);

    try {
      const meeting = await apiFetch<Meeting>(`/api/meetings/code/${trimmed}`);
      setValidatedMeeting(meeting);
      setStep(2);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setCodeError("No meeting found with this ID");
      } else {
        setCodeError("Failed to validate meeting code. Please try again.");
      }
    } finally {
      setIsValidating(false);
    }
  }

  /** Step 2: Join the meeting by calling POST /api/meetings/code/{code}/join */
  async function handleJoin() {
    if (!validatedMeeting) return;

    setIsJoining(true);
    setJoinError(null);

    try {
      await apiFetch<Meeting>(`/api/meetings/code/${validatedMeeting.meeting_code}/join`, {
        method: "POST",
      });
      router.push(`/room/${validatedMeeting.meeting_code}?name=${encodeURIComponent(displayName)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setJoinError(err.detail);
      } else {
        setJoinError("Failed to join meeting. Please try again.");
      }
    } finally {
      setIsJoining(false);
    }
  }

  /** Go back to Step 1 */
  function handleBack() {
    setStep(1);
    setValidatedMeeting(null);
    setJoinError(null);
  }

  /** Handle Enter key on the code input */
  function handleCodeKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleValidateCode();
  }

  /** Handle Enter key on the display name input */
  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleJoin();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          {/* Step 1: Enter meeting code */}
          {step === 1 && (
            <>
              <div className="text-center mb-8">
                <div className="flex items-center justify-center w-14 h-14 bg-[#0B5CFF]/10 rounded-full mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                    fill="none" stroke="#0B5CFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y2="12" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Join a Meeting</h1>
                <p className="text-sm text-gray-500 mt-1">Enter the meeting code to continue</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="meeting-code-input" className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Code
                  </label>
                  <input id="meeting-code-input" type="text" value={meetingCode}
                    onChange={(e) => setMeetingCode(e.target.value)} onKeyDown={handleCodeKeyDown}
                    placeholder="e.g., abc-defg-hij"
                    className={`w-full px-3 py-2.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5CFF]/30 focus:border-[#0B5CFF] transition-colors
                      ${codeError ? "border-red-300 bg-red-50" : "border-gray-300"}`} />
                  {codeError && <p className="text-xs text-red-600 mt-1">{codeError}</p>}
                </div>

                <button id="validate-code-btn" type="button" onClick={handleValidateCode} disabled={isValidating}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#0B5CFF] rounded-md hover:bg-[#0A4FE0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2">
                  {isValidating && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isValidating ? "Validating..." : "Continue"}
                </button>
              </div>

              <div className="mt-6 text-center">
                <button type="button" onClick={() => router.push("/")}
                  className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
                  ← Back to Dashboard
                </button>
              </div>
            </>
          )}

          {/* Step 2: Enter display name + join */}
          {step === 2 && validatedMeeting && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-xl font-semibold text-gray-900">Ready to join?</h1>
                <p className="text-sm text-gray-500 mt-1">You&apos;re joining: <span className="font-medium text-gray-700">{validatedMeeting.title}</span></p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Meeting Code</span>
                  <span className="font-mono text-gray-700">{validatedMeeting.meeting_code}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium ${validatedMeeting.status === "in_progress" ? "text-green-600" : "text-blue-600"}`}>
                    {validatedMeeting.status === "in_progress" ? "Live" : validatedMeeting.status === "scheduled" ? "Scheduled" : "Completed"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-500">Participants</span>
                  <span className="text-gray-700">{validatedMeeting.participant_count}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  {/* NO AUTH – DEMO MODE: Display name pre-filled */}
                  <label htmlFor="display-name-input" className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input id="display-name-input" type="text" value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)} onKeyDown={handleNameKeyDown}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5CFF]/30 focus:border-[#0B5CFF] transition-colors" />
                </div>

                {joinError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{joinError}</p>
                  </div>
                )}

                <button id="join-now-btn" type="button" onClick={handleJoin} disabled={isJoining || !displayName.trim()}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#0B5CFF] rounded-md hover:bg-[#0A4FE0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2">
                  {isJoining && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isJoining ? "Joining..." : "Join Now"}
                </button>

                <button type="button" onClick={handleBack}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer">
                  ← Back
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default JoinPage;
