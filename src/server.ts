/**
 * B2B Lead Extractor API - Server Entry Point
 *
 * Option A: Text parsing + CSV cleaning (shipping now)
 * Option B: Search-based lead generation (coming soon)
 *
 * Deploy to Railway, Render, VPS, or run locally.
 */

import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import extractRoutes from "./routes";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Security
app.use(helmet());
app.use(cors());

// Rate limiting: 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Rate limit exceeded. Try again in a minute." },
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "b2b-lead-extractor",
    version: "2.0.0",
    endpoints: [
      "POST /extract/text   - Parse raw text into leads",
      "POST /extract/csv    - Upload CSV, extract leads",
      "POST /extract/search - Search for business leads via Google Places",
    ],
  });
});

// Root redirect
app.get("/", (_req, res) => {
  res.redirect("/health");
});

// Extraction routes
app.use("/extract", extractRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Endpoint not found. Try GET /health" });
});

// Global error handler.
// Express 5 forwards rejected promises from async handlers here. If a response
// was already started, defer to the default handler instead of writing again.
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ success: false, error: "Internal server error" });
});

// Start server.
// Express 5 reports listen failures (for example EADDRINUSE) to this callback
// instead of throwing them the way Express 4 did.
app.listen(PORT, "0.0.0.0", (error) => {
  if (error) {
    throw error;
  }
  console.log("=".repeat(50));
  console.log("B2B Lead Extractor API v2.0");
  console.log(`Running on http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Auth: ${process.env.API_SECRET_KEY ? "ENABLED" : "DISABLED (dev mode)"}`);
  console.log(`Gemini: ${process.env.GEMINI_API_KEY ? "configured" : "NOT CONFIGURED"}`);
  console.log(`Places: ${process.env.GOOGLE_MAPS_API_KEY ? "configured" : "NOT CONFIGURED"}`);
  console.log("=".repeat(50));
});

export default app;
