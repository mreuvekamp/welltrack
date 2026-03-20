import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret-dev";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh-secret-dev";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

interface TokenPayload {
  userId: string;
}

export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId, jti: crypto.randomUUID() }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, jti: crypto.randomUUID() }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}
