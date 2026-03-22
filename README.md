# B2B Lead Extractor API

## What This Does

**Option A (shipping now):** REST API that accepts raw text and returns structured lead data (name, company, title, email). Powered by Gemini.

**Option B (building toward):** Full lead extraction with actual data sources — Google Maps, web scraping, CSV upload.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/extract/text` | Parse raw text into structured leads |
| POST | `/extract/csv` | Upload CSV, extract and clean leads (Option B) |
| POST | `/extract/search` | Search Google Maps for business leads (Option B) |
| GET | `/health` | Health check |

## Setup

```bash
npm install
cp .env.example .env
# Add your GEMINI_API_KEY to .env
npm run dev    # development
npm start      # production
```

## Deploy to Railway (free tier)

```bash
# 1. Push to GitHub
# 2. Connect repo in Railway dashboard
# 3. Add GEMINI_API_KEY env var
# 4. Deploy — done
```

## Example Usage

```bash
curl -X POST http://localhost:3000/extract/text \
  -H "Content-Type: application/json" \
  -d '{"text": "John Smith is the VP of Sales at Acme Corp. Reach him at john.smith@acme.com"}'
```

Response:
```json
{
  "success": true,
  "leads": [
    {
      "first_name": "John",
      "last_name": "Smith",
      "company": "Acme Corp",
      "job_title": "VP of Sales",
      "email": "john.smith@acme.com"
    }
  ],
  "count": 1
}
```
