import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

export function validate(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(parsed.error);
    req.body = parsed.data;
    return next();
  };
}

export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return next(parsed.error);
    // attach parsed query for handlers
    (req as unknown as { parsedQuery: unknown }).parsedQuery = parsed.data;
    return next();
  };
}
