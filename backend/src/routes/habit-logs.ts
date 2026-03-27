import { Router } from "express";
import {
  getHabitLogs,
  createHabitLog,
  updateHabitLog,
  deleteHabitLog,
} from "../controllers/habit-log-controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", getHabitLogs);
router.post("/", createHabitLog);
router.patch("/:id", updateHabitLog);
router.delete("/:id", deleteHabitLog);

export default router;
