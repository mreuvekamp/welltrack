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

async function createMedication(
  accessToken: string,
  data: Record<string, unknown> = {}
) {
  const res = await request(app)
    .post("/api/medications")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name: "Ibuprofen", ...data });
  return res.body.medication;
}

async function createMedicationLog(
  accessToken: string,
  medicationId: string,
  data: Record<string, unknown> = {}
) {
  return request(app)
    .post("/api/medication-logs")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      medication_id: medicationId,
      taken: true,
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

// ─── POST /api/medication-logs ────────────────────────────

describe("POST /api/medication-logs", () => {
  it("creates a medication log with all fields", async () => {
    const { accessToken } = await registerUser();
    const medication = await createMedication(accessToken);

    const res = await createMedicationLog(accessToken, medication.id, {
      taken: true,
      taken_at: "2025-01-15T10:00:00.000Z",
      notes: "Took with breakfast",
    });

    expect(res.status).toBe(201);
    expect(res.body.medication_log.taken).toBe(true);
    expect(res.body.medication_log.taken_at).toBe(
      "2025-01-15T10:00:00.000Z"
    );
    expect(res.body.medication_log.notes).toBe("Took with breakfast");
    expect(res.body.medication_log.medication_id).toBe(medication.id);
    expect(res.body.medication_log.id).toBeDefined();
    expect(res.body.medication_log.created_at).toBeDefined();
  });

  it("creates a medication log with only required fields", async () => {
    const { accessToken } = await registerUser();
    const medication = await createMedication(accessToken);

    const res = await createMedicationLog(accessToken, medication.id, {
      taken: false,
    });

    expect(res.status).toBe(201);
    expect(res.body.medication_log.taken).toBe(false);
    expect(res.body.medication_log.taken_at).toBeNull();
    expect(res.body.medication_log.notes).toBeNull();
  });

  it("returns 400 for missing medication_id", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/medication-logs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ taken: true });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid medication_id format", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/medication-logs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ medication_id: "not-a-uuid", taken: true });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing taken field", async () => {
    const { accessToken } = await registerUser();
    const medication = await createMedication(accessToken);

    const res = await request(app)
      .post("/api/medication-logs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ medication_id: medication.id });

    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent medication", async () => {
    const { accessToken } = await registerUser();

    const res = await createMedicationLog(
      accessToken,
      "00000000-0000-0000-0000-000000000000"
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Medication not found");
  });

  it("returns 404 when using another user's medication", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    const medication = await createMedication(user1.accessToken);

    const res = await createMedicationLog(user2.accessToken, medication.id);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Medication not found");
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .post("/api/medication-logs")
      .send({
        medication_id: "00000000-0000-0000-0000-000000000000",
        taken: true,
      });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/medication-logs ─────────────────────────────

describe("GET /api/medication-logs", () => {
  it("returns all medication logs for the user", async () => {
    const { accessToken } = await registerUser();
    const medication = await createMedication(accessToken);

    await createMedicationLog(accessToken, medication.id, { taken: true });
    await createMedicationLog(accessToken, medication.id, { taken: false });

    const res = await request(app)
      .get("/api/medication-logs")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.medication_logs).toHaveLength(2);
  });

  it("includes medication details in response", async () => {
    const { accessToken } = await registerUser();
    const medication = await createMedication(accessToken, {
      name: "Aspirin",
    });

    await createMedicationLog(accessToken, medication.id);

    const res = await request(app)
      .get("/api/medication-logs")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.medication_logs[0].medication).toBeDefined();
    expect(res.body.medication_logs[0].medication.name).toBe("Aspirin");
  });

  it("filters by startDate", async () => {
    const { accessToken } = await registerUser();
    const medication = await createMedication(accessToken);

    // Create logs at different times - we rely on created_at for filtering
    await createMedicationLog(accessToken, medication.id);

    const res = await request(app)
      .get("/api/medication-logs")
      .query({ startDate: "2020-01-01T00:00:00.000Z" })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.medication_logs).toHaveLength(1);
  });

  it("filters by endDate", async () => {
    const { accessToken } = await registerUser();
    const medication = await createMedication(accessToken);

    await createMedicationLog(accessToken, medication.id);

    const res = await request(app)
      .get("/api/medication-logs")
      .query({ endDate: "2020-01-01T00:00:00.000Z" })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.medication_logs).toHaveLength(0);
  });

  it("does not return other user's logs", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    const med1 = await createMedication(user1.accessToken);
    const med2 = await createMedication(user2.accessToken);

    await createMedicationLog(user1.accessToken, med1.id);
    await createMedicationLog(user2.accessToken, med2.id);

    const res = await request(app)
      .get("/api/medication-logs")
      .set("Authorization", `Bearer ${user1.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.medication_logs).toHaveLength(1);
  });

  it("returns empty array when user has no logs", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .get("/api/medication-logs")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.medication_logs).toHaveLength(0);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app).get("/api/medication-logs");
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/medication-logs/:id ───────────────────────

describe("PATCH /api/medication-logs/:id", () => {
  it("updates taken field", async () => {
    const { accessToken } = await registerUser();
    const medication = await createMedication(accessToken);
    const created = await createMedicationLog(accessToken, medication.id, {
      taken: true,
    });

    const res = await request(app)
      .patch(`/api/medication-logs/${created.body.medication_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ taken: false });

    expect(res.status).toBe(200);
    expect(res.body.medication_log.taken).toBe(false);
  });

  it("updates notes", async () => {
    const { accessToken } = await registerUser();
    const medication = await createMedication(accessToken);
    const created = await createMedicationLog(accessToken, medication.id);

    const res = await request(app)
      .patch(`/api/medication-logs/${created.body.medication_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ notes: "Updated notes" });

    expect(res.status).toBe(200);
    expect(res.body.medication_log.notes).toBe("Updated notes");
  });

  it("can set notes to null", async () => {
    const { accessToken } = await registerUser();
    const medication = await createMedication(accessToken);
    const created = await createMedicationLog(accessToken, medication.id, {
      notes: "Some notes",
    });

    const res = await request(app)
      .patch(`/api/medication-logs/${created.body.medication_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ notes: null });

    expect(res.status).toBe(200);
    expect(res.body.medication_log.notes).toBeNull();
  });

  it("updates taken_at", async () => {
    const { accessToken } = await registerUser();
    const medication = await createMedication(accessToken);
    const created = await createMedicationLog(accessToken, medication.id);

    const newDate = "2025-02-01T14:00:00.000Z";
    const res = await request(app)
      .patch(`/api/medication-logs/${created.body.medication_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ taken_at: newDate });

    expect(res.status).toBe(200);
    expect(res.body.medication_log.taken_at).toBe(newDate);
  });

  it("can set taken_at to null", async () => {
    const { accessToken } = await registerUser();
    const medication = await createMedication(accessToken);
    const created = await createMedicationLog(accessToken, medication.id, {
      taken_at: "2025-01-15T10:00:00.000Z",
    });

    const res = await request(app)
      .patch(`/api/medication-logs/${created.body.medication_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ taken_at: null });

    expect(res.status).toBe(200);
    expect(res.body.medication_log.taken_at).toBeNull();
  });

  it("returns 400 for empty body", async () => {
    const { accessToken } = await registerUser();
    const medication = await createMedication(accessToken);
    const created = await createMedicationLog(accessToken, medication.id);

    const res = await request(app)
      .patch(`/api/medication-logs/${created.body.medication_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No fields to update");
  });

  it("returns 404 for non-existent log", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .patch("/api/medication-logs/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ taken: false });

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's log", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    const medication = await createMedication(user1.accessToken);
    const created = await createMedicationLog(
      user1.accessToken,
      medication.id
    );

    const res = await request(app)
      .patch(`/api/medication-logs/${created.body.medication_log.id}`)
      .set("Authorization", `Bearer ${user2.accessToken}`)
      .send({ taken: false });

    expect(res.status).toBe(404);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .patch("/api/medication-logs/some-id")
      .send({ taken: false });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/medication-logs/:id ──────────────────────

describe("DELETE /api/medication-logs/:id", () => {
  it("deletes a medication log", async () => {
    const { accessToken } = await registerUser();
    const medication = await createMedication(accessToken);
    const created = await createMedicationLog(accessToken, medication.id);

    const res = await request(app)
      .delete(`/api/medication-logs/${created.body.medication_log.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Medication log deleted successfully");

    // Verify it's gone
    const getRes = await request(app)
      .get("/api/medication-logs")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(getRes.body.medication_logs).toHaveLength(0);
  });

  it("returns 404 for non-existent log", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .delete("/api/medication-logs/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's log", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    const medication = await createMedication(user1.accessToken);
    const created = await createMedicationLog(
      user1.accessToken,
      medication.id
    );

    const res = await request(app)
      .delete(`/api/medication-logs/${created.body.medication_log.id}`)
      .set("Authorization", `Bearer ${user2.accessToken}`);

    expect(res.status).toBe(404);

    // Verify it still exists
    const getRes = await request(app)
      .get("/api/medication-logs")
      .set("Authorization", `Bearer ${user1.accessToken}`);
    expect(getRes.body.medication_logs).toHaveLength(1);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app).delete("/api/medication-logs/some-id");
    expect(res.status).toBe(401);
  });
});
