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

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "MoodLog", "SymptomLog", "Symptom", "MedicationLog", "Medication", "HabitLog", "Habit", "PasswordReset", "RefreshToken", "User" CASCADE');
});

afterAll(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "MoodLog", "SymptomLog", "Symptom", "MedicationLog", "Medication", "HabitLog", "Habit", "PasswordReset", "RefreshToken", "User" CASCADE');
  await prisma.$disconnect();
});

// ─── GET /api/users/me ──────────────────────────────────

describe("GET /api/users/me", () => {
  it("returns the authenticated user's profile", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.display_name).toBe("Test User");
    expect(res.body.user.timezone).toBe("UTC");
    expect(res.body.user.created_at).toBeDefined();
    expect(res.body.user).not.toHaveProperty("password_hash");
  });

  it("returns 401 without authorization header", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", "Bearer invalid-token");
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/users/me ────────────────────────────────

describe("PATCH /api/users/me", () => {
  it("updates display_name", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ display_name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.user.display_name).toBe("New Name");
  });

  it("updates timezone", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ timezone: "Europe/Amsterdam" });

    expect(res.status).toBe(200);
    expect(res.body.user.timezone).toBe("Europe/Amsterdam");
  });

  it("updates both fields at once", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ display_name: "Updated", timezone: "America/New_York" });

    expect(res.status).toBe(200);
    expect(res.body.user.display_name).toBe("Updated");
    expect(res.body.user.timezone).toBe("America/New_York");
  });

  it("returns 400 for empty body", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No fields to update");
  });

  it("ignores unknown fields", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ display_name: "Valid", email: "hack@evil.com" });

    expect(res.status).toBe(200);
    expect(res.body.user.display_name).toBe("Valid");
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .send({ display_name: "New" });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/users/me ───────────────────────────────

describe("DELETE /api/users/me", () => {
  it("deletes the account with correct password", async () => {
    const { accessToken, password } = await registerUser();

    const res = await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ password });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Account deleted successfully");

    // User should no longer exist
    const users = await prisma.user.findMany();
    expect(users).toHaveLength(0);
  });

  it("cascades deletion to related data", async () => {
    const { accessToken, password } = await registerUser();

    await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ password });

    const tokens = await prisma.refreshToken.findMany();
    expect(tokens).toHaveLength(0);
  });

  it("returns 401 for incorrect password", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Incorrect password");

    // User should still exist
    const users = await prisma.user.findMany();
    expect(users).toHaveLength(1);
  });

  it("returns 400 without password", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 401 without authorization", async () => {
    const res = await request(app)
      .delete("/api/users/me")
      .send({ password: "password123" });
    expect(res.status).toBe(401);
  });
});
