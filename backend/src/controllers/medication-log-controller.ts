import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth";
import * as medicationLogService from "../services/medication-log-service";

interface MedicationLogRequest extends AuthRequest {
  params: { id: string };
}

const createMedicationLogSchema = z.object({
  medication_id: z.string().uuid(),
  taken: z.boolean(),
  taken_at: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const updateMedicationLogSchema = z.object({
  taken: z.boolean().optional(),
  taken_at: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Handles GET /api/medication-logs - returns medication logs for the authenticated user.
 * Supports optional date range filtering via startDate and endDate query params.
 */
export async function getMedicationLogs(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filter = dateRangeSchema.parse(req.query);
    const medicationLogs = await medicationLogService.getMedicationLogs(
      req.userId!,
      filter
    );
    res.status(200).json({ medication_logs: medicationLogs });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/medication-logs - creates a new medication log.
 * Requires medication_id and taken (boolean). taken_at and notes are optional.
 */
export async function createMedicationLog(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = createMedicationLogSchema.parse(req.body);

    const medicationLog = await medicationLogService.createMedicationLog({
      userId: req.userId!,
      medicationId: data.medication_id,
      taken: data.taken,
      takenAt: data.taken_at,
      notes: data.notes,
    });

    res.status(201).json({ medication_log: medicationLog });
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
 * Handles PATCH /api/medication-logs/:id - updates an existing medication log.
 * Returns 404 if the log doesn't exist or belongs to another user.
 */
export async function updateMedicationLog(
  req: MedicationLogRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = updateMedicationLogSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const medicationLog = await medicationLogService.updateMedicationLog(
      req.params.id,
      req.userId!,
      {
        taken: data.taken,
        takenAt: data.taken_at,
        notes: data.notes,
      }
    );

    if (!medicationLog) {
      res.status(404).json({ error: "Medication log not found" });
      return;
    }

    res.status(200).json({ medication_log: medicationLog });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/medication-logs/:id - deletes a medication log.
 * Returns 404 if the log doesn't exist or belongs to another user.
 */
export async function deleteMedicationLog(
  req: MedicationLogRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deleted = await medicationLogService.deleteMedicationLog(
      req.params.id,
      req.userId!
    );

    if (!deleted) {
      res.status(404).json({ error: "Medication log not found" });
      return;
    }

    res.status(200).json({ message: "Medication log deleted successfully" });
  } catch (err) {
    next(err);
  }
}
