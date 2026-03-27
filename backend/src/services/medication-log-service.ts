import { PrismaClient, MedicationLog } from "@prisma/client";

const prisma = new PrismaClient();

interface CreateMedicationLogData {
  userId: string;
  medicationId: string;
  taken: boolean;
  takenAt?: string;
  notes?: string;
}

interface UpdateMedicationLogData {
  taken?: boolean;
  takenAt?: string | null;
  notes?: string | null;
}

interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

/**
 * Retrieves medication logs for a user, optionally filtered by date range.
 * Results are ordered by created_at descending (most recent first).
 * @param userId - The ID of the user whose logs to retrieve
 * @param filter - Optional date range filter with startDate and endDate
 * @returns Array of medication logs matching the criteria
 */
export async function getMedicationLogs(
  userId: string,
  filter: DateRangeFilter
): Promise<MedicationLog[]> {
  const where: Record<string, unknown> = { user_id: userId };

  if (filter.startDate || filter.endDate) {
    const createdAtFilter: Record<string, Date> = {};
    if (filter.startDate) createdAtFilter.gte = new Date(filter.startDate);
    if (filter.endDate) createdAtFilter.lte = new Date(filter.endDate);
    where.created_at = createdAtFilter;
  }

  return prisma.medicationLog.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: { medication: true },
  });
}

/**
 * Creates a new medication log for the authenticated user.
 * Validates that the medication exists and belongs to the user.
 * @param data - The medication log data
 * @returns The created medication log
 * @throws Error with statusCode 404 if medication not found or not owned by user
 */
export async function createMedicationLog(
  data: CreateMedicationLogData
): Promise<MedicationLog> {
  // Verify the medication exists and belongs to the user
  const medication = await prisma.medication.findUnique({
    where: { id: data.medicationId },
  });

  if (!medication) {
    const error = new Error("Medication not found");
    (error as Error & { statusCode: number }).statusCode = 404;
    throw error;
  }

  if (medication.user_id !== data.userId) {
    const error = new Error("Medication not found");
    (error as Error & { statusCode: number }).statusCode = 404;
    throw error;
  }

  return prisma.medicationLog.create({
    data: {
      user_id: data.userId,
      medication_id: data.medicationId,
      taken: data.taken,
      taken_at: data.takenAt ? new Date(data.takenAt) : null,
      notes: data.notes,
    },
  });
}

/**
 * Updates an existing medication log, verifying ownership.
 * @param id - The medication log ID
 * @param userId - The ID of the authenticated user
 * @param data - The fields to update
 * @returns The updated medication log, or null if not found/not owned
 */
export async function updateMedicationLog(
  id: string,
  userId: string,
  data: UpdateMedicationLogData
): Promise<MedicationLog | null> {
  const existing = await prisma.medicationLog.findUnique({
    where: { id },
  });

  if (!existing || existing.user_id !== userId) {
    return null;
  }

  const updateData: Record<string, unknown> = {};
  if (data.taken !== undefined) updateData.taken = data.taken;
  if (data.takenAt !== undefined)
    updateData.taken_at = data.takenAt ? new Date(data.takenAt) : null;
  if (data.notes !== undefined) updateData.notes = data.notes;

  return prisma.medicationLog.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Deletes a medication log, verifying ownership.
 * @param id - The medication log ID
 * @param userId - The ID of the authenticated user
 * @returns True if deleted, false if not found/not owned
 */
export async function deleteMedicationLog(
  id: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.medicationLog.findUnique({
    where: { id },
  });

  if (!existing || existing.user_id !== userId) {
    return false;
  }

  await prisma.medicationLog.delete({ where: { id } });
  return true;
}
