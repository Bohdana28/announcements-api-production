import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

type RequestPart = "body" | "params" | "query";

function validate(schema: ZodType, part: RequestPart) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }
    // Express 5 exposes req.query through a getter, so define the parsed value
    // explicitly instead of assigning to the getter-only property.
    Object.defineProperty(req, part, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}

export const validateBody = (schema: ZodType) => validate(schema, "body");
export const validateParams = (schema: ZodType) => validate(schema, "params");
export const validateQuery = (schema: ZodType) => validate(schema, "query");
