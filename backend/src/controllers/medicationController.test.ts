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
  return request(app)
    .post("/api/medications")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Ibuprofen",
      ...data,
    });
}

beforeEach(async () => {
  await prisma.medicationLog.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.medicationLog.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

// ─── GET /api/medications ──────────────────────────────

describe("GET /api/medications", () => {
  it("returns all medications for the user", async () => {
    const { accessToken } = await registerUser();

    await createMedication(accessToken, { name: "Ibuprofen" });
    await createMedication(accessToken, { name: "Aspirin" });

    const res = await request(app)
      .get("/api/medications")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.medications).toHaveLength(2);
  });

  it("returns medications ordered by name ascending", async () => {
    const { accessToken } = await registerUser();

    await createMedication(accessToken, { name: "Zoloft" });
    await createMedication(accessToken, { name: "Aspirin" });

    const res = await request(app)
      .get("/api/medications")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.medications[0].name).toBe("Aspirin");
    expect(res.body.medications[1].name).toBe("Zoloft");
  });

  it("does not return other user's medications", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    await createMedication(user1.accessToken, { name: "User1 Med" });
    await createMedication(user2.accessToken, { name: "User2 Med" });

    const res = await request(app)
      .get("/api/medications")
      .set("Authorization", `Bearer ${user1.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.medications).toHaveLength(1);
    expect(res.body.medications[0].name).toBe("User1 Med");
  });

  it("returns empty array when user has no medications", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .get("/api/medications")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.medications).toHaveLength(0);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app).get("/api/medications");
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/medications ─────────────────────────────

describe("POST /api/medications", () => {
  it("creates a medication with only required fields", async () => {
    const { accessToken } = await registerUser();

    const res = await createMedication(accessToken, {
      name: "Ibuprofen",
    });

    expect(res.status).toBe(201);
    expect(res.body.medication.name).toBe("Ibuprofen");
    expect(res.body.medication.dosage).toBeNull();
    expect(res.body.medication.frequency).toBeNull();
    expect(res.body.medication.is_active).toBe(true);
    expect(res.body.medication.id).toBeDefined();
    expect(res.body.medication.created_at).toBeDefined();
  });

  it("creates a medication with all fields", async () => {
    const { accessToken } = await registerUser();

    const res = await createMedication(accessToken, {
      name: "Ibuprofen",
      dosage: "200mg",
      frequency: "Twice daily",
    });

    expect(res.status).toBe(201);
    expect(res.body.medication.name).toBe("Ibuprofen");
    expect(res.body.medication.dosage).toBe("200mg");
    expect(res.body.medication.frequency).toBe("Twice daily");
    expect(res.body.medication.is_active).toBe(true);
  });

  it("returns 400 for missing name", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/medications")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ dosage: "200mg" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for empty name", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/medications")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "" });

    expect(res.status).toBe(400);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .post("/api/medications")
      .send({ name: "Ibuprofen" });
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/medications/:id ────────────────────────

describe("PATCH /api/medications/:id", () => {
  it("updates medication name", async () => {
    const { accessToken } = await registerUser();
    const created = await createMedication(accessToken);

    const res = await request(app)
      .patch(`/api/medications/${created.body.medication.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.medication.name).toBe("Updated Name");
  });

  it("updates optional fields", async () => {
    const { accessToken } = await registerUser();
    const created = await createMedication(accessToken);

    const res = await request(app)
      .patch(`/api/medications/${created.body.medication.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ dosage: "400mg", frequency: "Once daily" });

    expect(res.status).toBe(200);
    expect(res.body.medication.dosage).toBe("400mg");
    expect(res.body.medication.frequency).toBe("Once daily");
  });

  it("updates is_active field", async () => {
    const { accessToken } = await registerUser();
    const created = await createMedication(accessToken);

    const res = await request(app)
      .patch(`/api/medications/${created.body.medication.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.medication.is_active).toBe(false);
  });

  it("can set optional fields to null", async () => {
    const { accessToken } = await registerUser();
    const created = await createMedication(accessToken, {
      name: "Ibuprofen",
      dosage: "200mg",
      frequency: "Daily",
    });

    const res = await request(app)
      .patch(`/api/medications/${created.body.medication.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ dosage: null, frequency: null });

    expect(res.status).toBe(200);
    expect(res.body.medication.dosage).toBeNull();
    expect(res.body.medication.frequency).toBeNull();
  });

  it("returns 400 for empty body", async () => {
    const { accessToken } = await registerUser();
    const created = await createMedication(accessToken);

    const res = await request(app)
      .patch(`/api/medications/${created.body.medication.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No fields to update");
  });

  it("returns 404 for non-existent medication", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .patch("/api/medications/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Nope" });

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's medication", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    const created = await createMedication(user1.accessToken);

    const res = await request(app)
      .patch(`/api/medications/${created.body.medication.id}`)
      .set("Authorization", `Bearer ${user2.accessToken}`)
      .send({ name: "Stolen" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Medication not found");
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .patch("/api/medications/some-id")
      .send({ name: "Nope" });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/medications/:id ───────────────────────

describe("DELETE /api/medications/:id", () => {
  it("deletes a medication", async () => {
    const { accessToken } = await registerUser();
    const created = await createMedication(accessToken);

    const res = await request(app)
      .delete(`/api/medications/${created.body.medication.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Medication deleted successfully");

    // Verify it's gone
    const getRes = await request(app)
      .get("/api/medications")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(getRes.body.medications).toHaveLength(0);
  });

  it("returns 404 for non-existent medication", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .delete("/api/medications/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's medication", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    const created = await createMedication(user1.accessToken);

    const res = await request(app)
      .delete(`/api/medications/${created.body.medication.id}`)
      .set("Authorization", `Bearer ${user2.accessToken}`);

    expect(res.status).toBe(404);

    // Verify it still exists for user1
    const getRes = await request(app)
      .get("/api/medications")
      .set("Authorization", `Bearer ${user1.accessToken}`);
    expect(getRes.body.medications).toHaveLength(1);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app).delete("/api/medications/some-id");
    expect(res.status).toBe(401);
  });
});
