/**
 * B2B Lead Extractor - API Routes
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { extractFromText } from "./gemini";
import { extractFromCSV } from "./csv-service";
import { searchPlaces } from "./places-service";
import { authMiddleware } from "./auth";
import { TextExtractionRequest, ExtractionResult, PlacesSearchRequest } from "./types";

/**
 * body-parser 2 (shipped with Express 5) sets req.body to undefined when the
 * request has no parsed body. Express 4 initialized it to {}. Missing-field
 * checks should still return 400 in that case, not throw.
 */
function parsedBody<T>(body: unknown): T {
  return (body ?? {}) as T;
}

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are accepted"));
    }
  },
});

// Apply auth to all extraction routes
router.use(authMiddleware);

/**
 * POST /extract/text
 * Extract leads from raw text input.
 * Body: { "text": "raw text containing contact info" }
 */
router.post("/text", async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = parsedBody<TextExtractionRequest>(req.body);

    if (!text || typeof text !== "string") {
      res.status(400).json({
        success: false,
        error: 'Request body must include a "text" field (string)',
      });
      return;
    }

    const leads = await extractFromText(text);

    const result: ExtractionResult = {
      success: true,
      leads,
      count: leads.length,
    };

    res.json(result);
  } catch (error) {
    console.error("Text extraction error:", error);
    res.status(500).json({
      success: false,
      leads: [],
      count: 0,
      errors: [error instanceof Error ? error.message : "Extraction failed"],
    });
  }
});

/**
 * POST /extract/csv
 * Upload a CSV file and extract leads from every row.
 * Form field: "file" (CSV upload)
 */
router.post("/csv", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: "No CSV file uploaded. Use form field 'file'.",
      });
      return;
    }

    const { leads, errors } = await extractFromCSV(
      req.file.buffer,
      req.file.originalname
    );

    const result: ExtractionResult = {
      success: true,
      leads,
      count: leads.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    res.json(result);
  } catch (error) {
    console.error("CSV extraction error:", error);
    res.status(500).json({
      success: false,
      leads: [],
      count: 0,
      errors: [error instanceof Error ? error.message : "CSV processing failed"],
    });
  }
});

/**
 * POST /extract/search
 * Search for business leads using Google Places Text Search API.
 * Body: { "query": "plumbers in Erie PA", "max_results": 10, "location": "Erie PA" }
 */
router.post("/search", async (req: Request, res: Response): Promise<void> => {
  const body = parsedBody<PlacesSearchRequest>(req.body);
  try {
    const { query, max_results, location } = body;

    if (!query || typeof query !== "string") {
      res.status(400).json({
        success: false,
        error: 'Request body must include a "query" field (string)',
      });
      return;
    }

    // Optionally append location hint to query if provided separately
    const fullQuery = location ? `${query} ${location}` : query;

    const result = await searchPlaces(fullQuery, max_results ?? 10);

    res.json(result);
  } catch (error) {
    console.error("Places search error:", error);
    res.status(500).json({
      success: false,
      leads: [],
      count: 0,
      query: typeof body.query === "string" ? body.query : "",
      errors: [error instanceof Error ? error.message : "Search failed"],
    });
  }
});

export default router;
