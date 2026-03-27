import { PrismaClient, HabitLog } from "@prisma/client";

const prisma = new PrismaClient();

interface CreateHabitLogData {
  userId: string;
  habitId: string;
  valueBoolean?: boolean;
  valueNumeric?: number;
  valueDuration?: number;
  notes?: string;
  loggedAt: Date;
}

interface UpdateHabitLogData {
  valueBoolean?: boolean | null;
  valueNumeric?: number | null;
  valueDuration?: number | null;
  notes?: string | null;
  loggedAt?: Date;
}

interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Retrieves habit logs for a user, with optional date range filtering.
 * Results are ordered by logged_at descending (most recent first).
 * @param userId - The ID of the user whose logs to retrieve
 * @param filter - Optional date range filter
 * @returns Array of habit logs with related habit details
 */
export async function getHabitLogs(
  userId: string,
  filter: DateRangeFilter
): Promise<HabitLog[]> {
  const where: Record<string, unknown> = { user_id: userId };

  if (filter.startDate || filter.endDate) {
    const loggedAtFilter: Record<string, Date> = {};
    if (filter.startDate) loggedAtFilter.gte = filter.startDate;
    if (filter.endDate) loggedAtFilter.lte = filter.endDate;
    where.logged_at = loggedAtFilter;
  }

  return prisma.habitLog.findMany({
    where,
    orderBy: { logged_at: "desc" },
    include: { habit: true },
  });
}

/**
 * Creates a new habit log for the authenticated user.
 * Validates that the habit exists and is accessible (system default or user's own).
 * @param data - The habit log data
 * @returns The created habit log
 * @throws Error with statusCode 404 if habit not found or not accessible
 */
export async function createHabitLog(
  data: CreateHabitLogData
): Promise<HabitLog> {
  // Verify the habit exists and is accessible by the user
  const habit = await prisma.habit.findUnique({
    where: { id: data.habitId },
  });

  if (!habit) {
    const error = new Error("Habit not found");
    (error as Error & { statusCode: number }).statusCode = 404;
    throw error;
  }

  // Habit must be a system default (user_id is null) or belong to the user
  if (habit.user_id !== null && habit.user_id !== data.userId) {
    const error = new Error("Habit not found");
    (error as Error & { statusCode: number }).statusCode = 404;
    throw error;
  }

  return prisma.habitLog.create({
    data: {
      user_id: data.userId,
      habit_id: data.habitId,
      value_boolean: data.valueBoolean ?? null,
      value_numeric: data.valueNumeric ?? null,
      value_duration: data.valueDuration ?? null,
      notes: data.notes,
      logged_at: data.loggedAt,
    },
  });
}

/**
 * Updates an existing habit log, verifying ownership.
 * @param id - The habit log ID
 * @param userId - The ID of the authenticated user
 * @param data - The fields to update
 * @returns The updated habit log, or null if not found/not owned
 */
export async function updateHabitLog(
  id: string,
  userId: string,
  data: UpdateHabitLogData
): Promise<HabitLog | null> {
  const existing = await prisma.habitLog.findUnique({
    where: { id },
  });

  if (!existing || existing.user_id !== userId) {
    return null;
  }

  const updateData: Record<string, unknown> = {};
  if (data.valueBoolean !== undefined) updateData.value_boolean = data.valueBoolean;
  if (data.valueNumeric !== undefined) updateData.value_numeric = data.valueNumeric;
  if (data.valueDuration !== undefined) updateData.value_duration = data.valueDuration;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.loggedAt !== undefined) updateData.logged_at = data.loggedAt;

  return prisma.habitLog.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Deletes a habit log, verifying ownership.
 * @param id - The habit log ID
 * @param userId - The ID of the authenticated user
 * @returns True if deleted, false if not found/not owned
 */
export async function deleteHabitLog(
  id: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.habitLog.findUnique({
    where: { id },
  });

  if (!existing || existing.user_id !== userId) {
    return false;
  }

  await prisma.habitLog.delete({ where: { id } });
  return true;
}
