import type { Request, Response, NextFunction } from "express";
import prisma from "../../prisma/client.ts";
import logger from "../logger.ts";

const authorSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
} as const;

const announcementInclude = {
  user: { select: authorSelect },
} as const;

export async function getAnnouncements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, sort, page } = req.query as unknown as {
      search?: string;
      sort: "newest" | "oldest";
      page: number;
    };
    const where = search
      ? { title: { contains: search, mode: "insensitive" as const } }
      : {};
    const perPage = 10;
    const [data, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: announcementInclude,
        orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.announcement.count({ where }),
    ]);

    res.status(200).json({
      data,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / perPage),
        perPage,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAnnouncementById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: announcementInclude,
    });
    if (!announcement) {
      res.status(404).json({ error: "Announcement not found" });
      return;
    }
    res.status(200).json(announcement);
  } catch (error) {
    next(error);
  }
}

export async function createAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { image: _imageMarker, ...announcementData } = req.body;
    const announcement = await prisma.announcement.create({
      data: { ...announcementData, ...(req.imageUrl ? { imageUrl: req.imageUrl } : {}), userId: req.user!.sub },
      include: announcementInclude,
    });
    logger.info({ event: "announcement_created", announcementId: announcement.id, userId: req.user!.sub, hasImage: Boolean(announcement.imageUrl) }, "Announcement created");
    res.status(201).json(announcement);
  } catch (error) {
    next(error);
  }
}

export async function updateAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) {
      res.status(404).json({ error: "Announcement not found" });
      return;
    }
    if (announcement.userId !== req.user!.sub) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const { image: _imageMarker, ...announcementData } = req.body;
    const updated = await prisma.announcement.update({
      where: { id },
      data: { ...announcementData, ...(req.imageUrl ? { imageUrl: req.imageUrl } : {}) },
      include: announcementInclude,
    });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) {
      res.status(404).json({ error: "Announcement not found" });
      return;
    }
    if (announcement.userId !== req.user!.sub) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    await prisma.announcement.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
