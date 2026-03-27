import { Router } from "express";
import {
  getSymptomLogs,
  createSymptomLog,
  updateSymptomLog,
  deleteSymptomLog,
} from "../controllers/symptom-log-controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", getSymptomLogs);
router.post("/", createSymptomLog);
router.patch("/:id", updateSymptomLog);
router.delete("/:id", deleteSymptomLog);

export default router;
