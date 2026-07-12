# Prompt: Build Contact Finder Feature for Rouge Automation Dashboard

## Context
You are working on an existing Next.js (TypeScript) project called **Rouge Automation Dashboard**, hosted at https://rouge-automation-dashboard.vercel.app. 

Add a new **Contact Finder** feature as a new page/module inside the existing dashboard. Do NOT create a new project — integrate into the existing codebase.

---

## Feature Overview
Build an automated professional contact finder that:
1. Accepts user input: target **company name**, **target job title/role**, and **target country**
2. Generates an optimized search prompt automatically
3. Sends the prompt to the **Perplexity AI API** to search across multiple public sources
4. Parses and extracts structured contact entities from the unstructured response using NLP (Named Entity Recognition)
5. Displays and saves the structured results to a database
6. Exposes the functionality as a **REST API endpoint** with JWT authentication

---

## Pages & Routes to Create

### 1. `/contact-finder` — Main UI Page
- Form inputs:
  - Company Name (text input)
  - Target Role/Title (text input, e.g. "CTO", "Head of Investment")
  - Country (dropdown or text, e.g. "Indonesia", "Singapore")
- "Find Contacts" button → calls `/api/contact-finder/search`
- Results table showing extracted entities:
  - Full Name
  - Job Title
  - Email
  - Phone / WhatsApp
  - LinkedIn URL
  - Other Social Media (Instagram, Facebook, Twitter/X)
  - Source URL (from Perplexity citations)
  - Confidence score (high / medium / low)
- Loading state while searching
- Save to history button

### 2. `/contact-finder/history` — Search History Page
- List of past searches with timestamp
- Click to expand and see full results
- Delete search history

---

## API Endpoints to Build

### `POST /api/contact-finder/search`
**Auth**: Bearer JWT (use existing auth middleware in the project)

**Request body**:
```json
{
  "company": "string",
  "role": "string",
  "country": "string"
}
```

**What it does**:
1. Calls `generatePrompt(company, role, country)` to build the search prompt
2. Sends prompt to Perplexity API
3. Calls `parseEntities(perplexityResponse)` to extract structured data
4. Saves result to database
5. Returns structured contacts

**Response**:
```json
{
  "success": true,
  "searchId": "uuid",
  "company": "string",
  "role": "string",
  "country": "string",
  "contacts": [
    {
      "name": "string",
      "title": "string",
      "email": "string | null",
      "phone": "string | null",
      "linkedin": "string | null",
      "instagram": "string | null",
      "facebook": "string | null",
      "twitter": "string | null",
      "source": "string",
      "confidence": "high | medium | low"
    }
  ],
  "rawResponse": "string",
  "citations": ["array of source URLs from Perplexity"],
  "createdAt": "ISO timestamp"
}
```

### `GET /api/contact-finder/history`
**Auth**: Bearer JWT
Returns list of past searches for the authenticated user.

### `DELETE /api/contact-finder/history/:searchId`
**Auth**: Bearer JWT
Deletes a specific search from history.

---

## Core Functions to Implement

### `lib/contact-finder/promptGenerator.ts`
```typescript
export function generatePrompt(
  company: string,
  role: string,
  country: string
): string {
  // Build a structured multi-source search prompt
  // The prompt should instruct Perplexity to search:
  // 1. LinkedIn profiles
  // 2. Company website (About/Team page)
  // 3. Facebook
  // 4. Instagram
  // 5. Twitter/X
  // 6. Government business registry for the target country:
  //    - Indonesia: AHU (ahu.go.id)
  //    - Singapore: ACRA (acra.gov.sg)
  //    - Malaysia: SSM (ssm.com.my)
  //    - Hong Kong: CR (cr.gov.hk)
  //    - Other countries: general business registry search
  // 7. GitHub (for tech roles)
  //
  // The prompt must instruct Perplexity to return confirmed public data only.
  // Output format: For each person found:
  // Name | Title | Email | Phone | LinkedIn | Other socials | Source URL
  
  const countryRegistries: Record<string, string> = {
    'indonesia': 'ahu.go.id',
    'singapore': 'acra.gov.sg',
    'malaysia': 'ssm.com.my',
    'hong kong': 'cr.gov.hk',
  }
  
  const registry = countryRegistries[country.toLowerCase()] ?? 'government business registry'
  
  return `
Find the ${role} at ${company} (${country}).
Search across: LinkedIn, company website team/about page, Facebook, Instagram, Twitter/X, ${registry}, and GitHub.
For each person found, provide confirmed public information only:
- Full Name
- Job Title
- Email address
- Phone or WhatsApp number
- LinkedIn URL
- Instagram, Facebook, Twitter/X handles or URLs
- Source URL where this info was found

Return confirmed data only. No speculation or unverified claims.
Format each contact clearly separated.
  `.trim()
}
```

### `lib/contact-finder/entityExtractor.ts`
```typescript
export interface ContactEntity {
  name: string
  title: string
  email: string | null
  phone: string | null
  linkedin: string | null
  instagram: string | null
  facebook: string | null
  twitter: string | null
  source: string
  confidence: 'high' | 'medium' | 'low'
}

export function parseEntities(rawText: string, citations: string[]): ContactEntity[] {
  // NLP Named Entity Recognition pipeline:
  //
  // Step 1: Split raw text into blocks per person
  //         (split by double newline or numbered list pattern)
  //
  // Step 2: For each block, extract entities using regex:
  //   - Email:    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  //   - Phone:    /(\+?[\d\s\-().]{7,15})/g
  //   - LinkedIn: /linkedin\.com\/in\/[a-zA-Z0-9\-]+/g
  //   - Instagram:/instagram\.com\/[a-zA-Z0-9._]+/g
  //   - Facebook: /facebook\.com\/[a-zA-Z0-9.]+/g
  //   - Twitter:  /(?:twitter|x)\.com\/[a-zA-Z0-9_]+/g
  //
  // Step 3: Extract name using capitalized word pattern
  //         near title keywords (CEO, CTO, Director, Head of, etc.)
  //
  // Step 4: Match source URL from citations array
  //
  // Step 5: Assign confidence score:
  //   - high:   email AND (linkedin OR phone) both found
  //   - medium: linkedin OR phone found (not both)
  //   - low:    name only, no verifiable contact found
  //
  // Step 6: Deduplicate by name similarity
  //
  // Return array of ContactEntity
}
```

### `lib/contact-finder/perplexityClient.ts`
```typescript
export interface PerplexityResponse {
  text: string
  citations: string[]
}

export async function searchWithPerplexity(prompt: string): Promise<PerplexityResponse> {
  // Call Perplexity API
  // Endpoint: https://api.perplexity.ai/chat/completions
  // Model: "llama-3.1-sonar-large-128k-online" (has web search built-in)
  // API key from env: PERPLEXITY_API_KEY
  //
  // Request body:
  // {
  //   model: "llama-3.1-sonar-large-128k-online",
  //   messages: [{ role: "user", content: prompt }],
  //   return_citations: true
  // }
  //
  // Extract response text from choices[0].message.content
  // Extract citations from response.citations array
  // Return { text, citations }
}
```

---

## Database Schema (add to existing DB)

```sql
-- Search sessions
CREATE TABLE contact_finder_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  country TEXT NOT NULL,
  raw_response TEXT,
  citations JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Extracted contacts per search
CREATE TABLE contact_finder_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES contact_finder_searches(id) ON DELETE CASCADE,
  name TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  linkedin TEXT,
  instagram TEXT,
  facebook TEXT,
  twitter TEXT,
  source TEXT,
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Environment Variables to Add
```env
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

---

## Tech Stack (match existing dashboard)
- **Framework**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS (match existing dashboard UI)
- **Auth**: Use existing JWT middleware in the project
- **Database**: Use existing database connection (PostgreSQL/Prisma/Drizzle — match whatever is already used)
- **API calls**: fetch or axios (match existing pattern)

---

## Important Notes
1. Match the existing dashboard's UI design exactly — use same components, colors, layout
2. Use existing auth middleware — do NOT create new auth logic
3. Use existing database connection — do NOT create new DB setup
4. All new files go in logical folders following the existing project structure
5. Add the Contact Finder link to the existing sidebar/navigation
6. Handle errors gracefully — show user-friendly messages if Perplexity API fails or returns no results
7. The `parseEntities` function is the core NLP method — make it robust and well-commented as this is the academic contribution of the research
8. Store Perplexity citations separately — these become the "source" field and strengthen the academic validity of results
