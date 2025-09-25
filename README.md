
# Rouge Dashboard

Production-grade Next.js 15 dashboard for internal operations, featuring real-time tools, AI-powered automation, robust ticketing, and a modern, responsive UI.

## Main Features & Pages

 - **Home Dashboard (`/home`)**: Central hub with tools list, search, favorites, and floating ChatbotWidget.
- **Work Tracker (`/work-tracker`)**: Track, create, edit, and manage work items with filters, search, and polling.
- **Support/Submit Request (`/Submit-Request-Form`)**: Submit support or feature requests, with ticket tracking and notifications.
- **Tools Suite (`/tools`)**:
	- **About**: Company/about info.
	- **Contact**: Support/contact form with ticketing and recent tickets.
	- **AgTech Company Automation**: Generate and analyze agtech companies using AI.
	- **AI News Daily**: Fetch, preview, and detail daily AI news.
	- **Content Idea Automation**: Generate and manage LinkedIn content calendar.
- **Analytics (`/stats`)**: View analytics via Looker Studio embed.
- **Settings (`/settings`)**: User notification and polling preferences.
- **Help (`/help`)**: Quick guides, FAQ, and documentation.
- **Unauthorized (`/unauthorized`)**: Access denied page.
- **Sign In (`/signin`)**: Google/email authentication.

## Components & Design

- **Sidebar, Topbar, MobileSidebar**: Responsive navigation and quick actions.
- **ChatbotWidget**: Floating AI assistant on all main pages.
- **CompanyTable, ContentTable, DataChart, RecentTicketsPanel**: Modular, reusable data displays.
- **Dialogs**: HelpDialog, SettingsDialog, and more.
- **UI Primitives**: Full set of shadcn/ui components (buttons, cards, tables, tabs, etc.).
- **Modern theming**: Tailwind CSS, dark/light mode, Lucide icons, Framer Motion transitions.

## API Endpoints

- `/api/companies`: CRUD for company data.
- `/api/contents`: CRUD for content calendar.
- `/api/tickets`: Support/ticketing system.
- `/api/tools`: Tools metadata and management.
- `/api/tracker`: Work item tracker.
- `/api/link-preview`: OG meta extraction for URLs.
- `/api/article`: Article excerpt and meta extraction.

## Environment Variables

See `.env.example` for all required and optional keys. Key variables include:

- `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `AI_TEAM_EMAIL`, `SLACK_WEBHOOK_URL`
- `GA4_PROPERTY_ID`, `GA_SERVICE_ACCOUNT_JSON_PATH`, `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`
- `NEXT_PUBLIC_GEMINI` (AI features)
- `ALLOWED_EMAILS`, `ALLOWED_DOMAINS`, `ALLOWED_EMAIL_PATTERNS`, `NEXT_PUBLIC_ENABLE_EMAIL_AUTH`
- `NEXT_PUBLIC_DISABLE_AUTH` (dev only)

## Getting Started

### Quick Production Setup (Recommended)

1. **Set your API keys** in `.env.local` or `.env`:
   ```bash
   DATABASE_URL=your-database-url
   DEEPSEEK_API_KEY=your-deepseek-api-key
   OPENAI_API_KEY=your-openai-api-key
   ```

2. **Install dependencies and start the application**:
   ```bash
   npm install
   npm run build
   npm start
   ```

   The application will be available at http://localhost:3000

### Manual Setup

1. Install dependencies: `npm install`
2. Set up your `.env.local` (see `.env.example`)
3. Set up database: `npm run db`
4. Run dev server: `npm run dev`
5. Build for production: `npm run build` then `npm start`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db` - Push database schema
- `npm run db:studio` - Open Drizzle Studio
- `npm run scrape:test` - Test the enterprise scraping service

## Production Checklist

1. Set all required envs (see above).
2. Run a clean build: `npm run build` and `npm start`.
3. Test all main pages and APIs.
4. Confirm ticketing, notifications, and AI features work as expected.

## License

Private/internal. All rights reserved.

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
	- Credentials provider activates when `NEXT_PUBLIC_ENABLE_EMAIL_AUTH=true` (or in dev bypass) **and** `EMAIL_AUTH_USERS` is populated. Passwords can be bcrypt hashes.
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
