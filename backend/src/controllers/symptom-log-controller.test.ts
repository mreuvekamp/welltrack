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

async function createSystemSymptom(name = "Headache", category = "pain") {
  return prisma.symptom.create({
    data: { user_id: null, name, category },
  });
}

async function createSymptomLog(
  accessToken: string,
  symptomId: string,
  data: Record<string, unknown> = {}
) {
  return request(app)
    .post("/api/symptom-logs")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      symptom_id: symptomId,
      severity: 5,
      logged_at: "2025-01-15T10:00:00.000Z",
      ...data,
    });
}

beforeEach(async () => {
  await prisma.symptomLog.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.moodLog.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.symptomLog.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.moodLog.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

// ─── POST /api/symptom-logs ────────────────────────────

describe("POST /api/symptom-logs", () => {
  it("creates a symptom log with all fields", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();

    const res = await createSymptomLog(accessToken, symptom.id, {
      severity: 7,
      notes: "Started after lunch",
      logged_at: "2025-01-15T10:00:00.000Z",
    });

    expect(res.status).toBe(201);
    expect(res.body.symptom_log.severity).toBe(7);
    expect(res.body.symptom_log.notes).toBe("Started after lunch");
    expect(res.body.symptom_log.symptom_id).toBe(symptom.id);
    expect(res.body.symptom_log.id).toBeDefined();
    expect(res.body.symptom_log.created_at).toBeDefined();
  });

  it("creates a symptom log with only required fields", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();

    const res = await createSymptomLog(accessToken, symptom.id, {
      severity: 3,
      logged_at: "2025-01-15T10:00:00.000Z",
    });

    expect(res.status).toBe(201);
    expect(res.body.symptom_log.severity).toBe(3);
    expect(res.body.symptom_log.notes).toBeNull();
  });

  it("creates a symptom log with user's custom symptom", async () => {
    const { accessToken } = await registerUser();

    // Create custom symptom
    const symptomRes = await request(app)
      .post("/api/symptoms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Custom Symptom", category: "custom" });

    const res = await createSymptomLog(accessToken, symptomRes.body.symptom.id);

    expect(res.status).toBe(201);
    expect(res.body.symptom_log.symptom_id).toBe(symptomRes.body.symptom.id);
  });

  it("returns 400 for missing symptom_id", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/symptom-logs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ severity: 5, logged_at: "2025-01-15T10:00:00.000Z" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid symptom_id format", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/symptom-logs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        symptom_id: "not-a-uuid",
        severity: 5,
        logged_at: "2025-01-15T10:00:00.000Z",
      });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing severity", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();

    const res = await request(app)
      .post("/api/symptom-logs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        symptom_id: symptom.id,
        logged_at: "2025-01-15T10:00:00.000Z",
      });

    expect(res.status).toBe(400);
  });

  it("returns 400 for severity above 10", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();

    const res = await createSymptomLog(accessToken, symptom.id, {
      severity: 11,
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for severity below 1", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();

    const res = await createSymptomLog(accessToken, symptom.id, {
      severity: 0,
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing logged_at", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();

    const res = await request(app)
      .post("/api/symptom-logs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ symptom_id: symptom.id, severity: 5 });

    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent symptom", async () => {
    const { accessToken } = await registerUser();

    const res = await createSymptomLog(
      accessToken,
      "00000000-0000-0000-0000-000000000000"
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Symptom not found");
  });

  it("returns 404 when using another user's custom symptom", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    // User1 creates a custom symptom
    const symptomRes = await request(app)
      .post("/api/symptoms")
      .set("Authorization", `Bearer ${user1.accessToken}`)
      .send({ name: "User1 Symptom", category: "custom" });

    // User2 tries to create a log with User1's symptom
    const res = await createSymptomLog(
      user2.accessToken,
      symptomRes.body.symptom.id
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Symptom not found");
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .post("/api/symptom-logs")
      .send({
        symptom_id: "00000000-0000-0000-0000-000000000000",
        severity: 5,
        logged_at: "2025-01-15T10:00:00.000Z",
      });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/symptom-logs ─────────────────────────────

describe("GET /api/symptom-logs", () => {
  it("returns all symptom logs for the user", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();

    await createSymptomLog(accessToken, symptom.id, {
      severity: 3,
      logged_at: "2025-01-15T10:00:00.000Z",
    });
    await createSymptomLog(accessToken, symptom.id, {
      severity: 7,
      logged_at: "2025-01-16T10:00:00.000Z",
    });

    const res = await request(app)
      .get("/api/symptom-logs")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.symptom_logs).toHaveLength(2);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(2);
  });

  it("returns logs ordered by logged_at descending", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();

    await createSymptomLog(accessToken, symptom.id, {
      severity: 2,
      logged_at: "2025-01-10T10:00:00.000Z",
    });
    await createSymptomLog(accessToken, symptom.id, {
      severity: 8,
      logged_at: "2025-01-20T10:00:00.000Z",
    });

    const res = await request(app)
      .get("/api/symptom-logs")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.symptom_logs[0].severity).toBe(8);
    expect(res.body.symptom_logs[1].severity).toBe(2);
  });

  it("includes symptom details in response", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom("Headache", "pain");

    await createSymptomLog(accessToken, symptom.id);

    const res = await request(app)
      .get("/api/symptom-logs")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.symptom_logs[0].symptom).toBeDefined();
    expect(res.body.symptom_logs[0].symptom.name).toBe("Headache");
  });

  it("filters by startDate", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();

    await createSymptomLog(accessToken, symptom.id, {
      logged_at: "2025-01-10T10:00:00.000Z",
    });
    await createSymptomLog(accessToken, symptom.id, {
      logged_at: "2025-01-20T10:00:00.000Z",
    });

    const res = await request(app)
      .get("/api/symptom-logs")
      .query({ startDate: "2025-01-15T00:00:00.000Z" })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.symptom_logs).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });

  it("filters by endDate", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();

    await createSymptomLog(accessToken, symptom.id, {
      logged_at: "2025-01-10T10:00:00.000Z",
    });
    await createSymptomLog(accessToken, symptom.id, {
      logged_at: "2025-01-20T10:00:00.000Z",
    });

    const res = await request(app)
      .get("/api/symptom-logs")
      .query({ endDate: "2025-01-15T00:00:00.000Z" })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.symptom_logs).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });

  it("filters by both startDate and endDate", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();

    await createSymptomLog(accessToken, symptom.id, {
      logged_at: "2025-01-05T10:00:00.000Z",
    });
    await createSymptomLog(accessToken, symptom.id, {
      logged_at: "2025-01-15T10:00:00.000Z",
    });
    await createSymptomLog(accessToken, symptom.id, {
      logged_at: "2025-01-25T10:00:00.000Z",
    });

    const res = await request(app)
      .get("/api/symptom-logs")
      .query({
        startDate: "2025-01-10T00:00:00.000Z",
        endDate: "2025-01-20T00:00:00.000Z",
      })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.symptom_logs).toHaveLength(1);
  });

  it("supports pagination with limit", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();

    await createSymptomLog(accessToken, symptom.id, {
      logged_at: "2025-01-10T10:00:00.000Z",
    });
    await createSymptomLog(accessToken, symptom.id, {
      logged_at: "2025-01-11T10:00:00.000Z",
    });
    await createSymptomLog(accessToken, symptom.id, {
      logged_at: "2025-01-12T10:00:00.000Z",
    });

    const res = await request(app)
      .get("/api/symptom-logs")
      .query({ limit: 2 })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.symptom_logs).toHaveLength(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.limit).toBe(2);
    expect(res.body.pagination.offset).toBe(0);
  });

  it("supports pagination with offset", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();

    await createSymptomLog(accessToken, symptom.id, {
      severity: 1,
      logged_at: "2025-01-10T10:00:00.000Z",
    });
    await createSymptomLog(accessToken, symptom.id, {
      severity: 2,
      logged_at: "2025-01-11T10:00:00.000Z",
    });
    await createSymptomLog(accessToken, symptom.id, {
      severity: 3,
      logged_at: "2025-01-12T10:00:00.000Z",
    });

    const res = await request(app)
      .get("/api/symptom-logs")
      .query({ limit: 2, offset: 2 })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.symptom_logs).toHaveLength(1);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.offset).toBe(2);
  });

  it("does not return other user's logs", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");
    const symptom = await createSystemSymptom();

    await createSymptomLog(user1.accessToken, symptom.id);
    await createSymptomLog(user2.accessToken, symptom.id);

    const res = await request(app)
      .get("/api/symptom-logs")
      .set("Authorization", `Bearer ${user1.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.symptom_logs).toHaveLength(1);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app).get("/api/symptom-logs");
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/symptom-logs/:id ───────────────────────

describe("PATCH /api/symptom-logs/:id", () => {
  it("updates severity", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();
    const created = await createSymptomLog(accessToken, symptom.id);

    const res = await request(app)
      .patch(`/api/symptom-logs/${created.body.symptom_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ severity: 9 });

    expect(res.status).toBe(200);
    expect(res.body.symptom_log.severity).toBe(9);
  });

  it("updates notes", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();
    const created = await createSymptomLog(accessToken, symptom.id);

    const res = await request(app)
      .patch(`/api/symptom-logs/${created.body.symptom_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ notes: "Updated notes" });

    expect(res.status).toBe(200);
    expect(res.body.symptom_log.notes).toBe("Updated notes");
  });

  it("can set notes to null", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();
    const created = await createSymptomLog(accessToken, symptom.id, {
      notes: "Some notes",
    });

    const res = await request(app)
      .patch(`/api/symptom-logs/${created.body.symptom_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ notes: null });

    expect(res.status).toBe(200);
    expect(res.body.symptom_log.notes).toBeNull();
  });

  it("updates logged_at", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();
    const created = await createSymptomLog(accessToken, symptom.id);

    const newDate = "2025-02-01T14:00:00.000Z";
    const res = await request(app)
      .patch(`/api/symptom-logs/${created.body.symptom_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ logged_at: newDate });

    expect(res.status).toBe(200);
    expect(res.body.symptom_log.logged_at).toBe(newDate);
  });

  it("returns 400 for empty body", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();
    const created = await createSymptomLog(accessToken, symptom.id);

    const res = await request(app)
      .patch(`/api/symptom-logs/${created.body.symptom_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No fields to update");
  });

  it("returns 400 for severity out of range", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();
    const created = await createSymptomLog(accessToken, symptom.id);

    const res = await request(app)
      .patch(`/api/symptom-logs/${created.body.symptom_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ severity: 11 });

    expect(res.status).toBe(400);
  });

  it("returns 400 for severity below range", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();
    const created = await createSymptomLog(accessToken, symptom.id);

    const res = await request(app)
      .patch(`/api/symptom-logs/${created.body.symptom_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ severity: 0 });

    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent log", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .patch("/api/symptom-logs/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ severity: 5 });

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's log", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");
    const symptom = await createSystemSymptom();

    const created = await createSymptomLog(user1.accessToken, symptom.id);

    const res = await request(app)
      .patch(`/api/symptom-logs/${created.body.symptom_log.id}`)
      .set("Authorization", `Bearer ${user2.accessToken}`)
      .send({ severity: 9 });

    expect(res.status).toBe(404);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .patch("/api/symptom-logs/some-id")
      .send({ severity: 5 });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/symptom-logs/:id ──────────────────────

describe("DELETE /api/symptom-logs/:id", () => {
  it("deletes a symptom log", async () => {
    const { accessToken } = await registerUser();
    const symptom = await createSystemSymptom();
    const created = await createSymptomLog(accessToken, symptom.id);

    const res = await request(app)
      .delete(`/api/symptom-logs/${created.body.symptom_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Symptom log deleted successfully");

    // Verify it's gone
    const getRes = await request(app)
      .get("/api/symptom-logs")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(getRes.body.symptom_logs).toHaveLength(0);
  });

  it("returns 404 for non-existent log", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .delete("/api/symptom-logs/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's log", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");
    const symptom = await createSystemSymptom();

    const created = await createSymptomLog(user1.accessToken, symptom.id);

    const res = await request(app)
      .delete(`/api/symptom-logs/${created.body.symptom_log.id}`)
      .set("Authorization", `Bearer ${user2.accessToken}`);

    expect(res.status).toBe(404);

    // Verify it still exists
    const getRes = await request(app)
      .get("/api/symptom-logs")
      .set("Authorization", `Bearer ${user1.accessToken}`);
    expect(getRes.body.symptom_logs).toHaveLength(1);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app).delete("/api/symptom-logs/some-id");
    expect(res.status).toBe(401);
  });
});
