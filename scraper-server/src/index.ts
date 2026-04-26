import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { scrapeRouter } from "./routes/scrape.js";
import { browserPool } from "./browser/manager.js";

// ─────────────────────────────────────────────
// EXPRESS APP SETUP
// ─────────────────────────────────────────────
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting for all routes
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: "Too many requests",
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: config.server.nodeEnv,
  });
});

// API routes
app.use("/api/scrape", scrapeRouter);

// ─────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested endpoint does not exist",
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error", { error: err });
  res.status(500).json({
    error: "Internal Server Error",
    message: config.server.nodeEnv === "development" ? err.message : "An unexpected error occurred",
  });
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────

const server = app.listen(config.server.port, () => {
  logger.info(`🚀 Scraper server started`, {
    port: config.server.port,
    environment: config.server.nodeEnv,
    headless: config.browser.headless,
    maxConcurrent: config.rateLimit.maxConcurrentJobs,
  });
});

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully...");
  await browserPool.cleanup();
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  await browserPool.cleanup();
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

export default app;
