# CLAUDE.md — Contact Finder CLI Client

## Context

This is a **standalone, secondary client** for an existing feature called "Contact Finder,"
which lives inside a Next.js web dashboard ("Rouge Automation Dashboard"). The dashboard
already has its own web UI at `/tools/contact-finder`.

This CLI is being built **specifically to prove the underlying REST API can be consumed from
more than one platform** (web dashboard + this CLI), which is a formal requirement for a
university internship report (KKP). It must be a genuinely separate client — do not modify,
touch, or depend on the dashboard's source code. This project stands alone and only talks to
the dashboard over HTTP.

Do not build a browser-based tool, and do not use Postman/Insomnia/curl scripts as the
deliverable — this needs to be actual custom client **code**, e.g. a Node.js CLI application.

## Goal

Build a small Node.js command-line tool that:
1. Logs in against the dashboard's existing email/password authentication (NextAuth Credentials
   provider) and persists the resulting session cookie locally.
2. Calls the existing Contact Finder REST endpoints using that session cookie.
3. Prints results in a clean, readable table format in the terminal.

## Tech stack

- Node.js (v20+), plain CommonJS or ESM — keep dependencies minimal.
- Use `commander` (or `yargs`) for CLI argument parsing.
- Use built-in `fetch` (Node 20+ has it natively — no need for axios/node-fetch).
- Use `cli-table3` for pretty terminal tables.
- Use `dotenv` to load configuration from `.env`.
- No TypeScript required (keep it simple), but fine to use if preferred.
- No database, no server — this is purely an HTTP client.

## Target server

The server this CLI talks to is the existing dashboard, either running locally
(`http://localhost:3000` during `npm run dev`) or deployed (`https://rougevc.com`).
Make the base URL configurable via `.env`:

```env
CF_BASE_URL=http://localhost:3000
CF_EMAIL=your-account@rougevc.com
CF_PASSWORD=your-password
```

## Authentication flow (IMPORTANT — this is the tricky part)

The dashboard uses **NextAuth.js** with a Credentials provider (email/password, bcrypt-hashed).
Auth is **not** a Bearer token you attach manually — it's a session cookie
(`next-auth.session-token`) that the server sets after a successful login. To log in from a
plain HTTP client (no browser), follow NextAuth's own protocol:

1. **GET** `{CF_BASE_URL}/api/auth/csrf`
   → returns `{ "csrfToken": "..." }`. Also capture any `Set-Cookie` headers from this response
   (NextAuth sets a csrf cookie you need to send back on the next request).

2. **POST** `{CF_BASE_URL}/api/auth/callback/credentials`
   Content-Type: `application/x-www-form-urlencoded`
   Body:
   ```
   csrfToken=<csrfToken from step 1>
   email=<CF_EMAIL>
   password=<CF_PASSWORD>
   json=true
   ```
   Send the cookie(s) captured in step 1 along with this request.
   On success, the response's `Set-Cookie` header will include
   `next-auth.session-token=<value>; ...` (and possibly a few other NextAuth cookies —
   capture **all** `Set-Cookie` headers returned, not just the session token one).

3. Persist all captured cookies to a local file, e.g. `~/.contact-finder-cli/session.json`,
   so the user doesn't have to log in again on every command.

4. For every subsequent authenticated request, send the stored cookies back via the
   `Cookie` request header (combine all stored `name=value` pairs, semicolon-separated).

5. If a request comes back `401 Unauthorized`, delete the stored session file and prompt the
   user to run `login` again — don't crash silently.

Implement this as a small internal `auth.js` module with:
- `login(email, password)` → performs steps 1–3, saves session file.
- `getStoredCookies()` → reads session file, returns cookie header string or null.
- `authenticatedFetch(path, options)` → wraps `fetch`, attaches stored cookie header,
  handles 401 by telling the user to re-login.

## API endpoints to call

All of these already exist on the server — do not invent new ones or change their contracts.

### `POST /api/contact-finder/search`
Request body (JSON):
```json
{ "company": "Gojek", "role": "CTO", "country": "Indonesia" }
```
Response body (JSON), abbreviated:
```json
{
  "success": true,
  "searchId": "uuid",
  "company": "Gojek",
  "role": "CTO",
  "country": "Indonesia",
  "contacts": [
    {
      "id": "uuid",
      "name": "Dito",
      "title": "VP of Technology / CTO",
      "email": "dito@gojek.com",
      "phone": "+628123456789",
      "linkedin": "linkedin.com/in/dito-example",
      "instagram": null,
      "facebook": null,
      "twitter": null,
      "source": "https://linkedin.com/in/dito-example",
      "confidence": "high",
      "createdAt": "..."
    }
  ],
  "citations": ["https://..."],
  "createdAt": "..."
}
```

### `GET /api/contact-finder/history?limit=20&offset=0`
Returns the authenticated user's past searches (paginated).

### `GET /api/contact-finder/history/{searchId}`
Returns full detail (including contacts) for one past search.

### `DELETE /api/contact-finder/history/{searchId}`
Deletes one search session.

### `DELETE /api/contact-finder/history`
Deletes **all** search history for the authenticated user. Ask for a
`y/N` confirmation prompt in the CLI before calling this — it's destructive.

## CLI commands to implement

```
contact-finder login
    Prompts are not needed if CF_EMAIL/CF_PASSWORD are set in .env — just run the login flow
    automatically using those. Print "Logged in as <email>" on success.

contact-finder search --company "Gojek" --role "CTO" --country "Indonesia"
    Calls POST /api/contact-finder/search.
    Prints a summary line (company/role/country, how many contacts found),
    then a table with columns: Name, Title, Email, Phone, LinkedIn, Confidence.
    If contacts is empty, print "No contacts found." — don't error out.

contact-finder history [--limit 20] [--offset 0]
    Calls GET /api/contact-finder/history.
    Prints a table: # | Company | Role | Country | Contacts found | Created At

contact-finder history show <searchId>
    Calls GET /api/contact-finder/history/{searchId}.
    Prints the same contact table format as `search`.

contact-finder history delete <searchId>
    Calls DELETE /api/contact-finder/history/{searchId}. Confirm before deleting.

contact-finder history clear
    Calls DELETE /api/contact-finder/history. Requires typing "yes" to confirm.
```

Add a `--help` output for every command (commander gives you this for free — use it).

## Project structure

```
contact-finder-cli/
├── .env.example
├── .gitignore              (must ignore .env and any session file)
├── package.json
├── README.md               (short usage guide — see below)
├── bin/
│   └── contact-finder.js   (CLI entrypoint, shebang #!/usr/bin/env node)
├── src/
│   ├── auth.js             (login + cookie storage + authenticatedFetch, as described above)
│   ├── api.js              (thin wrapper functions: search(), getHistory(), getHistoryDetail(),
│   │                        deleteHistoryItem(), clearHistory() — each calls authenticatedFetch)
│   ├── commands/
│   │   ├── login.js
│   │   ├── search.js
│   │   └── history.js
│   └── format.js           (cli-table3 helpers for printing contact tables / history tables)
└── package.json "bin" field pointing to bin/contact-finder.js so it can be run as
    `npx contact-finder ...` or installed globally with `npm link`.
```

## README.md for this CLI project (write this too)

Include:
1. What this is and why it exists (one paragraph — "a secondary client for the Contact Finder
   REST API, built to demonstrate multi-platform API usage").
2. Setup: `npm install`, copy `.env.example` to `.env`, fill in `CF_BASE_URL`, `CF_EMAIL`,
   `CF_PASSWORD`.
3. Usage examples for every command listed above, with example output.
4. A note that this talks to the same database/backend as the web dashboard — any search done
   here will also show up in the web dashboard's history page, and vice versa.

## Non-goals / constraints

- Do NOT modify the existing Next.js dashboard project in any way.
- Do NOT use Postman, Insomnia, curl one-liners, or any pre-built API testing tool as the
  deliverable — this must be actual application code.
- Do NOT implement Google OAuth login — email/password (Credentials provider) is sufficient
  and much simpler to automate.
- Do NOT add a database, web server, or GUI — this is a terminal-only tool.
- Keep dependencies minimal (commander, cli-table3, dotenv — that's basically it).

## Definition of done

- [ ] `npm install && npm link` (or `node bin/contact-finder.js`) runs without errors.
- [ ] `contact-finder login` successfully authenticates and stores a session.
- [ ] `contact-finder search --company X --role Y --country Z` returns real results from the
      live API and prints them as a table.
- [ ] `contact-finder history` lists past searches (including the ones made from the web
      dashboard — proving both clients hit the same backend/data).
- [ ] `contact-finder history delete <id>` and `contact-finder history clear` work with
      confirmation prompts.
- [ ] Take terminal screenshots of each command succeeding — these will be used as evidence
      of multi-platform API testing in a university report (BAB IV).
