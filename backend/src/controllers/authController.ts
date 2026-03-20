import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  display_name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function userResponse(user: { id: string; email: string; display_name: string | null; timezone: string }) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    timezone: user.timezone,
  };
}

async function createRefreshTokenInDb(userId: string): Promise<string> {
  const token = generateRefreshToken(userId);
  await prisma.refreshToken.create({
    data: {
      user_id: userId,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }

    const password_hash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password_hash,
        display_name: data.display_name ?? null,
      },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await createRefreshTokenInDb(user.id);

    res.status(201).json({
      user: userResponse(user),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await verifyPassword(data.password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await createRefreshTokenInDb(user.id);

    res.status(200).json({
      user: userResponse(user),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = refreshSchema.parse(req.body);

    // Verify JWT signature
    let payload;
    try {
      payload = verifyRefreshToken(data.refreshToken);
    } catch {
      res.status(401).json({ error: "Invalid or expired refresh token" });
      return;
    }

    // Check token exists in DB (not revoked)
    const stored = await prisma.refreshToken.findUnique({
      where: { token: data.refreshToken },
    });
    if (!stored || stored.expires_at < new Date()) {
      res.status(401).json({ error: "Invalid or expired refresh token" });
      return;
    }

    // Rotate: delete old, create new
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const accessToken = generateAccessToken(payload.userId);
    const refreshToken = await createRefreshTokenInDb(payload.userId);

    res.status(200).json({ accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = logoutSchema.parse(req.body);

    await prisma.refreshToken.deleteMany({ where: { token: data.refreshToken } });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });

    // Always return 200 to prevent email enumeration
    if (!user) {
      res.status(200).json({ message: "If the email exists, a reset link has been sent" });
      return;
    }

    // Invalidate existing reset tokens
    await prisma.passwordReset.updateMany({
      where: { user_id: user.id, used: false },
      data: { used: true },
    });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordReset.create({
      data: {
        user_id: user.id,
        token,
        expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: Send email with reset link
    console.log(`[Password Reset] Token for ${data.email}: ${token}`);

    res.status(200).json({ message: "If the email exists, a reset link has been sent" });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = resetPasswordSchema.parse(req.body);

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token: data.token },
    });

    if (!resetRecord || resetRecord.used || resetRecord.expires_at < new Date()) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    const password_hash = await hashPassword(data.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.user_id },
        data: { password_hash },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
      // Invalidate all refresh tokens for security
      prisma.refreshToken.deleteMany({
        where: { user_id: resetRecord.user_id },
      }),
    ]);

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json({ user: userResponse(user) });
  } catch (err) {
    next(err);
  }
}
