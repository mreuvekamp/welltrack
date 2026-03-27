import { Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();

const createHabitSchema = z.object({
  name: z.string().min(1).max(200),
  tracking_type: z.enum(["boolean", "numeric", "duration"]),
  unit: z.string().max(100).optional(),
});

const updateHabitSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  tracking_type: z.enum(["boolean", "numeric", "duration"]).optional(),
  unit: z.string().max(100).nullable().optional(),
  is_active: z.boolean().optional(),
});

/**
 * Returns system default habits (user_id = null) and the authenticated user's custom habits.
 */
export async function getHabits(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const habits = await prisma.habit.findMany({
      where: {
        OR: [{ user_id: null }, { user_id: req.userId }],
      },
      orderBy: { name: "asc" },
    });

    res.status(200).json({ habits });
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a custom habit for the authenticated user.
 * Requires name and tracking_type. Unit is optional.
 */
export async function createHabit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = createHabitSchema.parse(req.body);

    const habit = await prisma.habit.create({
      data: {
        user_id: req.userId!,
        name: data.name,
        tracking_type: data.tracking_type,
        unit: data.unit,
      },
    });

    res.status(201).json({ habit });
  } catch (err) {
    next(err);
  }
}

/**
 * Updates a habit belonging to the authenticated user.
 * System defaults (user_id = null) cannot be modified.
 */
export async function updateHabit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = updateHabitSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const id = req.params.id as string;

    const habit = await prisma.habit.findUnique({
      where: { id },
    });

    if (!habit) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    if (habit.user_id === null) {
      res.status(403).json({ error: "Cannot modify system default habits" });
      return;
    }

    if (habit.user_id !== req.userId) {
      res.status(403).json({ error: "Not authorized to modify this habit" });
      return;
    }

    const updated = await prisma.habit.update({
      where: { id },
      data,
    });

    res.status(200).json({ habit: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Deletes a custom habit belonging to the authenticated user.
 * System defaults (user_id = null) cannot be deleted.
 */
export async function deleteHabit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;

    const habit = await prisma.habit.findUnique({
      where: { id },
    });

    if (!habit) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    if (habit.user_id === null) {
      res.status(403).json({ error: "Cannot delete system default habits" });
      return;
    }

    if (habit.user_id !== req.userId) {
      res.status(403).json({ error: "Not authorized to delete this habit" });
      return;
    }

    await prisma.habit.delete({ where: { id } });

    res.status(200).json({ message: "Habit deleted successfully" });
  } catch (err) {
    next(err);
  }
}
