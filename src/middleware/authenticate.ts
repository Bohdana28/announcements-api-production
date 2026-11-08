import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/tokens.ts";

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authorization.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0 || typeof payload.username !== "string") {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    req.user = { sub: userId, username: payload.username };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
