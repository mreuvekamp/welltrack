/**
 * Shared TypeScript type definitions for WellTrack frontend.
 * Types mirror backend Prisma models for type safety across the stack.
 */

// ─── User ───────────────────────────────────────────────────────────────────

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

// ─── Symptoms ───────────────────────────────────────────────────────────────

/** Symptom definition (system default or user-created) */
export interface Symptom {
  id: string;
  user_id: string | null;
  name: string;
  category: string;
  is_active: boolean;
}

/** A single symptom log entry */
export interface SymptomLog {
  id: string;
  user_id: string;
  symptom_id: string;
  severity: number;
  notes: string | null;
  logged_at: string;
  created_at: string;
  symptom?: Symptom;
}

// ─── Mood ───────────────────────────────────────────────────────────────────

/** A single mood log entry */
export interface MoodLog {
  id: string;
  user_id: string;
  mood_score: number;
  energy_level: number | null;
  stress_level: number | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
}

// ─── Medications ────────────────────────────────────────────────────────────

/** Medication definition belonging to a user */
export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  is_active: boolean;
  created_at: string;
}

/** A single medication log entry */
export interface MedicationLog {
  id: string;
  user_id: string;
  medication_id: string;
  taken: boolean;
  taken_at: string | null;
  notes: string | null;
  created_at: string;
  medication?: Medication;
}

// ─── Habits ─────────────────────────────────────────────────────────────────

/** Tracking type for habits, matching backend enum */
export type TrackingType = 'boolean' | 'numeric' | 'duration';

/** Habit definition (system default or user-created) */
export interface Habit {
  id: string;
  user_id: string | null;
  name: string;
  tracking_type: TrackingType;
  unit: string | null;
  is_active: boolean;
}

/** A single habit log entry */
export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  value_boolean: boolean | null;
  value_numeric: number | null;
  value_duration: number | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
  habit?: Habit;
}

// ─── API Response Wrappers ──────────────────────────────────────────────────

/** Pagination metadata returned by paginated endpoints */
export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

/** Generic paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/** API response wrappers matching backend response shapes */
export interface SymptomsResponse {
  symptoms: Symptom[];
}

export interface SymptomLogResponse {
  symptom_log: SymptomLog;
}

export interface SymptomLogsResponse {
  symptom_logs: SymptomLog[];
  pagination: Pagination;
}

export interface MoodLogResponse {
  mood_log: MoodLog;
}

export interface MoodLogsResponse {
  mood_logs: MoodLog[];
}

export interface MedicationsResponse {
  medications: Medication[];
}

export interface MedicationLogResponse {
  medication_log: MedicationLog;
}

export interface MedicationLogsResponse {
  medication_logs: MedicationLog[];
}

export interface HabitsResponse {
  habits: Habit[];
}

export interface HabitLogResponse {
  habit_log: HabitLog;
}

export interface HabitLogsResponse {
  habit_logs: HabitLog[];
}
