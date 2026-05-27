# SkillMap Chrome Extension

Import job listings from **LinkedIn**, **Indeed**, **Greenhouse**, **Lever**, and most career pages into your SkillMap account.

## Architecture (Manifest V3)

```
┌─────────────────────────────────────────────────────────────┐
│  Career site (LinkedIn, Indeed, …)                          │
│    content-script.ts  →  site extractors + JSON-LD          │
│    returns ExtractedJob to popup on request (no page storage) │
└───────────────────────────┬─────────────────────────────────┘
                            │ chrome.runtime.sendMessage
┌───────────────────────────▼─────────────────────────────────┐
│  service-worker.ts (background)                               │
│    JWT login / refresh · POST /api/jobs/import/              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  popup/popup.html  — review fields, edit, Import             │
│  options/options.html  — API URL + sign in                   │
└─────────────────────────────────────────────────────────────┘
```

| Piece | Role |
|--------|------|
| **Content script** | Runs on job pages; extracts title, company, description, URL |
| **Background worker** | Holds auth tokens; calls Django API (no page-origin CORS issues) |
| **Popup** | Shows detected job; lets you edit before import |
| **Options** | API base URL + SkillMap email/password (same as web app) |

Extraction order: **LinkedIn** → **Indeed** → **JSON-LD `JobPosting`** → **generic** (OG tags + headings).

## Prerequisites

- SkillMap backend running (`docker compose up`)
- A SkillMap user account (register in the web app first)
- Node.js 18+

## Setup (first time)

### 1. Build the extension

```bash
cd extension
npm install
npm run build
```

Re-run `npm run build` after any TypeScript change (or `npm run watch` during development).

### 2. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder (the one containing `manifest.json`)

### 3. Configure & sign in

1. Click the extension icon → **⚙** (or right-click → Options)
2. Set **API base URL** to `http://localhost:8000` (or your deployed backend)
3. Sign in with your SkillMap **email** and **password**
4. Click **Save API URL** if you changed it

### 4. Import a job

1. Open a job posting, e.g. `https://www.linkedin.com/jobs/view/…`
2. Wait a second for the page to finish loading
3. Click the SkillMap extension icon
4. Review / edit the fields
5. Click **Import to SkillMap**

The job appears in the app **Jobs Feed**. Skill extraction runs in the background (same as scraped jobs).

## API endpoint

The extension uses JWT auth (not the internal scraper key):

```
POST /api/jobs/import/
Authorization: Bearer <access_token>
```

Body matches the scraper ingest schema: `title`, `company`, `location`, `job_type`, `category`, `description`, `url`, optional `posted_at`.

## Permissions

| Permission | Why |
|------------|-----|
| `storage` | Save JWT + API URL (popup/background only — not used in content scripts) |
| `activeTab` | Read the current tab when you open the popup |
| `scripting` | Reserved for future on-demand injection |
| `host_permissions` `https://*/*` | Run content script on career sites; call your API |

The content script is **excluded** from `localhost:5173` (SkillMap frontend) to avoid noise.

## Production / CORS

When `DJANGO_DEBUG=False`, add your frontend origin to `CORS_ALLOWED_ORIGINS`. Chrome extension origins are allowed via:

```python
CORS_ALLOWED_ORIGIN_REGEXES = [r"^chrome-extension://[a-p]{32}$"]
```

Each unpacked install gets a stable extension ID; published Chrome Web Store builds use a fixed ID.

## Troubleshooting

| Issue | Fix |
|--------|-----|
| “No job detected” | Use a direct job URL (`/jobs/view/`, `viewjob`, etc.), not search results |
| “Not signed in” | Open Options and sign in again |
| “Cannot reach API” | Check Docker / API URL; try `http://127.0.0.1:8000` |
| LinkedIn fields empty | Click **Re-detect** after the page fully loads; LinkedIn is a SPA |
| Import says already exists | Same URL is already in SkillMap (by design) |

## Development

```bash
npm run watch   # rebuild on save
```

Then **Reload** the extension on `chrome://extensions` after each build.

## Folder layout

```
extension/
  manifest.json
  esbuild.config.mjs
  src/
    background/service-worker.ts
    content/content-script.ts
    content/extractors/     # linkedin, indeed, generic, json-ld
    popup/popup.ts
    options/options.ts
    shared/                 # api, storage, types
  popup/                    # HTML + CSS
  options/
  dist/                     # built JS (gitignored)
  icons/
```
