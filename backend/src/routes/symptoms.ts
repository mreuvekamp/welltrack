import { Router } from "express";
import {
  getSymptoms,
  createSymptom,
  updateSymptom,
  deleteSymptom,
} from "../controllers/symptomController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", getSymptoms);
router.post("/", createSymptom);
router.patch("/:id", updateSymptom);
router.delete("/:id", deleteSymptom);

export default router;
