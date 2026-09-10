import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthUser } from "../middleware/auth.js";

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, email: user.email }, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(user: AuthUser & { jti: string }): string {
  return jwt.sign({ id: user.id, email: user.email, jti: user.jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyAccessToken(token: string): AuthUser {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
}

export function verifyRefreshToken(token: string): AuthUser & { jti: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthUser & { jti: string };
}
