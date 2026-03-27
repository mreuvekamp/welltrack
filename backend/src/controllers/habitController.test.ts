import request from "supertest";
import { PrismaClient, TrackingType } from "@prisma/client";
import app from "../app";

const prisma = new PrismaClient();

async function registerUser(
  email = "test@example.com",
  password = "password123"
) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email, password, display_name: "Test User" });
  return { ...res.body, password };
}

async function createSystemHabit(
  name = "Exercise",
  tracking_type: TrackingType = "boolean",
  unit?: string
) {
  return prisma.habit.create({
    data: { user_id: null, name, tracking_type, unit: unit ?? null },
  });
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "MoodLog", "SymptomLog", "Symptom", "MedicationLog", "Medication", "HabitLog", "Habit", "PasswordReset", "RefreshToken", "User" CASCADE'
  );
});

afterAll(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "MoodLog", "SymptomLog", "Symptom", "MedicationLog", "Medication", "HabitLog", "Habit", "PasswordReset", "RefreshToken", "User" CASCADE'
  );
  await prisma.$disconnect();
});

// ─── GET /api/habits ──────────────────────────────────

describe("GET /api/habits", () => {
  it("returns system defaults and user's custom habits", async () => {
    const { accessToken } = await registerUser();
    await createSystemHabit("Exercise", "boolean");

    // Create a custom habit for the user
    await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Custom Habit", tracking_type: "numeric", unit: "reps" });

    const res = await request(app)
      .get("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.habits).toHaveLength(2);

    const names = res.body.habits.map((h: { name: string }) => h.name);
    expect(names).toContain("Exercise");
    expect(names).toContain("Custom Habit");
  });

  it("does not return other users' custom habits", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");
    await createSystemHabit("Exercise", "boolean");

    // User 1 creates a custom habit
    await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${user1.accessToken}`)
      .send({ name: "User1 Habit", tracking_type: "boolean" });

    // User 2 should not see User 1's custom habit
    const res = await request(app)
      .get("/api/habits")
      .set("Authorization", `Bearer ${user2.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.habits).toHaveLength(1);
    expect(res.body.habits[0].name).toBe("Exercise");
  });

  it("returns habits ordered by name ascending", async () => {
    const { accessToken } = await registerUser();
    await createSystemHabit("Yoga", "boolean");
    await createSystemHabit("Alcohol", "boolean");

    const res = await request(app)
      .get("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.habits[0].name).toBe("Alcohol");
    expect(res.body.habits[1].name).toBe("Yoga");
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app).get("/api/habits");
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/habits ─────────────────────────────────

describe("POST /api/habits", () => {
  it("creates a boolean habit", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Meditation", tracking_type: "boolean" });

    expect(res.status).toBe(201);
    expect(res.body.habit.name).toBe("Meditation");
    expect(res.body.habit.tracking_type).toBe("boolean");
    expect(res.body.habit.unit).toBeNull();
    expect(res.body.habit.is_active).toBe(true);
    expect(res.body.habit.user_id).toBeDefined();
  });

  it("creates a numeric habit with unit", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Water Intake", tracking_type: "numeric", unit: "glasses" });

    expect(res.status).toBe(201);
    expect(res.body.habit.name).toBe("Water Intake");
    expect(res.body.habit.tracking_type).toBe("numeric");
    expect(res.body.habit.unit).toBe("glasses");
  });

  it("creates a duration habit with unit", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Sleep", tracking_type: "duration", unit: "hours" });

    expect(res.status).toBe(201);
    expect(res.body.habit.tracking_type).toBe("duration");
    expect(res.body.habit.unit).toBe("hours");
  });

  it("returns 400 for missing name", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ tracking_type: "boolean" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing tracking_type", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Meditation" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid tracking_type", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Meditation", tracking_type: "invalid" });

    expect(res.status).toBe(400);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .post("/api/habits")
      .send({ name: "Meditation", tracking_type: "boolean" });
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/habits/:id ────────────────────────────

describe("PATCH /api/habits/:id", () => {
  it("updates a user's custom habit", async () => {
    const { accessToken } = await registerUser();

    const createRes = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Old Name", tracking_type: "boolean" });

    const habitId = createRes.body.habit.id;

    const res = await request(app)
      .patch(`/api/habits/${habitId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "New Name", is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.habit.name).toBe("New Name");
    expect(res.body.habit.is_active).toBe(false);
  });

  it("updates tracking_type and unit", async () => {
    const { accessToken } = await registerUser();

    const createRes = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Track", tracking_type: "boolean" });

    const res = await request(app)
      .patch(`/api/habits/${createRes.body.habit.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ tracking_type: "numeric", unit: "count" });

    expect(res.status).toBe(200);
    expect(res.body.habit.tracking_type).toBe("numeric");
    expect(res.body.habit.unit).toBe("count");
  });

  it("can set unit to null", async () => {
    const { accessToken } = await registerUser();

    const createRes = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Track", tracking_type: "numeric", unit: "glasses" });

    const res = await request(app)
      .patch(`/api/habits/${createRes.body.habit.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ unit: null });

    expect(res.status).toBe(200);
    expect(res.body.habit.unit).toBeNull();
  });

  it("returns 400 for empty body", async () => {
    const { accessToken } = await registerUser();

    const createRes = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test", tracking_type: "boolean" });

    const res = await request(app)
      .patch(`/api/habits/${createRes.body.habit.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No fields to update");
  });

  it("returns 403 when trying to modify system default", async () => {
    const { accessToken } = await registerUser();
    const systemHabit = await createSystemHabit();

    const res = await request(app)
      .patch(`/api/habits/${systemHabit.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Hacked" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Cannot modify system default habits");
  });

  it("returns 403 when trying to modify another user's habit", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    const createRes = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${user1.accessToken}`)
      .send({ name: "User1 Habit", tracking_type: "boolean" });

    const res = await request(app)
      .patch(`/api/habits/${createRes.body.habit.id}`)
      .set("Authorization", `Bearer ${user2.accessToken}`)
      .send({ name: "Stolen" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Not authorized to modify this habit");
  });

  it("returns 404 for non-existent habit", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .patch("/api/habits/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Nope" });

    expect(res.status).toBe(404);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .patch("/api/habits/some-id")
      .send({ name: "Nope" });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/habits/:id ───────────────────────────

describe("DELETE /api/habits/:id", () => {
  it("deletes a user's custom habit", async () => {
    const { accessToken } = await registerUser();

    const createRes = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "To Delete", tracking_type: "boolean" });

    const habitId = createRes.body.habit.id;

    const res = await request(app)
      .delete(`/api/habits/${habitId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Habit deleted successfully");

    // Verify it's gone
    const habits = await prisma.habit.findMany({
      where: { id: habitId },
    });
    expect(habits).toHaveLength(0);
  });

  it("returns 403 when trying to delete system default", async () => {
    const { accessToken } = await registerUser();
    const systemHabit = await createSystemHabit();

    const res = await request(app)
      .delete(`/api/habits/${systemHabit.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Cannot delete system default habits");
  });

  it("returns 403 when trying to delete another user's habit", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    const createRes = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${user1.accessToken}`)
      .send({ name: "User1 Only", tracking_type: "boolean" });

    const res = await request(app)
      .delete(`/api/habits/${createRes.body.habit.id}`)
      .set("Authorization", `Bearer ${user2.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Not authorized to delete this habit");
  });

  it("returns 404 for non-existent habit", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .delete("/api/habits/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app).delete("/api/habits/some-id");
    expect(res.status).toBe(401);
  });
});
