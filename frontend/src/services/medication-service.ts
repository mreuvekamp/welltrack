import api from './api';
import type {
  MedicationsResponse,
  MedicationLogsResponse,
  MedicationLogResponse,
} from '@/types';

/**
 * Fetch all medications belonging to the authenticated user.
 */
export async function getMedications(): Promise<MedicationsResponse> {
  const response = await api.get<MedicationsResponse>('/medications');
  return response.data;
}

/**
 * Fetch medication logs with optional date range filtering.
 * @param startDate - ISO 8601 start of range
 * @param endDate - ISO 8601 end of range
 */
export async function getMedicationLogs(
  startDate?: string,
  endDate?: string,
): Promise<MedicationLogsResponse> {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const response = await api.get<MedicationLogsResponse>('/medication-logs', { params });
  return response.data;
}

/**
 * Create a new medication log.
 */
export async function createMedicationLog(data: {
  medication_id: string;
  taken: boolean;
  taken_at?: string;
  notes?: string;
}): Promise<MedicationLogResponse> {
  const response = await api.post<MedicationLogResponse>('/medication-logs', data);
  return response.data;
}
