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
  tracking_type: TrackingType = "boolean"
) {
  return prisma.habit.create({
    data: { user_id: null, name, tracking_type },
  });
}

async function createHabitLog(
  accessToken: string,
  habitId: string,
  data: Record<string, unknown> = {}
) {
  return request(app)
    .post("/api/habit-logs")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      habit_id: habitId,
      logged_at: "2025-01-15T10:00:00.000Z",
      ...data,
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

// ─── POST /api/habit-logs ────────────────────────────

describe("POST /api/habit-logs", () => {
  it("creates a boolean habit log", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit("Exercise", "boolean");

    const res = await createHabitLog(accessToken, habit.id, {
      value_boolean: true,
      notes: "Morning run",
      logged_at: "2025-01-15T10:00:00.000Z",
    });

    expect(res.status).toBe(201);
    expect(res.body.habit_log.value_boolean).toBe(true);
    expect(res.body.habit_log.notes).toBe("Morning run");
    expect(res.body.habit_log.habit_id).toBe(habit.id);
    expect(res.body.habit_log.id).toBeDefined();
    expect(res.body.habit_log.created_at).toBeDefined();
  });

  it("creates a numeric habit log", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit("Water Intake", "numeric");

    const res = await createHabitLog(accessToken, habit.id, {
      value_numeric: 8,
      logged_at: "2025-01-15T10:00:00.000Z",
    });

    expect(res.status).toBe(201);
    expect(res.body.habit_log.value_numeric).toBe(8);
  });

  it("creates a duration habit log", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit("Sleep", "duration");

    const res = await createHabitLog(accessToken, habit.id, {
      value_duration: 480,
      logged_at: "2025-01-15T10:00:00.000Z",
    });

    expect(res.status).toBe(201);
    expect(res.body.habit_log.value_duration).toBe(480);
  });

  it("creates a habit log with only required fields", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit();

    const res = await createHabitLog(accessToken, habit.id, {
      logged_at: "2025-01-15T10:00:00.000Z",
    });

    expect(res.status).toBe(201);
    expect(res.body.habit_log.value_boolean).toBeNull();
    expect(res.body.habit_log.value_numeric).toBeNull();
    expect(res.body.habit_log.value_duration).toBeNull();
    expect(res.body.habit_log.notes).toBeNull();
  });

  it("creates a habit log with user's custom habit", async () => {
    const { accessToken } = await registerUser();

    // Create custom habit
    const habitRes = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Custom Habit", tracking_type: "boolean" });

    const res = await createHabitLog(
      accessToken,
      habitRes.body.habit.id,
      { value_boolean: true }
    );

    expect(res.status).toBe(201);
    expect(res.body.habit_log.habit_id).toBe(habitRes.body.habit.id);
  });

  it("returns 400 for missing habit_id", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/habit-logs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ logged_at: "2025-01-15T10:00:00.000Z" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid habit_id format", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/habit-logs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        habit_id: "not-a-uuid",
        logged_at: "2025-01-15T10:00:00.000Z",
      });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing logged_at", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit();

    const res = await request(app)
      .post("/api/habit-logs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ habit_id: habit.id, value_boolean: true });

    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent habit", async () => {
    const { accessToken } = await registerUser();

    const res = await createHabitLog(
      accessToken,
      "00000000-0000-0000-0000-000000000000"
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Habit not found");
  });

  it("returns 404 when using another user's custom habit", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    // User1 creates a custom habit
    const habitRes = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${user1.accessToken}`)
      .send({ name: "User1 Habit", tracking_type: "boolean" });

    // User2 tries to log against User1's habit
    const res = await createHabitLog(
      user2.accessToken,
      habitRes.body.habit.id
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Habit not found");
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .post("/api/habit-logs")
      .send({
        habit_id: "00000000-0000-0000-0000-000000000000",
        logged_at: "2025-01-15T10:00:00.000Z",
      });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/habit-logs ─────────────────────────────

describe("GET /api/habit-logs", () => {
  it("returns all habit logs for the user", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit();

    await createHabitLog(accessToken, habit.id, {
      value_boolean: true,
      logged_at: "2025-01-15T10:00:00.000Z",
    });
    await createHabitLog(accessToken, habit.id, {
      value_boolean: false,
      logged_at: "2025-01-16T10:00:00.000Z",
    });

    const res = await request(app)
      .get("/api/habit-logs")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.habit_logs).toHaveLength(2);
  });

  it("returns logs ordered by logged_at descending", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit("Water", "numeric");

    await createHabitLog(accessToken, habit.id, {
      value_numeric: 3,
      logged_at: "2025-01-10T10:00:00.000Z",
    });
    await createHabitLog(accessToken, habit.id, {
      value_numeric: 8,
      logged_at: "2025-01-20T10:00:00.000Z",
    });

    const res = await request(app)
      .get("/api/habit-logs")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.habit_logs[0].value_numeric).toBe(8);
    expect(res.body.habit_logs[1].value_numeric).toBe(3);
  });

  it("includes habit details in response", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit("Exercise", "boolean");

    await createHabitLog(accessToken, habit.id);

    const res = await request(app)
      .get("/api/habit-logs")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.habit_logs[0].habit).toBeDefined();
    expect(res.body.habit_logs[0].habit.name).toBe("Exercise");
  });

  it("filters by startDate", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit();

    await createHabitLog(accessToken, habit.id, {
      logged_at: "2025-01-10T10:00:00.000Z",
    });
    await createHabitLog(accessToken, habit.id, {
      logged_at: "2025-01-20T10:00:00.000Z",
    });

    const res = await request(app)
      .get("/api/habit-logs")
      .query({ startDate: "2025-01-15T00:00:00.000Z" })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.habit_logs).toHaveLength(1);
  });

  it("filters by endDate", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit();

    await createHabitLog(accessToken, habit.id, {
      logged_at: "2025-01-10T10:00:00.000Z",
    });
    await createHabitLog(accessToken, habit.id, {
      logged_at: "2025-01-20T10:00:00.000Z",
    });

    const res = await request(app)
      .get("/api/habit-logs")
      .query({ endDate: "2025-01-15T00:00:00.000Z" })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.habit_logs).toHaveLength(1);
  });

  it("filters by both startDate and endDate", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit();

    await createHabitLog(accessToken, habit.id, {
      logged_at: "2025-01-05T10:00:00.000Z",
    });
    await createHabitLog(accessToken, habit.id, {
      logged_at: "2025-01-15T10:00:00.000Z",
    });
    await createHabitLog(accessToken, habit.id, {
      logged_at: "2025-01-25T10:00:00.000Z",
    });

    const res = await request(app)
      .get("/api/habit-logs")
      .query({
        startDate: "2025-01-10T00:00:00.000Z",
        endDate: "2025-01-20T00:00:00.000Z",
      })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.habit_logs).toHaveLength(1);
  });

  it("does not return other user's logs", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");
    const habit = await createSystemHabit();

    await createHabitLog(user1.accessToken, habit.id);
    await createHabitLog(user2.accessToken, habit.id);

    const res = await request(app)
      .get("/api/habit-logs")
      .set("Authorization", `Bearer ${user1.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.habit_logs).toHaveLength(1);
  });

  it("returns empty array when user has no logs", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .get("/api/habit-logs")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.habit_logs).toHaveLength(0);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app).get("/api/habit-logs");
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/habit-logs/:id ───────────────────────

describe("PATCH /api/habit-logs/:id", () => {
  it("updates value_boolean", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit("Exercise", "boolean");
    const created = await createHabitLog(accessToken, habit.id, {
      value_boolean: true,
    });

    const res = await request(app)
      .patch(`/api/habit-logs/${created.body.habit_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ value_boolean: false });

    expect(res.status).toBe(200);
    expect(res.body.habit_log.value_boolean).toBe(false);
  });

  it("updates value_numeric", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit("Water", "numeric");
    const created = await createHabitLog(accessToken, habit.id, {
      value_numeric: 5,
    });

    const res = await request(app)
      .patch(`/api/habit-logs/${created.body.habit_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ value_numeric: 10 });

    expect(res.status).toBe(200);
    expect(res.body.habit_log.value_numeric).toBe(10);
  });

  it("updates notes", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit();
    const created = await createHabitLog(accessToken, habit.id);

    const res = await request(app)
      .patch(`/api/habit-logs/${created.body.habit_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ notes: "Updated notes" });

    expect(res.status).toBe(200);
    expect(res.body.habit_log.notes).toBe("Updated notes");
  });

  it("can set notes to null", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit();
    const created = await createHabitLog(accessToken, habit.id, {
      notes: "Some notes",
    });

    const res = await request(app)
      .patch(`/api/habit-logs/${created.body.habit_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ notes: null });

    expect(res.status).toBe(200);
    expect(res.body.habit_log.notes).toBeNull();
  });

  it("updates logged_at", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit();
    const created = await createHabitLog(accessToken, habit.id);

    const newDate = "2025-02-01T14:00:00.000Z";
    const res = await request(app)
      .patch(`/api/habit-logs/${created.body.habit_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ logged_at: newDate });

    expect(res.status).toBe(200);
    expect(res.body.habit_log.logged_at).toBe(newDate);
  });

  it("returns 400 for empty body", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit();
    const created = await createHabitLog(accessToken, habit.id);

    const res = await request(app)
      .patch(`/api/habit-logs/${created.body.habit_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No fields to update");
  });

  it("returns 404 for non-existent log", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .patch("/api/habit-logs/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ value_boolean: true });

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's log", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");
    const habit = await createSystemHabit();

    const created = await createHabitLog(user1.accessToken, habit.id, {
      value_boolean: true,
    });

    const res = await request(app)
      .patch(`/api/habit-logs/${created.body.habit_log.id}`)
      .set("Authorization", `Bearer ${user2.accessToken}`)
      .send({ value_boolean: false });

    expect(res.status).toBe(404);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .patch("/api/habit-logs/some-id")
      .send({ value_boolean: true });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/habit-logs/:id ──────────────────────

describe("DELETE /api/habit-logs/:id", () => {
  it("deletes a habit log", async () => {
    const { accessToken } = await registerUser();
    const habit = await createSystemHabit();
    const created = await createHabitLog(accessToken, habit.id);

    const res = await request(app)
      .delete(`/api/habit-logs/${created.body.habit_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Habit log deleted successfully");

    // Verify it's gone
    const getRes = await request(app)
      .get("/api/habit-logs")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(getRes.body.habit_logs).toHaveLength(0);
  });

  it("returns 404 for non-existent log", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .delete("/api/habit-logs/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's log", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");
    const habit = await createSystemHabit();

    const created = await createHabitLog(user1.accessToken, habit.id);

    const res = await request(app)
      .delete(`/api/habit-logs/${created.body.habit_log.id}`)
      .set("Authorization", `Bearer ${user2.accessToken}`);

    expect(res.status).toBe(404);

    // Verify it still exists
    const getRes = await request(app)
      .get("/api/habit-logs")
      .set("Authorization", `Bearer ${user1.accessToken}`);
    expect(getRes.body.habit_logs).toHaveLength(1);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app).delete("/api/habit-logs/some-id");
    expect(res.status).toBe(401);
  });
});
