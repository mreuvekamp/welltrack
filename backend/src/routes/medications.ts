import { Router } from "express";
import {
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
} from "../controllers/medicationController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", getMedications);
router.post("/", createMedication);
router.patch("/:id", updateMedication);
router.delete("/:id", deleteMedication);

export default router;
