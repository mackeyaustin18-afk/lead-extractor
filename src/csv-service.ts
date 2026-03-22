/**
 * B2B Lead Extractor - CSV Processing Service
 *
 * Handles CSV file uploads containing messy lead data.
 * Uses Gemini to clean and structure each row.
 *
 * This is an Option B feature — processes uploaded spreadsheets
 * of messy contact data into clean, structured leads.
 */

import { parse } from "csv-parse/sync";
import { Lead } from "./types";
import { extractFromText } from "./gemini";

const MAX_ROWS = 100;  // Limit per upload to control API costs
const BATCH_SIZE = 5;  // Process 5 rows per Gemini call for efficiency

/**
 * Parse a CSV buffer and extract leads from each row.
 */
export async function extractFromCSV(buffer: Buffer, filename: string): Promise<{
  leads: Lead[];
  errors: string[];
}> {
  const errors: string[] = [];
  let records: string[][];

  try {
    records = parse(buffer, {
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    });
  } catch (e) {
    return { leads: [], errors: [`Failed to parse CSV: ${e}`] };
  }

  if (records.length === 0) {
    return { leads: [], errors: ["CSV file is empty"] };
  }

  // Take header + up to MAX_ROWS data rows
  const header = records[0];
  const dataRows = records.slice(1, MAX_ROWS + 1);

  if (dataRows.length === 0) {
    return { leads: [], errors: ["CSV has headers but no data rows"] };
  }

  if (records.length > MAX_ROWS + 1) {
    errors.push(`CSV truncated to ${MAX_ROWS} rows. Upload had ${records.length - 1} data rows.`);
  }

  // Batch rows into text blocks for efficient Gemini processing
  const allLeads: Lead[] = [];

  for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
    const batch = dataRows.slice(i, i + BATCH_SIZE);

    // Convert rows to readable text with headers
    const textBlock = batch
      .map((row) => {
        return row
          .map((cell, idx) => `${header[idx] || `Column ${idx + 1}`}: ${cell}`)
          .join(", ");
      })
      .join("\n");

    try {
      const leads = await extractFromText(textBlock);
      for (const lead of leads) {
        lead.source = "csv";
      }
      allLeads.push(...leads);
    } catch (e) {
      errors.push(`Error processing rows ${i + 1}-${i + batch.length}: ${e}`);
    }

    // Brief delay between batches to respect rate limits
    if (i + BATCH_SIZE < dataRows.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return { leads: allLeads, errors };
}
