import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/auth.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import { setAuthCookies, clearAuthCookies } from "../../lib/cookies.js";
import { hashToken } from "../../lib/crypto.js";
import { registerSchema, loginSchema } from "@repo/shared";

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), async (req, res) => {
  const { email, password, displayName } = req.body as {
    email: string;
    password: string;
    displayName: string;
  };
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError("CONFLICT", 409, "Email already registered");

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const user = await prisma.user.create({ data: { email, passwordHash, displayName } });

  const jti = randomUUID();
  const accessToken = signAccessToken({ id: user.id, email: user.email });
  const refreshToken = signRefreshToken({ id: user.id, email: user.email, jti });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
});

authRouter.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("UNAUTHORIZED", 401, "Invalid credentials");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError("UNAUTHORIZED", 401, "Invalid credentials");

  const jti = randomUUID();
  const accessToken = signAccessToken({ id: user.id, email: user.email });
  const refreshToken = signRefreshToken({ id: user.id, email: user.email, jti });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  setAuthCookies(res, accessToken, refreshToken);
  res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
});

authRouter.post("/refresh", async (req, res) => {
  const token = (req.cookies as Record<string, string | undefined>)["refresh_token"];
  if (!token) throw new AppError("UNAUTHORIZED", 401, "No refresh token");
  let payload: { id: string; email: string; jti: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError("UNAUTHORIZED", 401, "Invalid refresh token");
  }
  const hashed = hashToken(token);
  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash: hashed, revokedAt: null },
  });
  if (!stored || stored.expiresAt < new Date()) throw new AppError("UNAUTHORIZED", 401, "Refresh token expired or revoked");
  if (stored.userId !== payload.id) throw new AppError("UNAUTHORIZED", 401, "Token user mismatch");

  // rotation: revoke old
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  const jti = randomUUID();
  const accessToken = signAccessToken({ id: payload.id, email: payload.email });
  const newRefresh = signRefreshToken({ id: payload.id, email: payload.email, jti });
  await prisma.refreshToken.create({
    data: {
      userId: payload.id,
      tokenHash: hashToken(newRefresh),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  setAuthCookies(res, accessToken, newRefresh);
  res.json({ ok: true });
});

authRouter.post("/logout", async (req, res) => {
  const token = (req.cookies as Record<string, string | undefined>)["refresh_token"];
  if (token) {
    const hashed = hashToken(token);
    await prisma.refreshToken.updateMany({ where: { tokenHash: hashed }, data: { revokedAt: new Date() } });
  }
  clearAuthCookies(res);
  res.json({ ok: true });
});

authRouter.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, displayName: true, createdAt: true },
  });
  if (!user) throw new AppError("NOT_FOUND", 404, "User not found");
  res.json({ user });
});
