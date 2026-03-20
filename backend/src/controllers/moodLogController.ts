import { Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";

interface MoodLogRequest extends AuthRequest {
  params: { id: string };
}

const prisma = new PrismaClient();

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

export async function getMoodLogs(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { startDate, endDate } = dateRangeSchema.parse(req.query);

    const where: Record<string, unknown> = { user_id: req.userId };

    if (startDate || endDate) {
      const loggedAtFilter: Record<string, Date> = {};
      if (startDate) loggedAtFilter.gte = new Date(startDate);
      if (endDate) loggedAtFilter.lte = new Date(endDate);
      where.logged_at = loggedAtFilter;
    }

    const moodLogs = await prisma.moodLog.findMany({
      where,
      orderBy: { logged_at: "desc" },
    });

    res.status(200).json({ mood_logs: moodLogs });
  } catch (err) {
    next(err);
  }
}

export async function createMoodLog(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = createMoodLogSchema.parse(req.body);

    const moodLog = await prisma.moodLog.create({
      data: {
        user_id: req.userId!,
        mood_score: data.mood_score,
        energy_level: data.energy_level,
        stress_level: data.stress_level,
        notes: data.notes,
        logged_at: new Date(data.logged_at),
      },
    });

    res.status(201).json({ mood_log: moodLog });
  } catch (err) {
    next(err);
  }
}

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

    const existing = await prisma.moodLog.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      res.status(404).json({ error: "Mood log not found" });
      return;
    }

    if (existing.user_id !== req.userId) {
      res.status(404).json({ error: "Mood log not found" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (data.mood_score !== undefined) updateData.mood_score = data.mood_score;
    if (data.energy_level !== undefined) updateData.energy_level = data.energy_level;
    if (data.stress_level !== undefined) updateData.stress_level = data.stress_level;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.logged_at !== undefined) updateData.logged_at = new Date(data.logged_at);

    const moodLog = await prisma.moodLog.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.status(200).json({ mood_log: moodLog });
  } catch (err) {
    next(err);
  }
}

export async function deleteMoodLog(
  req: MoodLogRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const existing = await prisma.moodLog.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      res.status(404).json({ error: "Mood log not found" });
      return;
    }

    if (existing.user_id !== req.userId) {
      res.status(404).json({ error: "Mood log not found" });
      return;
    }

    await prisma.moodLog.delete({ where: { id: req.params.id } });

    res.status(200).json({ message: "Mood log deleted successfully" });
  } catch (err) {
    next(err);
  }
}
