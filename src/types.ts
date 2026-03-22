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

// --- Google Places (Option B) ---

export interface PlacesSearchRequest {
  query: string;         // e.g. "plumbers in Erie PA"
  max_results?: number;  // default 10, max 20
  location?: string;     // optional location hint (appended to query if provided)
}

export interface PlacesLead {
  name: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  rating: number | null;
  google_maps_url: string | null;
}

export interface PlacesSearchResponse {
  success: boolean;
  leads: PlacesLead[];
  count: number;
  query: string;
}
