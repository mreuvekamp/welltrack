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

beforeEach(async () => {
  await prisma.symptomLog.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.symptomLog.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

// ─── GET /api/symptoms ──────────────────────────────────

describe("GET /api/symptoms", () => {
  it("returns system defaults and user's custom symptoms", async () => {
    const { accessToken } = await registerUser();
    await createSystemSymptom("Headache", "pain");

    // Create a custom symptom for the user
    await request(app)
      .post("/api/symptoms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Custom Symptom", category: "custom" });

    const res = await request(app)
      .get("/api/symptoms")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.symptoms).toHaveLength(2);

    const names = res.body.symptoms.map((s: { name: string }) => s.name);
    expect(names).toContain("Headache");
    expect(names).toContain("Custom Symptom");
  });

  it("does not return other users' custom symptoms", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");
    await createSystemSymptom("Headache", "pain");

    // User 1 creates a custom symptom
    await request(app)
      .post("/api/symptoms")
      .set("Authorization", `Bearer ${user1.accessToken}`)
      .send({ name: "User1 Symptom", category: "custom" });

    // User 2 should not see User 1's custom symptom
    const res = await request(app)
      .get("/api/symptoms")
      .set("Authorization", `Bearer ${user2.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.symptoms).toHaveLength(1);
    expect(res.body.symptoms[0].name).toBe("Headache");
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app).get("/api/symptoms");
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/symptoms ─────────────────────────────────

describe("POST /api/symptoms", () => {
  it("creates a custom symptom for the user", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/symptoms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Custom Headache", category: "pain" });

    expect(res.status).toBe(201);
    expect(res.body.symptom.name).toBe("Custom Headache");
    expect(res.body.symptom.category).toBe("pain");
    expect(res.body.symptom.user_id).toBeDefined();
    expect(res.body.symptom.is_active).toBe(true);
  });

  it("returns 400 for missing name", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/symptoms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ category: "pain" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing category", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post("/api/symptoms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Headache" });

    expect(res.status).toBe(400);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .post("/api/symptoms")
      .send({ name: "Headache", category: "pain" });
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/symptoms/:id ────────────────────────────

describe("PATCH /api/symptoms/:id", () => {
  it("updates a user's custom symptom", async () => {
    const { accessToken } = await registerUser();

    const createRes = await request(app)
      .post("/api/symptoms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Old Name", category: "pain" });

    const symptomId = createRes.body.symptom.id;

    const res = await request(app)
      .patch(`/api/symptoms/${symptomId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "New Name", is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.symptom.name).toBe("New Name");
    expect(res.body.symptom.is_active).toBe(false);
  });

  it("returns 400 for empty body", async () => {
    const { accessToken } = await registerUser();

    const createRes = await request(app)
      .post("/api/symptoms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test", category: "pain" });

    const res = await request(app)
      .patch(`/api/symptoms/${createRes.body.symptom.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No fields to update");
  });

  it("returns 403 when trying to modify system default", async () => {
    const { accessToken } = await registerUser();
    const systemSymptom = await createSystemSymptom();

    const res = await request(app)
      .patch(`/api/symptoms/${systemSymptom.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Hacked" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Cannot modify system default symptoms");
  });

  it("returns 403 when trying to modify another user's symptom", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    const createRes = await request(app)
      .post("/api/symptoms")
      .set("Authorization", `Bearer ${user1.accessToken}`)
      .send({ name: "User1 Symptom", category: "pain" });

    const res = await request(app)
      .patch(`/api/symptoms/${createRes.body.symptom.id}`)
      .set("Authorization", `Bearer ${user2.accessToken}`)
      .send({ name: "Stolen" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Not authorized to modify this symptom");
  });

  it("returns 404 for non-existent symptom", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .patch("/api/symptoms/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Nope" });

    expect(res.status).toBe(404);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .patch("/api/symptoms/some-id")
      .send({ name: "Nope" });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/symptoms/:id ───────────────────────────

describe("DELETE /api/symptoms/:id", () => {
  it("deletes a user's custom symptom", async () => {
    const { accessToken } = await registerUser();

    const createRes = await request(app)
      .post("/api/symptoms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "To Delete", category: "pain" });

    const symptomId = createRes.body.symptom.id;

    const res = await request(app)
      .delete(`/api/symptoms/${symptomId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Symptom deleted successfully");

    // Verify it's gone
    const symptoms = await prisma.symptom.findMany({
      where: { id: symptomId },
    });
    expect(symptoms).toHaveLength(0);
  });

  it("returns 403 when trying to delete system default", async () => {
    const { accessToken } = await registerUser();
    const systemSymptom = await createSystemSymptom();

    const res = await request(app)
      .delete(`/api/symptoms/${systemSymptom.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Cannot delete system default symptoms");
  });

  it("returns 403 when trying to delete another user's symptom", async () => {
    const user1 = await registerUser("user1@example.com");
    const user2 = await registerUser("user2@example.com");

    const createRes = await request(app)
      .post("/api/symptoms")
      .set("Authorization", `Bearer ${user1.accessToken}`)
      .send({ name: "User1 Only", category: "pain" });

    const res = await request(app)
      .delete(`/api/symptoms/${createRes.body.symptom.id}`)
      .set("Authorization", `Bearer ${user2.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Not authorized to delete this symptom");
  });

  it("returns 404 for non-existent symptom", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .delete("/api/symptoms/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app).delete("/api/symptoms/some-id");
    expect(res.status).toBe(401);
  });
});
