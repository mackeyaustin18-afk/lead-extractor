/**
 * B2B Lead Extractor - Google Places Service
 *
 * Uses the Google Places Text Search API (New) to search for business leads.
 * Endpoint: https://places.googleapis.com/v1/places:searchText
 */

import { PlacesLead, PlacesSearchResponse } from "./types";

const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.googleMapsUri",
].join(",");

interface PlacesApiPlace {
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  googleMapsUri?: string;
}

interface PlacesApiResponse {
  places?: PlacesApiPlace[];
}

/**
 * Search for business leads using Google Places Text Search API.
 * @param query - Natural language search, e.g. "plumbers in Erie PA"
 * @param maxResults - Maximum number of results to return (1–20, default 10)
 */
export async function searchPlaces(
  query: string,
  maxResults: number = 10
): Promise<PlacesSearchResponse> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const clampedMax = Math.min(Math.max(1, maxResults), 20);

  const requestBody = {
    textQuery: query,
    pageSize: clampedMax,
  };

  const response = await fetch(PLACES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Places API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as PlacesApiResponse;
  const places = data.places ?? [];

  const leads: PlacesLead[] = places.map((place) => ({
    name: place.displayName?.text ?? null,
    phone: place.nationalPhoneNumber ?? null,
    address: place.formattedAddress ?? null,
    website: place.websiteUri ?? null,
    rating: place.rating ?? null,
    google_maps_url: place.googleMapsUri ?? null,
  }));

  return {
    success: true,
    leads,
    count: leads.length,
    query,
  };
}
