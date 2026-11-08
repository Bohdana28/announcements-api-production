import "dotenv/config";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { unlink } from "node:fs/promises";
import path from "node:path";
import type { Request, Response, NextFunction } from "express";
import logger from "../logger.ts";

const uploadDirectory = path.resolve(process.cwd(), "uploads");
const diskUpload = multer({
  dest: uploadDirectory,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Only image files are allowed"));
      return;
    }
    callback(null, true);
  },
}).single("image");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function uploadAnnouncementImage(req: Request, res: Response, next: NextFunction): void {
  diskUpload(req, res, async (multerError: unknown) => {
    if (multerError) {
      next(multerError);
      return;
    }

    if (!req.file) {
      next();
      return;
    }

    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error("Cloudinary credentials are missing. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "announcements",
        resource_type: "image",
      });
      req.imageUrl = result.secure_url;
      req.body ??= {};
      req.body.image = "uploaded";
      logger.info({ event: "announcement_photo_uploaded", imageUrl: result.secure_url }, "Announcement photo uploaded to Cloudinary");
      next();
    } catch (error) {
      next(error);
    } finally {
      try {
        await unlink(req.file.path);
      } catch (error) {
        logger.error({ err: error, path: req.file.path }, "Failed to remove temporary upload");
      }
    }
  });
}
