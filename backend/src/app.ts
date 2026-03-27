import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import symptomRoutes from "./routes/symptoms";
import moodLogRoutes from "./routes/mood-logs";
import symptomLogRoutes from "./routes/symptom-logs";
import medicationRoutes from "./routes/medications";
import medicationLogRoutes from "./routes/medication-logs";
import habitRoutes from "./routes/habits";
import habitLogRoutes from "./routes/habit-logs";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/symptoms", symptomRoutes);
app.use("/api/mood-logs", moodLogRoutes);
app.use("/api/symptom-logs", symptomLogRoutes);
app.use("/api/medications", medicationRoutes);
app.use("/api/medication-logs", medicationLogRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/habit-logs", habitLogRoutes);

app.use(errorHandler);

export default app;
