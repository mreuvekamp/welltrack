import { PrismaClient, MoodLog } from "@prisma/client";

const prisma = new PrismaClient();

interface CreateMoodLogData {
  mood_score: number;
  energy_level?: number;
  stress_level?: number;
  notes?: string;
  logged_at: string;
}

interface UpdateMoodLogData {
  mood_score?: number;
  energy_level?: number | null;
  stress_level?: number | null;
  notes?: string | null;
  logged_at?: string;
}

interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

/**
 * Retrieves mood logs for a user, optionally filtered by date range.
 * Results are ordered by logged_at descending (most recent first).
 * @param userId - The ID of the user whose logs to retrieve
 * @param filter - Optional date range filter with startDate and endDate
 * @returns Array of mood logs matching the criteria
 */
export async function getMoodLogs(
  userId: string,
  filter: DateRangeFilter
): Promise<MoodLog[]> {
  const where: Record<string, unknown> = { user_id: userId };

  if (filter.startDate || filter.endDate) {
    const loggedAtFilter: Record<string, Date> = {};
    if (filter.startDate) loggedAtFilter.gte = new Date(filter.startDate);
    if (filter.endDate) loggedAtFilter.lte = new Date(filter.endDate);
    where.logged_at = loggedAtFilter;
  }

  return prisma.moodLog.findMany({
    where,
    orderBy: { logged_at: "desc" },
  });
}

/**
 * Creates a new mood log for the authenticated user.
 * @param userId - The ID of the user creating the log
 * @param data - The mood log data including mood_score (1-5) and optional fields
 * @returns The created mood log
 */
export async function createMoodLog(
  userId: string,
  data: CreateMoodLogData
): Promise<MoodLog> {
  return prisma.moodLog.create({
    data: {
      user_id: userId,
      mood_score: data.mood_score,
      energy_level: data.energy_level,
      stress_level: data.stress_level,
      notes: data.notes,
      logged_at: new Date(data.logged_at),
    },
  });
}

/**
 * Updates an existing mood log. Only the owner can update their logs.
 * @param id - The ID of the mood log to update
 * @param userId - The ID of the user requesting the update (for ownership check)
 * @param data - The fields to update
 * @returns The updated mood log, or null if not found or not owned by the user
 */
export async function updateMoodLog(
  id: string,
  userId: string,
  data: UpdateMoodLogData
): Promise<MoodLog | null> {
  const existing = await prisma.moodLog.findUnique({
    where: { id },
  });

  if (!existing || existing.user_id !== userId) {
    return null;
  }

  const updateData: Record<string, unknown> = {};
  if (data.mood_score !== undefined) updateData.mood_score = data.mood_score;
  if (data.energy_level !== undefined) updateData.energy_level = data.energy_level;
  if (data.stress_level !== undefined) updateData.stress_level = data.stress_level;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.logged_at !== undefined) updateData.logged_at = new Date(data.logged_at);

  return prisma.moodLog.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Deletes a mood log. Only the owner can delete their logs.
 * @param id - The ID of the mood log to delete
 * @param userId - The ID of the user requesting the deletion (for ownership check)
 * @returns True if deleted, false if not found or not owned by the user
 */
export async function deleteMoodLog(
  id: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.moodLog.findUnique({
    where: { id },
  });

  if (!existing || existing.user_id !== userId) {
    return false;
  }

  await prisma.moodLog.delete({ where: { id } });
  return true;
}
