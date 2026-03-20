import { Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { verifyPassword } from "../utils/password";

const prisma = new PrismaClient();

const updateUserSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).max(100).optional(),
});

const deleteUserSchema = z.object({
  password: z.string().min(1, "Password is required for account deletion"),
});

function userResponse(user: {
  id: string;
  email: string;
  display_name: string | null;
  timezone: string;
  created_at: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    timezone: user.timezone,
    created_at: user.created_at,
  };
}

export async function getMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json({ user: userResponse(user) });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = updateUserSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
    });

    res.status(200).json({ user: userResponse(user) });
  } catch (err) {
    next(err);
  }
}

export async function deleteMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = deleteUserSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const valid = await verifyPassword(data.password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Incorrect password" });
      return;
    }

    // Cascade delete is handled by Prisma schema (onDelete: Cascade)
    await prisma.user.delete({ where: { id: req.userId } });

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    next(err);
  }
}
