# Senior Setup Checklist (Production)

This project is production-ready. Only environment configuration and platform wiring remain. Follow this checklist end-to-end.

## 1) Required environment variables

Set these in your hosting provider (Vercel → Project → Settings → Environment Variables) for Production and Preview scopes.

- NEXTAUTH_URL: https://your-domain.com
- NEXTAUTH_SECRET: Strong random string (32+ chars)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: From Google Cloud OAuth
- DATABASE_URL: Postgres/Neon connection string
- ALLOWED_DOMAINS: company.com[,subsidiary.com]
- Optional: ALLOWED_EMAILS, ALLOWED_EMAIL_PATTERNS

Optional but supported:
- NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
- GA4_PROPERTY_ID
- GA_SERVICE_ACCOUNT_JSON_PATH (see Analytics section)
- SLACK_WEBHOOK_URL
- NEXT_PUBLIC_GEMINI

Reference template: .env.example

## 2) Google OAuth (NextAuth)

Create OAuth 2.0 Client (Web) in Google Cloud Console.
- Scopes: openid, email, profile
- Authorized redirect URIs (add both):
  - https://your-domain.com/api/auth/callback/google
  - http://localhost:3000/api/auth/callback/google (for local dev)
- Copy Client ID and Secret to envs.

Note on access control
- If ALLOWED_* are empty, any signed-in Google user is allowed. In production, set ALLOWED_DOMAINS or ALLOWED_EMAILS.

## 3) Database (Neon/Postgres)

Use a pooled connection string (Neon recommended). Set DATABASE_URL.
- Driver: drizzle-orm + @neondatabase/serverless (HTTP driver)
- Push schema once:

```powershell
# local, with DATABASE_URL set
npm run db
```

Tables are defined in utils/schema.tsx.

## 4) Vercel project settings

- Build command: npm run build
- Install command: npm install
- Output directory: .next
- Node version: 20.x
- Regions: choose nearest users/DB region
- Environment variables: set for Production and Preview

## 5) Analytics (optional)

Server-side GA4 endpoint (/api/analytics) needs a service account with access to your GA property.
- GA4_PROPERTY_ID: your GA4 property ID
- Service account: grant Viewer to GA property

Credential options:
- Preferred: store service JSON content in an env (e.g., GA_SERVICE_ACCOUNT_JSON) and write it to /tmp at runtime, then point GA_SERVICE_ACCOUNT_JSON_PATH to that file. Minor code change may be made later if you prefer this approach.
- Quick start: commit a file under config/google-analytics-service.json and set GA_SERVICE_ACCOUNT_JSON_PATH to that path. (This repo ignores that file by default; do not commit real keys.)

Client analytics: set NEXT_PUBLIC_GOOGLE_ANALYTICS_ID (optional) for client-only tracking.

## 6) Slack notifications (optional)

- Set SLACK_WEBHOOK_URL to enable automatic message on ticket creation (/api/tickets POST).

## 7) Security toggles

- Ensure NEXT_PUBLIC_DISABLE_AUTH is NOT set in production.
- Set at least ALLOWED_DOMAINS in production.

## 8) Post-deploy smoke tests

- Sign-in:
  - Visit https://your-domain.com/signin → Google sign-in prompt
  - With allowed email: redirect to /dashboard
  - With disallowed email: redirected to /unauthorized

- APIs (expect 401 when not signed in):
  - GET /api/tools, /api/tickets, /api/tracker, /api/contents → 401 (unauthorized) when no session
  - After sign-in: 200 with JSON

- Middleware protection: navigating to /dashboard, /stats, /settings, /work-tracker, /tools/* without a session should redirect to /signin.

## 9) Rollback & logs

- Vercel → Deployments → select previous successful deployment → Promote to Production.
- Inspect server logs in Vercel for API errors.

## 10) Useful commands (local)

```powershell
# Install
npm install

# Run dev
npm run dev

# Typecheck & build
npm run build

# Drizzle schema push
npm run db
```

## Quick reference – where things are enforced

- Auth providers and allowlist: lib/auth.ts
- Route protection (pages): middleware.ts (matcher covers /dashboard, /stats, /help, /settings, /work-tracker, /tools/*)
- API session guard: lib/apiAuth.ts used in each route; 401 returned on UNAUTHORIZED
- DB driver & schema: utils/dbConfig.tsx, utils/schema.tsx
- Sign-in UI (Google in prod): app/(auth)/signin/page.tsx

---
This checklist is the only outstanding work for production. After setting envs and running a deploy, the app is ready.
