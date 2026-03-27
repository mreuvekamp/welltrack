import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth";
import * as symptomLogService from "../services/symptom-log-service";

interface SymptomLogRequest extends AuthRequest {
  params: { id: string };
}

const createSymptomLogSchema = z.object({
  symptom_id: z.string().uuid(),
  severity: z.number().int().min(1).max(10),
  notes: z.string().optional(),
  logged_at: z.string().datetime(),
});

const updateSymptomLogSchema = z.object({
  severity: z.number().int().min(1).max(10).optional(),
  notes: z.string().nullable().optional(),
  logged_at: z.string().datetime().optional(),
});

const querySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Returns paginated symptom logs for the authenticated user with optional date range filtering.
 */
export async function getSymptomLogs(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { startDate, endDate, limit, offset } = querySchema.parse(req.query);

    const result = await symptomLogService.getSymptomLogs({
      userId: req.userId!,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a new symptom log for the authenticated user.
 */
export async function createSymptomLog(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = createSymptomLogSchema.parse(req.body);

    const symptomLog = await symptomLogService.createSymptomLog({
      userId: req.userId!,
      symptomId: data.symptom_id,
      severity: data.severity,
      notes: data.notes,
      loggedAt: new Date(data.logged_at),
    });

    res.status(201).json({ symptom_log: symptomLog });
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
 * Updates an existing symptom log. Users can only update their own logs.
 */
export async function updateSymptomLog(
  req: SymptomLogRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = updateSymptomLogSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const symptomLog = await symptomLogService.updateSymptomLog(
      req.params.id,
      req.userId!,
      {
        severity: data.severity,
        notes: data.notes,
        loggedAt: data.logged_at ? new Date(data.logged_at) : undefined,
      }
    );

    if (!symptomLog) {
      res.status(404).json({ error: "Symptom log not found" });
      return;
    }

    res.status(200).json({ symptom_log: symptomLog });
  } catch (err) {
    next(err);
  }
}

/**
 * Deletes a symptom log. Users can only delete their own logs.
 */
export async function deleteSymptomLog(
  req: SymptomLogRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deleted = await symptomLogService.deleteSymptomLog(
      req.params.id,
      req.userId!
    );

    if (!deleted) {
      res.status(404).json({ error: "Symptom log not found" });
      return;
    }

    res.status(200).json({ message: "Symptom log deleted successfully" });
  } catch (err) {
    next(err);
  }
}
