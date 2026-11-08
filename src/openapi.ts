import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  announcementIdSchema,
  createAnnouncementSchema,
  listAnnouncementsSchema,
  updateAnnouncementSchema,
} from "./validators/announcements.validator.ts";
import { loginSchema, refreshSchema, registerSchema } from "./validators/auth.validator.ts";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  name: z.string(),
});
const tokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});
const authorSchema = userSchema;
const announcementSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.string(),
  imageUrl: z.string().url().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  user: authorSchema,
});

registry.registerPath({
  method: "post", path: "/auth/register", summary: "Register a user",
  request: { body: { content: { "application/json": { schema: registerSchema } } } },
  responses: { 201: { description: "User registered", content: { "application/json": { schema: authResponseSchema } } }, 409: { description: "Username or email already taken" } },
});
registry.registerPath({
  method: "post", path: "/auth/login", summary: "Log in",
  request: { body: { content: { "application/json": { schema: loginSchema } } } },
  responses: { 200: { description: "Logged in", content: { "application/json": { schema: authResponseSchema } } }, 401: { description: "Invalid credentials" } },
});
registry.registerPath({
  method: "post", path: "/auth/refresh", summary: "Rotate refresh token",
  request: { body: { content: { "application/json": { schema: refreshSchema } } } },
  responses: { 200: { description: "Tokens refreshed", content: { "application/json": { schema: tokenResponseSchema } } }, 401: { description: "Invalid refresh token" } },
});
registry.registerPath({
  method: "post", path: "/auth/logout", summary: "Log out",
  security: [{ bearerAuth: [] }],
  responses: { 204: { description: "Logged out" } },
});
registry.registerPath({
  method: "get", path: "/auth/me", summary: "Get current user",
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Current user profile", content: { "application/json": { schema: userSchema.extend({ createdAt: z.string().datetime() }) } } } },
});

registry.registerPath({
  method: "get", path: "/announcements", summary: "List announcements",
  request: { query: listAnnouncementsSchema },
  responses: {
    200: { description: "Paginated announcements", content: { "application/json": { schema: z.object({ data: z.array(announcementSchema), pagination: z.object({ total: z.number(), page: z.number(), totalPages: z.number(), perPage: z.number() }) }) } } },
  }
});
registry.registerPath({
  method: "get", path: "/announcements/{id}", summary: "Get announcement",
  request: { params: announcementIdSchema },
  responses: { 200: { description: "Announcement details", content: { "application/json": { schema: announcementSchema } } }, 404: { description: "Announcement not found" } },
});
const createAnnouncementMultipartSchema = z.object({
  title: z.string().min(5).max(50),
  description: z.string().min(10),
  price: z.string().openapi({ description: "Positive numeric price" }),
  category: z.enum(["sale", "service", "job", "other"]),
  image: z.string().openapi({ type: "string", format: "binary", description: "Optional image file (max 5 MB)" }).optional(),
});
const updateAnnouncementMultipartSchema = createAnnouncementMultipartSchema.partial();

registry.registerPath({
  method: "post", path: "/announcements", summary: "Create announcement (optional image upload)",
  security: [{ bearerAuth: [] }],
  request: { body: { required: true, content: { "multipart/form-data": { schema: createAnnouncementMultipartSchema } } } },
  responses: { 201: { description: "Announcement created", content: { "application/json": { schema: announcementSchema } } } },
});
registry.registerPath({
  method: "patch", path: "/announcements/{id}", summary: "Update own announcement (optional image upload)",
  security: [{ bearerAuth: [] }],
  request: { params: announcementIdSchema, body: { content: { "multipart/form-data": { schema: updateAnnouncementMultipartSchema } } } },
  responses: { 200: { description: "Announcement updated", content: { "application/json": { schema: announcementSchema } } }, 403: { description: "Access denied" }, 404: { description: "Announcement not found" } },
});
registry.registerPath({
  method: "delete", path: "/announcements/{id}", summary: "Delete own announcement",
  security: [{ bearerAuth: [] }],
  request: { params: announcementIdSchema },
  responses: { 204: { description: "Announcement deleted" }, 403: { description: "Access denied" }, 404: { description: "Announcement not found" } },
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Announcements REST API",
      version: "1.0.0",
      description: "JSON REST API with JWT authentication, announcement management, secure uploads and logging.",
    },
    servers: [{ url: "http://localhost:3000" }],
  });
}
