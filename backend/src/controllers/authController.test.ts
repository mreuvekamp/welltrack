import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../app";

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

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
    await request(app).post("/api/auth/register").send({
      email: "dupe@example.com",
      password: "password123",
    });

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
    expect(res.body.error).toBe("Validation error");
    expect(res.body.details[0].field).toBe("password");
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app).post("/api/auth/register").send({
      password: "password123",
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
    });

    expect(res.status).toBe(400);
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
