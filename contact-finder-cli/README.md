# Contact Finder CLI Client

A standalone command-line interface (CLI) client for the Contact Finder API. This project is a secondary, independent client built specifically to demonstrate that the Contact Finder REST API can be consumed from more than one platform (the Next.js Web Dashboard and this Node.js CLI client), which is a key requirement for the university internship report (KKP).

This CLI communicates with the main dashboard backend via HTTP using NextAuth credentials session cookies. Any searches performed here will immediately show up in the web dashboard's history page, and vice versa, as they both hit the same backend database.

## Setup

1. **Install dependencies:**
   Navigate to the `contact-finder-cli` folder and install packages:
   ```bash
   npm install
   ```

2. **Link the command globally (Optional):**
   ```bash
   npm link
   ```
   After linking, you can run the tool directly as `contact-finder <command>`. Otherwise, run it via Node: `node bin/contact-finder.js <command>`.

3. **Configure environment variables:**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your credentials and the target server URL:
   ```env
   CF_BASE_URL=http://localhost:3000
   CF_EMAIL=rafihernawan.rouge@gmail.com
   CF_PASSWORD=your-dashboard-password
   ```

## Usage

### 1. Login
Authenticate against the server and save the session cookie:
```bash
contact-finder login
```
*Output:*
```
Fetching CSRF token...
Authenticating...
Successfully logged in as rafihernawan.rouge@gmail.com
```

### 2. Search Contacts
Search for professional contacts by company, role, and optionally country:
```bash
contact-finder search --company "Gojek" --role "CTO" --country "Indonesia"
```
*Output:*
```
Searching for "CTO" at "Gojek" (Indonesia)...

Found 1 contact(s) for "CTO" at "Gojek" (Indonesia)
┌──────┬───────┬───────┬───────┬──────────┬────────────┐
│ Name │ Title │ Email │ Phone │ LinkedIn │ Confidence │
├──────┼───────┼───────┼───────┼──────────┼────────────┤
│ ...  │ ...   │ ...   │ ...   │ ...      │ HIGH       │
└──────┴───────┴───────┴───────┴──────────┴────────────┘
```

### 3. View Search History
List recent search history:
```bash
contact-finder history
```
*Output:*
```
Fetching history (limit: 20, offset: 0)...
┌───┬──────────────────────────────────────┬───────────────┬───────────────────┬───────────┬─────────────────────┐
│ # │ Search ID                            │ Company       │ Role              │ Country   │ Created At          │
├───┼──────────────────────────────────────┼───────────────┼───────────────────┼───────────┼─────────────────────┤
│ 1 │ 0f0fb226-f786-449e-bfbd-4a486e6ddb42 │ rouge venture │ managing director │ Hong Kong │ 7/12/2026, 2:30 PM  │
└───┴──────────────────────────────────────┴───────────────┴───────────────────┴───────────┴─────────────────────┘
```

### 4. Show Search Details
View contacts extracted from a specific search session:
```bash
contact-finder history show 0f0fb226-f786-449e-bfbd-4a486e6ddb42
```

### 5. Delete a Search Session
```bash
contact-finder history delete 0f0fb226-f786-449e-bfbd-4a486e6ddb42
```

### 6. Clear All History
```bash
contact-finder history clear
```
