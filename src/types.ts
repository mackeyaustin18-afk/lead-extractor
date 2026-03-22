/**
 * B2B Lead Extractor - Shared Types
 */

export interface Lead {
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  source: string;  // "text", "csv", "search"
}

export interface ExtractionResult {
  success: boolean;
  leads: Lead[];
  count: number;
  errors?: string[];
}

export interface TextExtractionRequest {
  text: string;
}

export interface SearchRequest {
  query: string;         // e.g. "plumbers in Erie PA"
  max_results?: number;  // default 10
}
