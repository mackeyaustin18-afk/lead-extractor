/**
 * B2B Lead Extractor - Gemini Extraction Service
 *
 * Handles all communication with Google's Gemini API.
 * Extracts structured lead data from raw text.
 *
 * Key improvements over the original:
 * - Supports MULTIPLE leads per text block (not just one)
 * - Phone number extraction added
 * - Better prompt engineering for accuracy
 * - Proper error handling without crashing
 * - No dependency on external json-repair library
 */

import { Lead } from "./types";

const GEMINI_MODEL = "gemini-2.5-flash-lite";

/**
 * Extract leads from a block of raw text using Gemini.
 */
export async function extractFromText(text: string): Promise<Lead[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 5) {
    return [];
  }

  // Cap input to ~8000 chars to stay within reasonable token limits
  const input = trimmed.slice(0, 8000);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: [
              "Extract ALL B2B contact leads from the following text.",
              "Return a JSON array of objects. Each object must have exactly these keys:",
              '  first_name (string or null)',
              '  last_name (string or null)',
              '  company (string or null)',
              '  job_title (string or null)',
              '  email (string or null)',
              '  phone (string or null)',
              "",
              "Rules:",
              "- Return an empty array [] if no contact information is found.",
              "- Extract every distinct person mentioned, not just the first one.",
              "- Use null for any field you cannot determine.",
              "- Do NOT invent or guess information. Only extract what is explicitly stated.",
              "- Return ONLY the JSON array, no explanation or markdown.",
              "",
              "Text to extract from:",
              "---",
              input,
              "---",
            ].join("\n"),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown");
    throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  // Parse the response — handle both array and single object
  let parsed: unknown;
  try {
    // Clean potential markdown code fences
    const cleaned = rawJson.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse Gemini response:", rawJson.slice(0, 200));
    return [];
  }

  // Normalize to array
  const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

  // Validate and sanitize each lead
  const leads: Lead[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const raw = item as Record<string, unknown>;

    const lead: Lead = {
      first_name: typeof raw.first_name === "string" ? raw.first_name : null,
      last_name: typeof raw.last_name === "string" ? raw.last_name : null,
      company: typeof raw.company === "string" ? raw.company : null,
      job_title: typeof raw.job_title === "string" ? raw.job_title : null,
      email: typeof raw.email === "string" ? raw.email : null,
      phone: typeof raw.phone === "string" ? raw.phone : null,
      source: "text",
    };

    // Skip completely empty leads
    const hasData = lead.first_name || lead.last_name || lead.company ||
                    lead.email || lead.phone;
    if (hasData) {
      leads.push(lead);
    }
  }

  return leads;
}
