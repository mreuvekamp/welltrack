import api from './api';
import type { HabitsResponse, HabitLogsResponse, HabitLogResponse } from '@/types';

/**
 * Fetch all habits (system defaults + user custom).
 */
export async function getHabits(): Promise<HabitsResponse> {
  const response = await api.get<HabitsResponse>('/habits');
  return response.data;
}

/**
 * Fetch habit logs with optional date range filtering.
 * @param startDate - ISO 8601 start of range
 * @param endDate - ISO 8601 end of range
 */
export async function getHabitLogs(
  startDate?: string,
  endDate?: string,
): Promise<HabitLogsResponse> {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const response = await api.get<HabitLogsResponse>('/habit-logs', { params });
  return response.data;
}

/**
 * Create a new habit log.
 */
export async function createHabitLog(data: {
  habit_id: string;
  value_boolean?: boolean;
  value_numeric?: number;
  value_duration?: number;
  notes?: string;
  logged_at: string;
}): Promise<HabitLogResponse> {
  const response = await api.post<HabitLogResponse>('/habit-logs', data);
  return response.data;
}
