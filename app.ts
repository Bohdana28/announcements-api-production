import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./src/routes/auth.routes.ts";
import announcementRoutes from "./src/routes/announcements.routes.ts";
import { generateOpenApiDocument } from "./src/openapi.ts";
import logger from "./src/logger.ts";

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);


app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header (curl, server-to-server) are not browser CORS requests.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin not allowed by CORS"));
  },
}));

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(generateOpenApiDocument()));
app.use("/auth", authRoutes);
app.use("/announcements", announcementRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const error = err as { type?: string; status?: number; statusCode?: number; message?: string; code?: string; name?: string };
  logger.error({ err: error }, "Request failed");

  if (error.message === "Origin not allowed by CORS") {
    res.status(403).json({ error: "Origin not allowed by CORS" });
    return;
  }
  if (error.type === "entity.parse.failed") {
    res.status(400).json({ error: "Validation failed", details: { body: ["Invalid JSON format in request body"] } });
    return;
  }
  if (error.name === "MulterError" || error.message === "Only image files are allowed") {
    res.status(400).json({ error: error.message ?? "Invalid upload" });
    return;
  }
  if (error.code === "P2025") {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  if (error.code === "P2002") {
    res.status(409).json({ error: "Unique constraint violation" });
    return;
  }
  if (error.code === "P2003") {
    res.status(400).json({ error: "Foreign key constraint failed" });
    return;
  }
  const status = error.status ?? error.statusCode;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ error: error.message ?? "Request failed" });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT ?? 3000);
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    logger.info({ port }, `Server running at http://localhost:${port}`);
    logger.info(`OpenAPI docs: http://localhost:${port}/api-docs`);
  });
}

export default app;
