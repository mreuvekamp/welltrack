import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../app";

const prisma = new PrismaClient();

async function registerUser(email = "test@example.com", password = "password123") {
  const res = await request(app).post("/api/auth/register").send({ email, password });
  return res.body;
}

beforeEach(async () => {
  await prisma.passwordReset.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.passwordReset.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

// ─── Register ────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("creates a new user and returns tokens", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      password: "password123",
      display_name: "Test User",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.display_name).toBe("Test User");
    expect(res.body.user.timezone).toBe("UTC");
    expect(res.body.user).not.toHaveProperty("password_hash");
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it("returns 409 when email already exists", async () => {
    await registerUser("dupe@example.com");

    const res = await request(app).post("/api/auth/register").send({
      email: "dupe@example.com",
      password: "password456",
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Email already in use");
  });

  it("returns 400 for invalid email", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "password123",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
  });

  it("returns 400 for short password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      password: "short",
    });

    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe("password");
  });

  it("works without display_name", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "minimal@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.display_name).toBeNull();
  });
});

// ─── Login ───────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("returns tokens for valid credentials", async () => {
    await registerUser("login@example.com", "password123");

    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("login@example.com");
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it("returns 401 for wrong password", async () => {
    await registerUser("login@example.com", "password123");

    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("returns 401 for non-existent email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com",
      password: "password123",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("returns 400 for missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

// ─── Refresh ─────────────────────────────────────────────

describe("POST /api/auth/refresh", () => {
  it("returns new tokens and rotates refresh token", async () => {
    const { refreshToken } = await registerUser();

    const res = await request(app).post("/api/auth/refresh").send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  it("rejects a used refresh token (rotation)", async () => {
    const { refreshToken } = await registerUser();

    // Use it once
    await request(app).post("/api/auth/refresh").send({ refreshToken });

    // Try again with same token
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken });

    expect(res.status).toBe(401);
  });

  it("returns 401 for invalid token", async () => {
    const res = await request(app).post("/api/auth/refresh").send({
      refreshToken: "invalid-token",
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 for missing refreshToken", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.status).toBe(400);
  });
});

// ─── Logout ──────────────────────────────────────────────

describe("POST /api/auth/logout", () => {
  it("invalidates the refresh token", async () => {
    const { refreshToken } = await registerUser();

    const res = await request(app).post("/api/auth/logout").send({ refreshToken });
    expect(res.status).toBe(200);

    // Token should no longer work
    const refreshRes = await request(app).post("/api/auth/refresh").send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });

  it("returns 200 even for unknown token (idempotent)", async () => {
    const res = await request(app).post("/api/auth/logout").send({
      refreshToken: "nonexistent",
    });
    expect(res.status).toBe(200);
  });
});

// ─── Forgot Password ────────────────────────────────────

describe("POST /api/auth/forgot-password", () => {
  it("returns 200 for existing email", async () => {
    await registerUser("forgot@example.com");

    const res = await request(app).post("/api/auth/forgot-password").send({
      email: "forgot@example.com",
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("reset link");
  });

  it("returns 200 for non-existent email (no enumeration)", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({
      email: "nobody@example.com",
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("reset link");
  });

  it("creates a password reset record in the database", async () => {
    await registerUser("forgot@example.com");

    await request(app).post("/api/auth/forgot-password").send({
      email: "forgot@example.com",
    });

    const resets = await prisma.passwordReset.findMany();
    expect(resets).toHaveLength(1);
    expect(resets[0].used).toBe(false);
  });

  it("returns 400 for invalid email", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({
      email: "not-email",
    });
    expect(res.status).toBe(400);
  });
});

// ─── Reset Password ─────────────────────────────────────

describe("POST /api/auth/reset-password", () => {
  async function getResetToken(email = "reset@example.com") {
    await registerUser(email);
    await request(app).post("/api/auth/forgot-password").send({ email });
    const record = await prisma.passwordReset.findFirst({
      where: { used: false },
      orderBy: { created_at: "desc" },
    });
    return record!.token;
  }

  it("resets password with valid token", async () => {
    const token = await getResetToken();

    const res = await request(app).post("/api/auth/reset-password").send({
      token,
      password: "newpassword123",
    });

    expect(res.status).toBe(200);

    // Can login with new password
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "reset@example.com",
      password: "newpassword123",
    });
    expect(loginRes.status).toBe(200);
  });

  it("cannot use same reset token twice", async () => {
    const token = await getResetToken();

    await request(app).post("/api/auth/reset-password").send({
      token,
      password: "newpassword123",
    });

    const res = await request(app).post("/api/auth/reset-password").send({
      token,
      password: "anotherpassword",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Invalid or expired");
  });

  it("invalidates refresh tokens after password reset", async () => {
    const email = "reset@example.com";
    const { refreshToken } = await registerUser(email);

    await request(app).post("/api/auth/forgot-password").send({ email });
    const record = await prisma.passwordReset.findFirst({
      where: { used: false },
      orderBy: { created_at: "desc" },
    });

    await request(app).post("/api/auth/reset-password").send({
      token: record!.token,
      password: "newpassword123",
    });

    // Old refresh token should be invalid
    const refreshRes = await request(app).post("/api/auth/refresh").send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });

  it("returns 400 for invalid token", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({
      token: "invalid-token",
      password: "newpassword123",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for short password", async () => {
    const token = await getResetToken();
    const res = await request(app).post("/api/auth/reset-password").send({
      token,
      password: "short",
    });
    expect(res.status).toBe(400);
  });
});

// ─── Auth Middleware ──────────────────────────────────────

describe("Auth Middleware", () => {
  it("rejects request without authorization header", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects request with invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-token");
    expect(res.status).toBe(401);
  });

  it("allows request with valid access token", async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("test@example.com");
  });
});
