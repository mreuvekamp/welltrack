import api from './api';
import type { MoodLogsResponse, MoodLogResponse } from '@/types';

/**
 * Fetch mood logs with optional date range filtering.
 * @param startDate - ISO 8601 start of range
 * @param endDate - ISO 8601 end of range
 */
export async function getMoodLogs(
  startDate?: string,
  endDate?: string,
): Promise<MoodLogsResponse> {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const response = await api.get<MoodLogsResponse>('/mood-logs', { params });
  return response.data;
}

/**
 * Create a new mood log.
 */
export async function createMoodLog(data: {
  mood_score: number;
  energy_level?: number;
  stress_level?: number;
  notes?: string;
  logged_at: string;
}): Promise<MoodLogResponse> {
  const response = await api.post<MoodLogResponse>('/mood-logs', data);
  return response.data;
}
