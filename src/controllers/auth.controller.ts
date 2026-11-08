import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../prisma/client.ts";
import { createAccessToken, createRefreshToken, verifyRefreshToken } from "../utils/tokens.ts";
import logger from "../logger.ts";

const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
} as const;

async function issueTokenPair(user: { id: number; username: string }) {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id },
  });
  return { accessToken, refreshToken };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, email, password, name } = req.body;
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({ error: "Username or email already taken" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword, name },
      select: publicUserSelect,
    });
    const tokens = await issueTokenPair(user);
    logger.info({ event: "user_registered", userId: user.id, username: user.username }, "New user registered");
    res.status(201).json({ user, ...tokens });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    const tokens = await issueTokenPair(user);
    const publicUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    };
    logger.info({ event: "user_logged_in", userId: user.id, username: user.username }, "User logged in");
    res.status(200).json({ user: publicUser, ...tokens });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  try {
    const payload = verifyRefreshToken(refreshToken);
    const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    const userId = Number(payload.sub);

    if (!storedToken || storedToken.userId !== userId) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
    if (!user) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }

    const newAccessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken(user);
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { token: refreshToken } }),
      prisma.refreshToken.create({ data: { token: newRefreshToken, userId: user.id } }),
    ]);

    res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError || (error instanceof Error && error.message === "Invalid refresh token")) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    throw error;
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.refreshToken.deleteMany({ where: { userId: req.user!.sub } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { ...publicUserSelect, createdAt: true },
    });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}
