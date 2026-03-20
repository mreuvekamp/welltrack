import request from "supertest";
import { PrismaClient } from "@prisma/client";
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

async function createMoodLog(accessToken: string, data: Record<string, unknown> = {}) {
  return request(app)
    .post("/api/mood-logs")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      mood_score: 3,
      logged_at: "2025-01-15T10:00:00.000Z",
      ...data,
    });
}

beforeEach(async () => {
  await prisma.moodLog.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.moodLog.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

// ─── POST /api/mood-logs ────────────────────────────────

describe("POST /api/mood-logs", () => {
  it("creates a mood log with all fields", async () => {
    const { accessToken } = await registerUser();

    const res = await createMoodLog(accessToken, {
      mood_score: 4,
      energy_level: 3,
      stress_level: 2,
      notes: "Feeling good today",
      logged_at: "2025-01-15T10:00:00.000Z",
    });

    expect(res.status).toBe(201);
    expect(res.body.mood_log.mood_score).toBe(4);
    expect(res.body.mood_log.energy_level).toBe(3);
    expect(res.body.mood_log.stress_level).toBe(2);
    expect(res.body.mood_log.notes).toBe("Feeling good today");
    expect(res.body.mood_log.id).toBeDefined();
    expect(res.body.mood_log.created_at).toBeDefined();
  });

  it("creates a mood log with only required fields", async () => {
    const { accessToken } = await registerUser();

    const res = await createMoodLog(accessToken, {
      mood_score: 2,
      logged_at: "2025-01-15T10:00:00.000Z",
    });

    expect(res.status).toBe(201);
    expect(res.body.mood_log.mood_score).toBe(2);
    expect(res.body.mood_log.energy_level).toBeNull();
    expect(res.body.mood_log.stress_level).toBeNull();
    expect(res.body.mood_log.notes).toBeNull();
  });

  it("returns 400 for missing mood_score", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/mood-logs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ logged_at: "2025-01-15T10:00:00.000Z" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for mood_score out of range", async () => {
    const { accessToken } = await registerUser();

    const res = await createMoodLog(accessToken, { mood_score: 6 });
    expect(res.status).toBe(400);
  });

  it("returns 400 for mood_score below range", async () => {
    const { accessToken } = await registerUser();

    const res = await createMoodLog(accessToken, { mood_score: 0 });
    expect(res.status).toBe(400);
  });

  it("returns 400 for energy_level out of range", async () => {
    const { accessToken } = await registerUser();

    const res = await createMoodLog(accessToken, { energy_level: 6 });
    expect(res.status).toBe(400);
  });

  it("returns 400 for stress_level out of range", async () => {
    const { accessToken } = await registerUser();

    const res = await createMoodLog(accessToken, { stress_level: 0 });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing logged_at", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/mood-logs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ mood_score: 3 });

    expect(res.status).toBe(400);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .post("/api/mood-logs")
      .send({ mood_score: 3, logged_at: "2025-01-15T10:00:00.000Z" });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/mood-logs ─────────────────────────────────

describe("GET /api/mood-logs", () => {
  it("returns all mood logs for the user", async () => {
    const { accessToken } = await registerUser();

    await createMoodLog(accessToken, { mood_score: 3, logged_at: "2025-01-15T10:00:00.000Z" });
    await createMoodLog(accessToken, { mood_score: 4, logged_at: "2025-01-16T10:00:00.000Z" });

    const res = await request(app)
      .get("/api/mood-logs")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.mood_logs).toHaveLength(2);
  });

  it("returns logs ordered by logged_at descending", async () => {
    const { accessToken } = await registerUser();

    await createMoodLog(accessToken, { mood_score: 1, logged_at: "2025-01-10T10:00:00.000Z" });
    await createMoodLog(accessToken, { mood_score: 5, logged_at: "2025-01-20T10:00:00.000Z" });

    const res = await request(app)
      .get("/api/mood-logs")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.mood_logs[0].mood_score).toBe(5);
    expect(res.body.mood_logs[1].mood_score).toBe(1);
  });

  it("filters by startDate", async () => {
    const { accessToken } = await registerUser();

    await createMoodLog(accessToken, { logged_at: "2025-01-10T10:00:00.000Z" });
    await createMoodLog(accessToken, { logged_at: "2025-01-20T10:00:00.000Z" });

    const res = await request(app)
      .get("/api/mood-logs")
      .query({ startDate: "2025-01-15T00:00:00.000Z" })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.mood_logs).toHaveLength(1);
  });

  it("filters by endDate", async () => {
    const { accessToken } = await registerUser();

    await createMoodLog(accessToken, { logged_at: "2025-01-10T10:00:00.000Z" });
    await createMoodLog(accessToken, { logged_at: "2025-01-20T10:00:00.000Z" });

    const res = await request(app)
      .get("/api/mood-logs")
      .query({ endDate: "2025-01-15T00:00:00.000Z" })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.mood_logs).toHaveLength(1);
  });

  it("filters by both startDate and endDate", async () => {
    const { accessToken } = await registerUser();

    await createMoodLog(accessToken, { logged_at: "2025-01-05T10:00:00.000Z" });
    await createMoodLog(accessToken, { logged_at: "2025-01-15T10:00:00.000Z" });
    await createMoodLog(accessToken, { logged_at: "2025-01-25T10:00:00.000Z" });

    const res = await request(app)
      .get("/api/mood-logs")
      .query({
        startDate: "2025-01-10T00:00:00.000Z",
        endDate: "2025-01-20T00:00:00.000Z",
      })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.mood_logs).toHaveLength(1);
  });

  it("does not return other user's logs", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    await createMoodLog(user1.accessToken);
    await createMoodLog(user2.accessToken);

    const res = await request(app)
      .get("/api/mood-logs")
      .set("Authorization", `Bearer ${user1.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.mood_logs).toHaveLength(1);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app).get("/api/mood-logs");
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/mood-logs/:id ───────────────────────────

describe("PATCH /api/mood-logs/:id", () => {
  it("updates mood_score", async () => {
    const { accessToken } = await registerUser();
    const created = await createMoodLog(accessToken);

    const res = await request(app)
      .patch(`/api/mood-logs/${created.body.mood_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ mood_score: 5 });

    expect(res.status).toBe(200);
    expect(res.body.mood_log.mood_score).toBe(5);
  });

  it("updates optional fields", async () => {
    const { accessToken } = await registerUser();
    const created = await createMoodLog(accessToken);

    const res = await request(app)
      .patch(`/api/mood-logs/${created.body.mood_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ energy_level: 4, stress_level: 2, notes: "Updated notes" });

    expect(res.status).toBe(200);
    expect(res.body.mood_log.energy_level).toBe(4);
    expect(res.body.mood_log.stress_level).toBe(2);
    expect(res.body.mood_log.notes).toBe("Updated notes");
  });

  it("can set optional fields to null", async () => {
    const { accessToken } = await registerUser();
    const created = await createMoodLog(accessToken, { energy_level: 3 });

    const res = await request(app)
      .patch(`/api/mood-logs/${created.body.mood_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ energy_level: null });

    expect(res.status).toBe(200);
    expect(res.body.mood_log.energy_level).toBeNull();
  });

  it("returns 400 for empty body", async () => {
    const { accessToken } = await registerUser();
    const created = await createMoodLog(accessToken);

    const res = await request(app)
      .patch(`/api/mood-logs/${created.body.mood_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No fields to update");
  });

  it("returns 404 for non-existent log", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .patch("/api/mood-logs/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ mood_score: 5 });

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's log", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    const created = await createMoodLog(user1.accessToken);

    const res = await request(app)
      .patch(`/api/mood-logs/${created.body.mood_log.id}`)
      .set("Authorization", `Bearer ${user2.accessToken}`)
      .send({ mood_score: 5 });

    expect(res.status).toBe(404);
  });

  it("returns 400 for mood_score out of range", async () => {
    const { accessToken } = await registerUser();
    const created = await createMoodLog(accessToken);

    const res = await request(app)
      .patch(`/api/mood-logs/${created.body.mood_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ mood_score: 6 });

    expect(res.status).toBe(400);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .patch("/api/mood-logs/some-id")
      .send({ mood_score: 3 });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/mood-logs/:id ──────────────────────────

describe("DELETE /api/mood-logs/:id", () => {
  it("deletes a mood log", async () => {
    const { accessToken } = await registerUser();
    const created = await createMoodLog(accessToken);

    const res = await request(app)
      .delete(`/api/mood-logs/${created.body.mood_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Mood log deleted successfully");

    // Verify it's gone
    const getRes = await request(app)
      .get("/api/mood-logs")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(getRes.body.mood_logs).toHaveLength(0);
  });

  it("returns 404 for non-existent log", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .delete("/api/mood-logs/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's log", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    const created = await createMoodLog(user1.accessToken);

    const res = await request(app)
      .delete(`/api/mood-logs/${created.body.mood_log.id}`)
      .set("Authorization", `Bearer ${user2.accessToken}`);

    expect(res.status).toBe(404);

    // Verify it still exists
    const getRes = await request(app)
      .get("/api/mood-logs")
      .set("Authorization", `Bearer ${user1.accessToken}`);
    expect(getRes.body.mood_logs).toHaveLength(1);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app).delete("/api/mood-logs/some-id");
    expect(res.status).toBe(401);
  });
});
