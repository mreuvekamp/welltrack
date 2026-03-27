import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth";
import * as moodLogService from "../services/mood-log-service";

interface MoodLogRequest extends AuthRequest {
  params: { id: string };
}

const createMoodLogSchema = z.object({
  mood_score: z.number().int().min(1).max(5),
  energy_level: z.number().int().min(1).max(5).optional(),
  stress_level: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  logged_at: z.string().datetime(),
});

const updateMoodLogSchema = z.object({
  mood_score: z.number().int().min(1).max(5).optional(),
  energy_level: z.number().int().min(1).max(5).nullable().optional(),
  stress_level: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  logged_at: z.string().datetime().optional(),
});

const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Handles GET /api/mood-logs - returns mood logs for the authenticated user.
 * Supports optional date range filtering via startDate and endDate query params.
 */
export async function getMoodLogs(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filter = dateRangeSchema.parse(req.query);
    const moodLogs = await moodLogService.getMoodLogs(req.userId!, filter);
    res.status(200).json({ mood_logs: moodLogs });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/mood-logs - creates a new mood log.
 * Requires mood_score (1-5) and logged_at. Energy, stress, and notes are optional.
 */
export async function createMoodLog(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = createMoodLogSchema.parse(req.body);
    const moodLog = await moodLogService.createMoodLog(req.userId!, data);
    res.status(201).json({ mood_log: moodLog });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /api/mood-logs/:id - updates an existing mood log.
 * Returns 404 if the log doesn't exist or belongs to another user.
 */
export async function updateMoodLog(
  req: MoodLogRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = updateMoodLogSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const moodLog = await moodLogService.updateMoodLog(
      req.params.id,
      req.userId!,
      data
    );

    if (!moodLog) {
      res.status(404).json({ error: "Mood log not found" });
      return;
    }

    res.status(200).json({ mood_log: moodLog });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/mood-logs/:id - deletes a mood log.
 * Returns 404 if the log doesn't exist or belongs to another user.
 */
export async function deleteMoodLog(
  req: MoodLogRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deleted = await moodLogService.deleteMoodLog(req.params.id, req.userId!);

    if (!deleted) {
      res.status(404).json({ error: "Mood log not found" });
      return;
    }

    res.status(200).json({ message: "Mood log deleted successfully" });
  } catch (err) {
    next(err);
  }
}
