import { Router } from "express";
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
} from "../controllers/habitController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", getHabits);
router.post("/", createHabit);
router.patch("/:id", updateHabit);
router.delete("/:id", deleteHabit);

export default router;
