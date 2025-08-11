# Rouge Dashboard

A production-grade Next.js 15 App Router dashboard for internal operations. It ships with authentication, a Postgres-backed data model (Drizzle ORM + Neon), typed API routes, and polished UI using shadcn/ui and Recharts.

## What’s new

- Fixed: Sidebar sign-out button overflowing/overlapping. Footer is now stable with scrollable nav.
- Fixed: Settings/Help dialogs blocking clicks after closing. Overlays now disable pointer events while animating out.
- Fixed: Dashboard showed 0 tools. GET /api/tools is now public and returns discovered defaults (Analytics, Work Tracker, AI News Daily, Content Idea Automation, ASEAN University Data Extractor) even without a DB.
- Auth: If no allowlist envs are set, any authenticated user is allowed. “rouge” emails are accepted by default. Optional env `NEXT_PUBLIC_ENABLE_EMAIL_AUTH=true` enables credentials auth in production; credentials are always enabled in development.

## Stack

- Next.js 15 (App Router, Server/Client Components)
- TypeScript, ESLint (Next config)
- Authentication: NextAuth (Google provider or dev credentials), route guard middleware
- Database: Drizzle ORM over Neon/Postgres (HTTP serverless driver)
- UI: Tailwind CSS, shadcn/ui primitives, Lucide icons, Framer Motion
- Charts: Recharts
- Forms/Validation: React Hook Form + Zod
- Notifications: sonner

## Features

- Auth with allowlist and flexible dev bypass
	- Allow specific emails, domains, or patterns (see `lib/auth.ts`)
	- Dev bypass via `NODE_ENV=development` or `NEXT_PUBLIC_DISABLE_AUTH=true`
	- Middleware guards dashboard/routes
- Tools dashboard with progress and ticket intake
- Work Tracker: filter/search/sort/paginate, inline edits and polling refresh
- Company automation (AgTech): generate and persist company profiles using Gemini
- Content calendar generator (LinkedIn content): generate/schedule and persist entries
- AI News Daily: fetches a daily list, previews OG meta, detail page with summary, reader excerpt
- CRUD APIs (protected) for Companies, Contents, Tools, Tickets, Work Tracker
- Link Preview and Article extraction APIs with timeouts and basic sanitization

## Design system

- Layout
	- `AppSidebar` fixed on the left with collapsible state persisted in `localStorage` and CSS var `--sidebar-width` to offset content.
	- `Topbar` sticky header (Suspense-wrapped) with global search, filters, theme toggle, quick-create, notifications, and profile menu.
	- Page containers use dark theme surfaces with rounded corners, subtle borders, and motion transitions via Framer Motion.
- Components
	- shadcn/ui primitives: buttons, inputs, selects, dropdowns, dialogs, tables, tabs, tooltips, cards.
	- Charts via `components/ui/chart.tsx` with custom tooltip/legend integration and Tailwind-driven theming.
	- Reusable tables (`CompanyTable`, `ContentTable`) and panels (`RecentTicketsPanel`).
- Theming
	- `next-themes` to toggle light/dark; Tailwind classes drive color tokens.
	- Iconography via `lucide-react`.

## Monorepo structure (high-level)

- app/ — routes (App Router)
	- (auth)/signin — sign-in page
	- (route)/layout.tsx — shared layout with `Topbar` and `AppSidebar`
	- (route)/dashboard — main dashboard
	- (route)/stats — stats page
	- (route)/tools — tools hub with multiple utilities
		- agtech-company-automation — generate/analyze companies
		- ai-news-daily — news list and `[id]` detail
		- contact — request/ticket form
		- content-idea-automation — content calendar (WIP)
	- api/ — route handlers
		- analytics, article, auth, companies, contents, link-preview, tickets, tools, tracker
- components/ — UI building blocks (Topbar, charts, tables, etc.)
- lib/ — auth config, AI helpers, GA
- utils/ — Drizzle schema and DB config
- types/ — shared types

## Environment variables

Create `.env.local` with:

- DATABASE_URL: Postgres connection URI
- NEXTAUTH_URL: http://localhost:3000 or deployed URL
- NEXTAUTH_SECRET: long random string
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: for Google auth
- NEXT_PUBLIC_GEMINI: Google Generative AI API key (Gemini)
- SLACK_WEBHOOK_URL: optional, to notify on ticket creation
- NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: optional analytics ID
- GA4_PROPERTY_ID: GA4 Property ID for server-side realtime analytics API
 - ALLOWED_EMAILS: comma-separated allowlist, optional
 - ALLOWED_DOMAINS: comma-separated domains, optional
 - ALLOWED_EMAIL_PATTERNS: comma-separated regexes (e.g. ^user@domain\.com$), optional
 - NEXT_PUBLIC_ENABLE_EMAIL_AUTH: set to "true" to allow credentials auth in production (dev is always enabled)
 - NEXT_PUBLIC_BASE_URL: base URL for server-to-server proxy calls
 - GA_SERVICE_ACCOUNT_JSON_PATH: optional absolute/relative path to GA service JSON

### Production checklist

1. Set DATABASE_URL to your Postgres/Neon instance.
2. Set NEXTAUTH_URL (your public domain) and NEXTAUTH_SECRET (long random string).
3. Configure Google OAuth: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
4. Set ALLOWED_EMAILS/ALLOWED_DOMAINS/ALLOWED_EMAIL_PATTERNS as needed.
5. Optional: NEXT_PUBLIC_GEMINI for content generation; GA4_PROPERTY_ID if using analytics.
6. Ensure NEXT_PUBLIC_BASE_URL is your public domain; keep NEXT_PUBLIC_DISABLE_AUTH=false.
7. Build and start:
	- npm run build
	- npm start

## Getting started

- Install deps
```powershell
npm install
```

- Run dev server
```powershell
npm run dev
```

- Database setup (Drizzle + Neon)
	- Define schema in `utils/schema.tsx`
	- Ensure `DATABASE_URL` is set
	- Push schema
```powershell
npm run db
```

- Drizzle Studio
```powershell
npm run db:studio
```

- Build & start
```powershell
npm run build
npm start
```

If you see SWC warnings on Windows but build succeeds, ensure 64-bit Node 20+, then reinstall dependencies if needed.

## Production checklist

1) Set all required envs: DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID/SECRET (or keep credentials provider), ALLOWED_* as needed.
2) Optional: GA4_PROPERTY_ID and GA_SERVICE_ACCOUNT_JSON_PATH if using /api/analytics; NEXT_PUBLIC_GEMINI for server-side generation.
3) Disable dev bypass: ensure NEXT_PUBLIC_DISABLE_AUTH is not set.
4) Run a clean build: `npm run build`. Start with `npm start`.
5) Verify APIs (200s): /api/tools, /api/tickets, /api/tracker, /api/contents, /api/analytics (if configured).
6) Confirm Tools dashboard shows the discovered defaults or DB-backed entries.

## Authentication behavior

- Providers
	- Uses Google if GOOGLE_CLIENT_ID/SECRET are present
	- Credentials provider is enabled in development; in production set `NEXT_PUBLIC_ENABLE_EMAIL_AUTH=true` to allow it
- Allowlist
	- If ALLOWED_* is not configured, any authenticated user can sign in. “.rouge@gmail.com” emails are explicitly allowed.
	- Otherwise, allow by specific emails, domains, or patterns (see `lib/auth.ts`).
- Bypass in dev
	- `NODE_ENV=development` or `NEXT_PUBLIC_DISABLE_AUTH=true` allows everything
- Middleware
	- `app/(route)/layout.tsx` renders `Topbar` (Suspense wrapped) and guards access to route group with middleware

## API endpoints (protected)

All write operations require a session; in development, the bypass allows local testing without OAuth.

- Companies: `/api/companies`
	- GET — list companies
	- POST — create
	- In dev without DB vars, uses in-memory storage
- Contents: `/api/contents`
	- GET — list entries
	- POST — create
	- In dev without DB vars, uses in-memory storage
- Tickets: `/api/tickets`
	- GET — list tickets
	- POST — create; optional Slack notification if `SLACK_WEBHOOK_URL` set
- Tools: `/api/tools`
	- GET — list tools (public, returns discovered defaults when DB is empty)
	- POST — create (persists only columns present in DB schema)
- Work Tracker: `/api/tracker`
	- GET — query with filters q, unit, status; sort; pagination page/pageSize (dev memory or DB)
	- POST — create item
	- `/api/tracker/[id]`: PUT, PATCH, DELETE for updates/removal
- Link preview: `/api/link-preview?url=...` — extracts og:title/description/image with timeout
- Article excerpt: `/api/article?url=...&max=1200` — extracts safe excerpt, site meta, word count (no full content)

## UI highlights

- `components/Dashboard.tsx`
	- Displays Tools and Tickets, polling refresh
	- Ticket creation form with validations, draft persistence to localStorage, CSV export
- `app/(route)/work-tracker/page.tsx`
	- Rich table with search, filters, sort, resize, pagination, polling, and edit dialogs
- `app/(route)/tools/agtech-company-automation/page.tsx`
	- Generate Companies via Gemini, persist with `/api/companies`, analyze selected company via Gemini
- `app/(route)/tools/ai-news-daily`
	- `page.tsx`: Fetches daily news list (Google Apps Script), caches to localStorage, previews OG images
	- `[id]/page.tsx`: Detail view with Suspense-wrapped `useSearchParams`, preview image, reader excerpt, summary, and share/copy

## Drizzle schema (summary)

- Companies `companyDetails`: companyName, region, contacts, booleans for mailing list states
- LinkedinContent `linkedinContent`: planning calendar fields
- WorkTracker `workTracker`: unit/task/assignee/status/dates/update
- Tools `tools`: cards for dashboard modules
- Tickets `tickets`: structured request data fields

See `utils/schema.tsx` for column details.

## Development tips

- Shell integration: enable VS Code’s PowerShell shell integration to get command detection and output navigation
	- Add to `$PROFILE`:
```powershell
if ($env:TERM_PROGRAM -eq "vscode") { . "$(code --locate-shell-integration-path pwsh)" }
```
- Fix SWC Windows warning: install 64-bit Node 20+, clear node_modules and reinstall
- Suspense requirements: client pages using `useSearchParams` should be wrapped in `<Suspense>` (we already did for AI News detail and Topbar)

## Troubleshooting

- UNAUTHORIZED in APIs locally: set `NEXT_PUBLIC_DISABLE_AUTH=true` or sign in via Google with an allowed email
- DATABASE_URL not set: APIs will fall back to in-memory arrays for local dev; set Postgres URL for persistence
- Link preview/article fetches fail: remote sites may block bots; try again or provide alternate URLs

## License

Private/internal. All rights reserved.

## Pages and functionality

- Home/Dashboard: `/dashboard`
	- Summary cards of Tools and Tickets with polling refresh (15s).
	- Ticket intake form with Zod validations, localStorage draft, CSV export for tickets.
	- Recent Tickets panel with quick status context.
- Analytics: `/stats`
	- Embeds analytics via `LookerEmbed` inside a styled container.
- Work Tracker: `/work-tracker`
	- Rich table for tracking work items with search, unit/status filters, sort by multiple columns, pagination.
	- Create, edit (PUT/PATCH), delete (DELETE) items through API; background polling and change detection toasts.
	- Column resizing, hide/show, and responsive layout.
- Tools
	- About: `/tools/about` — static informational page.
	- AI News Daily: `/tools/ai-news-daily`
		- Fetches a daily message (Google Apps Script endpoint), parses into articles, caches in localStorage with TTL.
		- OG preview fetch via `/api/link-preview` and list/grid with images, copy/share actions.
		- Detail page `/tools/ai-news-daily/[id]` (Suspense-wrapped for search params) loads OG preview and reader excerpt via `/api/article`; local summary generation, copy summary.
		- Pagination and keyword search on the list view.
	- Contact: `/tools/contact`
		- Full ticket form (title, description, criticality, optional fields); attachments are client-only (data URLs) and not persisted to DB.
		- Submits to `/api/tickets` with Slack webhook notification if configured.
	- AgTech Company Automation: `/tools/agtech-company-automation`
		- Generate 8+ companies with Gemini (`lib/aiGenerate.ts`), sanitize and persist via `/api/companies`.
		- Company analytics (charts) and analysis per selected company via Gemini.
	- Content Idea Automation: `/tools/content-idea-automation` (scaffold present) — LinkedIn content calendar generation backed by `/api/contents`.
- Auth
	- Sign-in: `/signin` (under `(auth)` route group), Google or dev credentials depending on env.
	- Unauthorized: `/unauthorized` static page for blocked users.

## Analytics & Reporting

This project supports two analytics paths: a GA4 realtime API endpoint and an embedded Looker Studio report.

- GA4 Realtime API
	- Endpoint: `GET /api/analytics`
	- Reads `GA4_PROPERTY_ID` from environment. There is a hardcoded fallback (`452314459`) for local dev, but you still need credentials.
	- Credentials: Service account JSON file at `config/google-analytics-service.json` with scope `https://www.googleapis.com/auth/analytics.readonly`.
	- Response: Raw response from Analytics Data API v1beta `properties.runRealtimeReport` with `dimensions: country` and `metrics: activeUsers`.
	- Failure behavior: If credentials/property are misconfigured, the API returns `{ users: 0, error: "analytics unavailable" }` with HTTP 200 to avoid front-end crashes.

- Looker Studio Embed
	- Component: `components/LookerEmbed.tsx`
	- Replace the `src` URL with your own Looker Studio report. The iframe allows fullscreen and is sandboxed appropriately.

GA4 setup steps

1) Create a GA4 property and note its Property ID (Admin → Property Settings). Set `GA4_PROPERTY_ID` in your environment.
2) In Google Cloud Console, create a Service Account (or reuse one) and enable the “Google Analytics Data API”.
3) Generate a JSON key for the service account and save it locally as `config/google-analytics-service.json`.
4) In GA4 Admin → Property Access Management, grant the service account email Viewer/Analyst access to the property.
5) Do not commit the key. It’s ignored by `.gitignore` (see `/config/google-analytics-service.json`). For deployment, mount or provision the key file at the same path.

Notes

- You may also choose to store a web analytics tag separately via `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` (client-side), which is optional and independent from the server-side GA4 Data API.
- If you change the metrics/dimensions in `lib/ga.ts`, ensure the front-end consumer understands the new response shape.
