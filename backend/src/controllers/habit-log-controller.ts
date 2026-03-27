import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth";
import * as habitLogService from "../services/habit-log-service";

interface HabitLogRequest extends AuthRequest {
  params: { id: string };
}

const createHabitLogSchema = z.object({
  habit_id: z.string().uuid(),
  value_boolean: z.boolean().optional(),
  value_numeric: z.number().optional(),
  value_duration: z.number().int().optional(),
  notes: z.string().optional(),
  logged_at: z.string().datetime(),
});

const updateHabitLogSchema = z.object({
  value_boolean: z.boolean().nullable().optional(),
  value_numeric: z.number().nullable().optional(),
  value_duration: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  logged_at: z.string().datetime().optional(),
});

const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Handles GET /api/habit-logs - returns habit logs for the authenticated user.
 * Supports optional date range filtering via startDate and endDate query params.
 */
export async function getHabitLogs(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { startDate, endDate } = dateRangeSchema.parse(req.query);

    const habitLogs = await habitLogService.getHabitLogs(req.userId!, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.status(200).json({ habit_logs: habitLogs });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/habit-logs - creates a new habit log.
 * Requires habit_id and logged_at. Value fields and notes are optional.
 */
export async function createHabitLog(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = createHabitLogSchema.parse(req.body);

    const habitLog = await habitLogService.createHabitLog({
      userId: req.userId!,
      habitId: data.habit_id,
      valueBoolean: data.value_boolean,
      valueNumeric: data.value_numeric,
      valueDuration: data.value_duration,
      notes: data.notes,
      loggedAt: new Date(data.logged_at),
    });

    res.status(201).json({ habit_log: habitLog });
  } catch (err) {
    // Handle service-level errors with status codes
    if (err instanceof Error && "statusCode" in err) {
      const statusCode = (err as Error & { statusCode: number }).statusCode;
      res.status(statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}

/**
 * Handles PATCH /api/habit-logs/:id - updates an existing habit log.
 * Returns 404 if the log doesn't exist or belongs to another user.
 */
export async function updateHabitLog(
  req: HabitLogRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = updateHabitLogSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const habitLog = await habitLogService.updateHabitLog(
      req.params.id,
      req.userId!,
      {
        valueBoolean: data.value_boolean,
        valueNumeric: data.value_numeric,
        valueDuration: data.value_duration,
        notes: data.notes,
        loggedAt: data.logged_at ? new Date(data.logged_at) : undefined,
      }
    );

    if (!habitLog) {
      res.status(404).json({ error: "Habit log not found" });
      return;
    }

    res.status(200).json({ habit_log: habitLog });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/habit-logs/:id - deletes a habit log.
 * Returns 404 if the log doesn't exist or belongs to another user.
 */
export async function deleteHabitLog(
  req: HabitLogRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deleted = await habitLogService.deleteHabitLog(
      req.params.id,
      req.userId!
    );

    if (!deleted) {
      res.status(404).json({ error: "Habit log not found" });
      return;
    }

    res.status(200).json({ message: "Habit log deleted successfully" });
  } catch (err) {
    next(err);
  }
}
