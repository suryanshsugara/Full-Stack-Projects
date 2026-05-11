/**
 * lib/api.ts — Centralized API fetch wrapper.
 *
 * Every API call in the frontend goes through `apiFetch()`.
 * This keeps the base URL, headers, error handling, and JSON parsing
 * in one place instead of duplicating fetch() logic in every component.
 */

// Base URL for the FastAPI backend.
// In development this points to localhost:8000.
// In production, set the NEXT_PUBLIC_API_URL environment variable.
const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Custom error class for API failures.
 * Carries the HTTP status code and the server's error message
 * so callers can show meaningful error UI instead of generic "fetch failed".
 */
export class ApiError extends Error {
  status: number;   // HTTP status code (e.g., 404, 422, 500)
  detail: string;   // Error message from the server's JSON response

  constructor(status: number, detail: string) {
    super(detail);          // Set the standard Error.message property
    this.name = "ApiError"; // Override the default "Error" name
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Typed fetch wrapper for all API calls.
 *
 * @param path    - The API path (e.g., "/api/meetings"). Will be appended to API_BASE_URL.
 * @param options - Standard fetch RequestInit options (method, body, headers, etc.)
 * @returns       - The parsed JSON response, typed as T.
 * @throws        - ApiError if the response status is not OK (2xx).
 *
 * Usage:
 *   const meetings = await apiFetch<MeetingListResponse>("/api/meetings");
 *   const meeting = await apiFetch<MeetingResponse>("/api/meetings", {
 *     method: "POST",
 *     body: JSON.stringify({ title: "Sprint Planning" }),
 *   });
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Build the full URL by combining base + path
  const url = `${API_BASE_URL}${path}`;

  // Merge caller-provided headers with our default Content-Type header.
  // The spread operator lets callers override Content-Type if needed.
  const headers: HeadersInit = {
    "Content-Type": "application/json",  // Default: we send JSON
    ...options.headers,                  // Caller can override or add headers
  };

  // Execute the fetch request with merged options
  const response = await fetch(url, {
    ...options,   // Spread all caller options (method, body, signal, etc.)
    headers,      // Use our merged headers
  });

  // If the response status is not 2xx, throw an ApiError
  if (!response.ok) {
    // Try to parse the error body — FastAPI returns { "detail": "..." }
    let detail = `Request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      // FastAPI's HTTPException always returns { "detail": "message" }
      detail = errorBody.detail || detail;
    } catch {
      // If the error body isn't JSON (e.g., 502 from a proxy), use the default message
    }
    throw new ApiError(response.status, detail);
  }

  // For 204 No Content responses, there's no body to parse
  if (response.status === 204) {
    return undefined as T;
  }

  // Parse and return the JSON body, cast to the expected type
  const data: T = await response.json();
  return data;
}
