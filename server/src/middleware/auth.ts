import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AuthUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = (req.cookies as Record<string, string | undefined>)["access_token"];
  if (!token) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = (req.cookies as Record<string, string | undefined>)["access_token"];
  if (token) {
    try {
      req.user = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
    } catch {
      // ignore
    }
  }
  return next();
}
