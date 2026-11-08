import { z } from "zod";

const categorySchema = z.enum(["sale", "service", "job", "other"]);

export const announcementIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listAnnouncementsSchema = z.object({
  search: z.string().trim().optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  page: z.coerce.number().int().positive().default(1),
});

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(5).max(50),
  description: z.string().trim().min(10),
  price: z.coerce.number().positive(),
  category: categorySchema,
  image: z.string().optional(), // Internal multipart marker; the actual file is handled by Multer.
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" },
);
