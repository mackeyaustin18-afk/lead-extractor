/**
 * B2B Lead Extractor - API Routes
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { extractFromText } from "./gemini";
import { extractFromCSV } from "./csv-service";
import { authMiddleware } from "./auth";
import { TextExtractionRequest, ExtractionResult } from "./types";

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
    const { text } = req.body as TextExtractionRequest;

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
 * Search for business leads by query (Option B - future).
 * Body: { "query": "plumbers in Erie PA", "max_results": 10 }
 */
router.post("/search", async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({
    success: false,
    error: "Search extraction is coming soon. Use /extract/text or /extract/csv for now.",
    hint: "This endpoint will support Google Maps business search in a future update.",
  });
});

export default router;
