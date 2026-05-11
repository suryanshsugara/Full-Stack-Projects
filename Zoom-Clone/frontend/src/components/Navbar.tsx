/**
 * components/Navbar.tsx — Sticky top navigation bar.
 *
 * Matches Zoom's clean design:
 *   - Left: Zoom logo (text-based)
 *   - Right: User avatar initial + settings icon
 *
 * NO AUTH – DEMO MODE: The user is always "Alex Johnson" (DEFAULT_USER).
 * There is no login/logout — this is a demo application.
 */

"use client";

// ---------------------------------------------------------------------------
// Props interface
// ---------------------------------------------------------------------------
// No props needed — the navbar is static (demo mode, no auth).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// NO AUTH – DEMO MODE
// The user name and initial are hardcoded. In a real app, these would
// come from an auth context (JWT, session, etc.).
// ---------------------------------------------------------------------------
const DEMO_USER_NAME = "Alex Johnson";     // NO AUTH – DEMO MODE
const DEMO_USER_INITIAL = "A";             // NO AUTH – DEMO MODE

// ---------------------------------------------------------------------------
// SVG Icons (inline to avoid dependencies)
// ---------------------------------------------------------------------------

/** Simple settings/gear icon */
function SettingsIcon() {
  return (
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
      className="text-gray-500"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function Navbar() {
  return (
    <nav
      id="main-navbar"
      className="sticky top-0 z-50 flex items-center justify-between
                 h-16 px-6 bg-white border-b border-gray-200
                 shadow-sm"
    >
      {/* Left: Zoom logo */}
      <a href="/" className="flex items-center gap-2 no-underline">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0B5CFF]">
          <span className="text-white font-bold text-sm">Z</span>
        </div>
        <span className="text-xl font-bold text-gray-900 tracking-tight">
          Zoom
        </span>
      </a>

      {/* Right: User avatar + settings */}
      <div className="flex items-center gap-4">
        {/* Settings button */}
        <button
          id="settings-button"
          type="button"
          className="flex items-center justify-center w-9 h-9 rounded-full
                     hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Settings"
        >
          <SettingsIcon />
        </button>

        {/* User avatar + name — NO AUTH – DEMO MODE */}
        <div className="flex items-center gap-2">
          <div
            id="user-avatar"
            className="flex items-center justify-center w-9 h-9 rounded-full
                       bg-[#0B5CFF] text-white text-sm font-semibold
                       select-none"
          >
            {DEMO_USER_INITIAL}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {DEMO_USER_NAME}
          </span>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
