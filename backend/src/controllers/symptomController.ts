import { Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();

const createSymptomSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
});

const updateSymptomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
});

export async function getSymptoms(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const symptoms = await prisma.symptom.findMany({
      where: {
        OR: [{ user_id: null }, { user_id: req.userId }],
      },
      orderBy: { name: "asc" },
    });

    res.status(200).json({ symptoms });
  } catch (err) {
    next(err);
  }
}

export async function createSymptom(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = createSymptomSchema.parse(req.body);

    const symptom = await prisma.symptom.create({
      data: {
        user_id: req.userId!,
        name: data.name,
        category: data.category,
      },
    });

    res.status(201).json({ symptom });
  } catch (err) {
    next(err);
  }
}

export async function updateSymptom(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = updateSymptomSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const id = req.params.id as string;

    const symptom = await prisma.symptom.findUnique({
      where: { id },
    });

    if (!symptom) {
      res.status(404).json({ error: "Symptom not found" });
      return;
    }

    if (symptom.user_id === null) {
      res.status(403).json({ error: "Cannot modify system default symptoms" });
      return;
    }

    if (symptom.user_id !== req.userId) {
      res.status(403).json({ error: "Not authorized to modify this symptom" });
      return;
    }

    const updated = await prisma.symptom.update({
      where: { id },
      data,
    });

    res.status(200).json({ symptom: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteSymptom(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;

    const symptom = await prisma.symptom.findUnique({
      where: { id },
    });

    if (!symptom) {
      res.status(404).json({ error: "Symptom not found" });
      return;
    }

    if (symptom.user_id === null) {
      res.status(403).json({ error: "Cannot delete system default symptoms" });
      return;
    }

    if (symptom.user_id !== req.userId) {
      res.status(403).json({ error: "Not authorized to delete this symptom" });
      return;
    }

    await prisma.symptom.delete({ where: { id } });

    res.status(200).json({ message: "Symptom deleted successfully" });
  } catch (err) {
    next(err);
  }
}
