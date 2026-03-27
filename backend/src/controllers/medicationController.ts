import { Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";

interface MedicationRequest extends AuthRequest {
  params: { id: string };
}

const prisma = new PrismaClient();

const createMedicationSchema = z.object({
  name: z.string().min(1).max(200),
  dosage: z.string().max(200).optional(),
  frequency: z.string().max(200).optional(),
});

const updateMedicationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  dosage: z.string().max(200).nullable().optional(),
  frequency: z.string().max(200).nullable().optional(),
  is_active: z.boolean().optional(),
});

/**
 * Returns all medications belonging to the authenticated user.
 * @param req - Express request with authenticated userId
 * @param res - Express response
 * @param next - Express next function for error handling
 */
export async function getMedications(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const medications = await prisma.medication.findMany({
      where: { user_id: req.userId },
      orderBy: { name: "asc" },
    });

    res.status(200).json({ medications });
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a new medication for the authenticated user.
 * @param req - Express request with authenticated userId and medication data in body
 * @param res - Express response
 * @param next - Express next function for error handling
 */
export async function createMedication(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = createMedicationSchema.parse(req.body);

    const medication = await prisma.medication.create({
      data: {
        user_id: req.userId!,
        name: data.name,
        dosage: data.dosage,
        frequency: data.frequency,
      },
    });

    res.status(201).json({ medication });
  } catch (err) {
    next(err);
  }
}

/**
 * Updates an existing medication belonging to the authenticated user.
 * @param req - Express request with medication ID in params and update data in body
 * @param res - Express response
 * @param next - Express next function for error handling
 */
export async function updateMedication(
  req: MedicationRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = updateMedicationSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const existing = await prisma.medication.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      res.status(404).json({ error: "Medication not found" });
      return;
    }

    if (existing.user_id !== req.userId) {
      res.status(404).json({ error: "Medication not found" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.dosage !== undefined) updateData.dosage = data.dosage;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const medication = await prisma.medication.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.status(200).json({ medication });
  } catch (err) {
    next(err);
  }
}

/**
 * Deletes a medication belonging to the authenticated user.
 * @param req - Express request with medication ID in params
 * @param res - Express response
 * @param next - Express next function for error handling
 */
export async function deleteMedication(
  req: MedicationRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const existing = await prisma.medication.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      res.status(404).json({ error: "Medication not found" });
      return;
    }

    if (existing.user_id !== req.userId) {
      res.status(404).json({ error: "Medication not found" });
      return;
    }

    await prisma.medication.delete({ where: { id: req.params.id } });

    res.status(200).json({ message: "Medication deleted successfully" });
  } catch (err) {
    next(err);
  }
}
