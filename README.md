# SkillMap — Know Exactly What to Learn Next

SkillMap is an AI-powered job aggregator and learning recommendation platform built for developers, designers, and UI/UX professionals who want to stay ahead of what the market actually demands.

It scrapes real job listings from multiple sources, uses Claude AI to extract the skills employers are asking for, and generates a personalised learning path based on what you already know and where you want to go.

---

## What It Does

The tech and design job market moves fast. It's hard to know whether to learn TypeScript or GraphQL, Figma auto-layout or Framer, system design or TypeScript generics. SkillMap solves this by grounding your learning decisions in live market data instead of opinion.

**Core capabilities:**

- Aggregates tech, design, and UI/UX job listings from LinkedIn, Greenhouse, Remotive, Adzuna, and any custom source you add
- Extracts required skills from every job description using Claude AI
- Shows trending skills by category and growth over time
- Generates a personalised learning path ranked by priority, estimated hours, and curated resources
- Lets you add your own job sources with CSS selector configuration — no code needed

---

## App Pages

### Jobs Feed (`/jobs`)
The main dashboard. Shows all scraped job listings with filters for category (Tech / Design / UI/UX), job type, location, and source. Each card shows the company, role, location, job type badge, and the top skills extracted from the description. Click any card to view the full posting.

Use the search bar to find roles by title, company, or keywords in the description.

### Skills Dashboard (`/skills`)
Shows the top 20 skills ranked by weekly mention count across all scraped jobs. Filter by category (Technical, Design, Soft Skills). The bar chart updates as new jobs are scraped. Each skill card shows a mention count and links to learning resources.

### Learning Path (`/learning`)
Your AI-generated curriculum. Claude reads your known skills, your target role, and the top trending skills, then produces a ranked list of what to learn next — with a reason why employers want it now, estimated hours to proficiency, and 2–3 specific learning resources per skill.

Hit **Regenerate** at any time to produce a fresh path as market data changes.

### Source Manager (`/sources`)
Manage the job data pipelines feeding SkillMap. Built-in sources (Remotive, Greenhouse boards) are pre-configured. You can:

- Add any job board as a custom source by providing the URL and CSS selectors for job title, company, location, and description
- Set scrape frequency (1h, 6h, 12h, 24h)
- Trigger a manual scrape with the ▶ button
- Monitor status: Active, Pending, Error, Paused

### Profile & Settings (`/settings`)
Set your current role and target role. These are used by the AI to personalise your learning path. For example, if your current role is "Junior Frontend Developer" and your target is "Senior Full-Stack Engineer", the recommendations will be calibrated to close that specific gap.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Recharts |
| Data fetching | TanStack React Query, Axios |
| Main backend | Django 4.2, Django REST Framework |
| Auth | JWT (djangorestframework-simplejwt) |
| Scraping service | Flask 3, Celery 5 |
| Task queue | Celery + Redis |
| HTML scraping | BeautifulSoup4 |
| JS-heavy sites | Playwright |
| AI extraction | Anthropic Claude (claude-sonnet-4) |
| Database | PostgreSQL 15 |
| Cache / broker | Redis 7 |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
skillmap/
├── docker-compose.yml
├── .env.example
├── backend/                  ← Django API
│   ├── config/               ← Settings, URLs, WSGI
│   └── apps/
│       ├── users/            ← Auth, profiles, skill preferences
│       ├── jobs/             ← Job listings, filtering, Claude extraction
│       ├── skills/           ← Skill model, trend tracking
│       ├── sources/          ← Job source config + seed command
│       └── recommendations/  ← Learning path generation
├── scraper/                  ← Flask microservice
│   ├── app.py                ← /scrape and /scrape/status endpoints
│   ├── tasks.py              ← Celery tasks + beat schedule
│   └── scrapers/
│       ├── base.py           ← Abstract base scraper
│       ├── remotive.py       ← Remotive public API
│       ├── adzuna.py         ← Adzuna Jobs API
│       ├── greenhouse.py     ← Greenhouse company boards
│       └── custom.py         ← CSS-selector based scraper
└── frontend/                 ← React app
    └── src/
        ├── api/              ← Axios instance + API functions
        ├── pages/            ← All page components
        ├── components/       ← Layout, sidebar, shared UI
        └── store/            ← Auth state
```

---

## Setup & Running

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — handles everything else

### 1. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```bash
DJANGO_SECRET_KEY=any-long-random-string
ANTHROPIC_API_KEY=sk-ant-...         # from console.anthropic.com
ADZUNA_APP_ID=                        # optional
ADZUNA_API_KEY=                       # optional
```

### 2. Start all services

```bash
docker-compose up
```

First run takes ~3–5 minutes to download images and install packages. Subsequent starts are instant.

### 3. Run migrations (first time only)

In a second terminal tab while Docker is running:

```bash
docker-compose exec backend python manage.py makemigrations users skills sources jobs recommendations
docker-compose exec backend python manage.py migrate
```

### 4. Seed built-in sources and trigger first scrape

```bash
docker-compose exec backend python manage.py seed_sources --scrape
```

This creates the built-in Remotive and Greenhouse sources and immediately queues a scrape for each. Jobs will start appearing in the feed within 1–2 minutes.

### 5. Create an admin account (optional)

```bash
docker-compose exec backend python manage.py createsuperuser
```

Access the Django admin at `http://localhost:8000/admin/`.

---

## Where Things Run

| Service | URL |
|---|---|
| React frontend | http://localhost:5173 |
| Django API | http://localhost:8000/api/ |
| Django admin | http://localhost:8000/admin/ |
| Flask scraper | http://localhost:5001/health |

---

## Daily Workflow

```bash
# Start
docker-compose up

# Stop
docker-compose down

# Watch logs for a specific service
docker-compose logs -f backend
docker-compose logs -f celery

# Re-run migrations after model changes
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

---

## Adding a Custom Job Source

1. Go to **Source Manager** in the app
2. Click **Add Source**
3. Fill in the job board URL
4. Set Ingestion Type to **Web Scrape**
5. Provide CSS selectors as JSON:

```json
{
  "job_container": ".job-listing",
  "title": "h2.job-title",
  "company": ".company-name",
  "location": ".location",
  "description": ".job-description",
  "url": "a.apply-link[href]"
}
```

The `[href]` suffix on the URL selector tells the scraper to extract the attribute value rather than text content. The `next_page` key is optional — add it to follow pagination automatically.

6. Set frequency and click **Add Source**
7. Hit **▶** to trigger an immediate scrape and verify it works

---

## API Reference

All endpoints require `Authorization: Bearer <access_token>` unless noted.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register/` | Create account, returns JWT pair |
| POST | `/api/auth/login/` | Login, returns JWT pair |
| POST | `/api/auth/refresh/` | Refresh access token |
| POST | `/api/auth/logout/` | Blacklist refresh token |
| GET/PATCH | `/api/auth/me/` | Get or update profile |

### Jobs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/jobs/` | Paginated list. Params: `search`, `category`, `job_type`, `location`, `source`, `skills`, `ordering` |
| GET | `/api/jobs/{id}/` | Full job detail with extracted skills |
| GET | `/api/jobs/trending/` | Most recently scraped jobs |

### Skills
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/skills/` | All skills sorted by weekly mentions. Param: `category` |
| GET | `/api/skills/trending/` | Top 20 skills by weekly mentions |
| GET | `/api/skills/{id}/` | Skill detail with 12-week trend data |

### Sources
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/sources/` | All active sources (built-in + yours) |
| POST | `/api/sources/` | Add a custom source |
| PATCH/DELETE | `/api/sources/{id}/` | Update or remove (owner only) |
| POST | `/api/sources/{id}/trigger/` | Manually trigger a scrape |

### Recommendations
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/recommendations/` | Get learning path (generates if none exists) |
| POST | `/api/recommendations/regenerate/` | Force a fresh Claude API call |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DJANGO_SECRET_KEY` | Yes | Django secret key |
| `ANTHROPIC_API_KEY` | Yes | Claude API key for skill extraction and learning paths |
| `DATABASE_URL` | Auto | PostgreSQL connection string (set by Docker) |
| `REDIS_URL` | Auto | Redis connection string (set by Docker) |
| `ADZUNA_APP_ID` | Optional | Adzuna Jobs API ID |
| `ADZUNA_API_KEY` | Optional | Adzuna Jobs API key |
| `INTERNAL_API_KEY` | Auto | Shared secret between Django and Flask |
| `JWT_ACCESS_TOKEN_LIFETIME` | Optional | Access token lifetime in minutes (default: 60) |
| `JWT_REFRESH_TOKEN_LIFETIME` | Optional | Refresh token lifetime in days (default: 7) |

---

## How the Scraping Pipeline Works

```
Celery Beat (every 6h)
    ↓
scrape_all_sources task
    ↓
For each active Source → scrape_source task
    ↓
Flask scraper fetches raw jobs (API or HTML)
    ↓
Normalised job dicts POSTed to Django /api/internal/ingest/
    ↓
Django saves new Job rows, skips duplicates by URL
    ↓
extract_and_save_skills Celery task queued per new job
    ↓
Claude API extracts skills from job description
    ↓
Skill rows created/updated, JobSkill rows saved
    ↓
weekly_mentions counter incremented per skill
```

---

## Roadmap

- [x] Phase 1 — Project scaffold, auth, Docker setup
- [ ] Phase 2 — Full scraping pipeline with live data
- [ ] Phase 3 — Skill trend aggregation + weekly snapshots
- [ ] Phase 4 — Learning path generation with Claude
- [ ] Phase 5 — Full frontend with charts and filters
- [ ] Phase 6 — Production deploy (Railway/Render + Vercel)
