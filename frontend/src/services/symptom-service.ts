import api from './api';
import type {
  SymptomsResponse,
  SymptomLogsResponse,
  SymptomLogResponse,
} from '@/types';

/**
 * Fetch all symptoms (system defaults + user custom).
 */
export async function getSymptoms(): Promise<SymptomsResponse> {
  const response = await api.get<SymptomsResponse>('/symptoms');
  return response.data;
}

/**
 * Fetch symptom logs with optional date range filtering.
 * @param startDate - ISO 8601 start of range
 * @param endDate - ISO 8601 end of range
 */
export async function getSymptomLogs(
  startDate?: string,
  endDate?: string,
): Promise<SymptomLogsResponse> {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const response = await api.get<SymptomLogsResponse>('/symptom-logs', { params });
  return response.data;
}

/**
 * Create a new symptom log.
 */
export async function createSymptomLog(data: {
  symptom_id: string;
  severity: number;
  notes?: string;
  logged_at: string;
}): Promise<SymptomLogResponse> {
  const response = await api.post<SymptomLogResponse>('/symptom-logs', data);
  return response.data;
}
