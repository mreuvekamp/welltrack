import { PrismaClient, SymptomLog } from "@prisma/client";

const prisma = new PrismaClient();

interface CreateSymptomLogData {
  userId: string;
  symptomId: string;
  severity: number;
  notes?: string;
  loggedAt: Date;
}

interface UpdateSymptomLogData {
  severity?: number;
  notes?: string | null;
  loggedAt?: Date;
}

interface GetSymptomLogsParams {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  limit: number;
  offset: number;
}

interface PaginatedResult {
  symptom_logs: SymptomLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Retrieves paginated symptom logs for a user, with optional date range filtering.
 * @param params - Query parameters including userId, date range, limit, and offset
 * @returns Paginated symptom logs ordered by logged_at descending
 */
export async function getSymptomLogs(
  params: GetSymptomLogsParams
): Promise<PaginatedResult> {
  const { userId, startDate, endDate, limit, offset } = params;

  const where: Record<string, unknown> = { user_id: userId };

  if (startDate || endDate) {
    const loggedAtFilter: Record<string, Date> = {};
    if (startDate) loggedAtFilter.gte = startDate;
    if (endDate) loggedAtFilter.lte = endDate;
    where.logged_at = loggedAtFilter;
  }

  const [symptomLogs, total] = await Promise.all([
    prisma.symptomLog.findMany({
      where,
      orderBy: { logged_at: "desc" },
      take: limit,
      skip: offset,
      include: { symptom: true },
    }),
    prisma.symptomLog.count({ where }),
  ]);

  return {
    symptom_logs: symptomLogs,
    pagination: { total, limit, offset },
  };
}

/**
 * Creates a new symptom log for the authenticated user.
 * @param data - The symptom log data including symptomId, severity, notes, and loggedAt
 * @returns The created symptom log
 * @throws Error if the symptom does not exist or is not accessible by the user
 */
export async function createSymptomLog(
  data: CreateSymptomLogData
): Promise<SymptomLog> {
  // Verify the symptom exists and belongs to the user (or is a system default)
  const symptom = await prisma.symptom.findUnique({
    where: { id: data.symptomId },
  });

  if (!symptom) {
    const error = new Error("Symptom not found");
    (error as Error & { statusCode: number }).statusCode = 404;
    throw error;
  }

  // Symptom must be a system default (user_id is null) or belong to the user
  if (symptom.user_id !== null && symptom.user_id !== data.userId) {
    const error = new Error("Symptom not found");
    (error as Error & { statusCode: number }).statusCode = 404;
    throw error;
  }

  return prisma.symptomLog.create({
    data: {
      user_id: data.userId,
      symptom_id: data.symptomId,
      severity: data.severity,
      notes: data.notes,
      logged_at: data.loggedAt,
    },
  });
}

/**
 * Updates an existing symptom log, verifying ownership.
 * @param id - The symptom log ID
 * @param userId - The ID of the authenticated user
 * @param data - The fields to update
 * @returns The updated symptom log, or null if not found/not owned
 */
export async function updateSymptomLog(
  id: string,
  userId: string,
  data: UpdateSymptomLogData
): Promise<SymptomLog | null> {
  const existing = await prisma.symptomLog.findUnique({
    where: { id },
  });

  if (!existing || existing.user_id !== userId) {
    return null;
  }

  const updateData: Record<string, unknown> = {};
  if (data.severity !== undefined) updateData.severity = data.severity;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.loggedAt !== undefined) updateData.logged_at = data.loggedAt;

  return prisma.symptomLog.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Deletes a symptom log, verifying ownership.
 * @param id - The symptom log ID
 * @param userId - The ID of the authenticated user
 * @returns True if deleted, false if not found/not owned
 */
export async function deleteSymptomLog(
  id: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.symptomLog.findUnique({
    where: { id },
  });

  if (!existing || existing.user_id !== userId) {
    return false;
  }

  await prisma.symptomLog.delete({ where: { id } });
  return true;
}
