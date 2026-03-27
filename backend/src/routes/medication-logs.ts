import { Router } from "express";
import {
  getMedicationLogs,
  createMedicationLog,
  updateMedicationLog,
  deleteMedicationLog,
} from "../controllers/medication-log-controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", getMedicationLogs);
router.post("/", createMedicationLog);
router.patch("/:id", updateMedicationLog);
router.delete("/:id", deleteMedicationLog);

export default router;
