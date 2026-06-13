"""
Y Combinator jobs scraped directly from https://www.ycombinator.com/jobs.

The YC jobs pages are server-rendered (Inertia.js) and embed all job data as
JSON in a `data-page` attribute — no headless browser needed. We pull the
role listing pages, then fetch each job's detail page for the full
description, salary, and skills.
"""

import html as html_mod
import json
import logging
import re
import time as time_mod
from datetime import datetime, timedelta, timezone

import requests

from .base import BaseScraper

logger = logging.getLogger(__name__)

YC_BASE = "https://www.ycombinator.com"

# Listing pages to pull, with the SkillMap category their jobs default to.
ROLE_PAGES = [
    ("/jobs/role/software-engineer", "tech"),
    ("/jobs/role/designer", "design"),
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
}

DATA_PAGE_RE = re.compile(r'data-page="([^"]*)"')

# lastActive strings look like "about 7 hours", "1 day", "4 months", "over 2 years"
RELATIVE_RE = re.compile(r"(\d+)\s+(minute|hour|day|week|month|year)", re.IGNORECASE)

UNIT_SECONDS = {
    "minute": 60,
    "hour": 3600,
    "day": 86400,
    "week": 604800,
    "month": 2592000,
    "year": 31536000,
}

UIUX_HINTS = re.compile(r"\b(ui|ux|user experience|user interface|product design|web design)\b", re.IGNORECASE)


class YCombinatorScraper(BaseScraper):
    def fetch(self, url: str = "") -> list[dict]:
        seen_ids: set[int] = set()
        jobs: list[dict] = []

        for path, default_category in ROLE_PAGES:
            postings = self._fetch_listing(path)
            logger.info("YC scraper: %d postings on %s", len(postings), path)
            for posting in postings:
                if posting.get("id") in seen_ids:
                    continue
                seen_ids.add(posting["id"])
                normalized = self._normalize({**posting, "_category": default_category})
                if normalized["title"] and normalized["url"]:
                    jobs.append(normalized)
                time_mod.sleep(0.15)

        logger.info("YC scraper: %d jobs from ycombinator.com/jobs", len(jobs))
        return jobs

    def _fetch_raw(self, url):
        pass

    def _parse(self, raw):
        pass

    # ── Listing pages ───────────────────────────────────────────────────────

    def _fetch_listing(self, path: str) -> list[dict]:
        data = self._fetch_data_page(YC_BASE + path)
        if not data:
            return []
        return data.get("props", {}).get("jobPostings", []) or []

    @staticmethod
    def _fetch_data_page(url: str) -> dict | None:
        """YC pages embed their props as JSON in a data-page HTML attribute."""
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            if resp.status_code != 200:
                logger.warning("YC scraper: %s returned %d", url, resp.status_code)
                return None
            match = DATA_PAGE_RE.search(resp.text)
            if not match:
                logger.warning("YC scraper: no data-page JSON on %s", url)
                return None
            return json.loads(html_mod.unescape(match.group(1)))
        except Exception as exc:
            logger.warning("YC scraper: failed to fetch %s: %s", url, exc)
            return None

    # ── Normalization ───────────────────────────────────────────────────────

    def _normalize(self, posting: dict) -> dict:
        job_url = YC_BASE + posting.get("url", "")
        title = (posting.get("title") or "").strip()
        company = (posting.get("companyName") or "").strip()
        location = (posting.get("location") or "").strip() or "See listing"

        description = self._fetch_description(job_url)
        if not description:
            parts = [
                posting.get("companyOneLiner") or "",
                f"Role: {posting.get('prettyRole') or ''} ({posting.get('roleSpecificType') or ''})",
                f"Salary: {posting.get('salaryRange')}" if posting.get("salaryRange") else "",
                f"Experience: {posting.get('minExperience')}" if posting.get("minExperience") else "",
            ]
            description = "\n".join(p for p in parts if p.strip()) or title

        extras = []
        if posting.get("salaryRange"):
            extras.append(f"Salary: {posting['salaryRange']}")
        if posting.get("minExperience"):
            extras.append(f"Experience: {posting['minExperience']}")
        if posting.get("visa"):
            extras.append(f"Visa: {posting['visa']}")
        batch = posting.get("companyBatchName")
        if batch:
            extras.append(f"YC batch: {batch}")
        if extras:
            description = f"{description}\n\n{' | '.join(extras)}"

        category = posting.get("_category", "tech")
        if category == "design":
            specific = f"{posting.get('roleSpecificType') or ''} {title}"
            if UIUX_HINTS.search(specific):
                category = "uiux"

        return self._standard_job(
            title=title,
            company=company,
            location=location,
            job_type=self._job_type(posting, location),
            category=category,
            description=description[:12000],
            url=job_url,
            logo_url=posting.get("companyLogoUrl") or "",
            posted_at=self._parse_relative(posting.get("lastActive") or posting.get("createdAt")),
        )

    def _fetch_description(self, job_url: str) -> str:
        data = self._fetch_data_page(job_url)
        if not data:
            return ""
        job = data.get("props", {}).get("job", {}) or {}
        return (job.get("description") or "").strip()

    @staticmethod
    def _job_type(posting: dict, location: str) -> str:
        raw = (posting.get("type") or "").lower()
        if "intern" in raw:
            return "internship"
        if "contract" in raw:
            return "contract"
        if "part" in raw:
            return "part_time"
        if "remote" in location.lower():
            return "remote"
        return "full_time"

    @staticmethod
    def _parse_relative(value: str | None) -> str | None:
        """Convert YC's relative timestamps ("about 7 hours", "1 day") to ISO."""
        if not value:
            return None
        match = RELATIVE_RE.search(value)
        if not match:
            return None
        amount, unit = int(match.group(1)), match.group(2).lower()
        delta = timedelta(seconds=amount * UNIT_SECONDS[unit])
        return (datetime.now(timezone.utc) - delta).isoformat()
