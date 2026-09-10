import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

export class AppError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // ZodError instanceof fails across multiple zod copies (shared vs server), so use duck-typing
  const isZodError =
    err instanceof z.ZodError ||
    (typeof err === "object" &&
      err !== null &&
      "name" in err &&
      (err as { name: string }).name === "ZodError" &&
      "issues" in err &&
      Array.isArray((err as { issues: unknown[] }).issues));
  if (isZodError) {
    const zodErr = err as z.ZodError;
    const fields: Record<string, string> = {};
    for (const issue of zodErr.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] = issue.message;
    }
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Validation failed", fields },
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.fields ? { fields: err.fields } : {}),
      },
    });
  }
  console.error("[unhandled]", err);
  return res.status(500).json({ error: { code: "INTERNAL", message: "Internal server error" } });
}
