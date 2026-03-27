/**
 * Shared TypeScript type definitions for WellTrack frontend.
 */

/** User profile as returned by the API */
export interface User {
  id: string;
  email: string;
  display_name: string | null;
  timezone: string;
}

/** API response shape for auth endpoints (login, register) */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/** API error response shape */
export interface ApiError {
  error: string;
}
