import { Router } from "express";
import { getMe, updateMe, deleteMe } from "../controllers/userController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/me", getMe);
router.patch("/me", updateMe);
router.delete("/me", deleteMe);

export default router;
