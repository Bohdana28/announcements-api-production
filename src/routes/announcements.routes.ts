import { Router } from "express";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementById,
  getAnnouncements,
  updateAnnouncement,
} from "../controllers/announcements.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.ts";
import { uploadAnnouncementImage } from "../middleware/upload.ts";
import {
  announcementIdSchema,
  createAnnouncementSchema,
  listAnnouncementsSchema,
  updateAnnouncementSchema,
} from "../validators/announcements.validator.ts";

const router = Router();

router.get("/", validateQuery(listAnnouncementsSchema), getAnnouncements);
router.get("/:id", validateParams(announcementIdSchema), getAnnouncementById);
router.post("/", authenticate, uploadAnnouncementImage, validateBody(createAnnouncementSchema), createAnnouncement);
router.patch("/:id", authenticate, validateParams(announcementIdSchema), uploadAnnouncementImage, validateBody(updateAnnouncementSchema), updateAnnouncement);
router.delete("/:id", authenticate, validateParams(announcementIdSchema), deleteAnnouncement);

export default router;
