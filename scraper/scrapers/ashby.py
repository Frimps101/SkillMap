"""
Ashby job boards — public posting API, no auth.

Like Greenhouse, Ashby hosts one board per company, so each source points at
a single org: https://api.ashbyhq.com/posting-api/job-board/<org>
The board response already carries the full description, so one request per
company is enough.
"""

import logging
import re

import requests
from bs4 import BeautifulSoup

from .base import BaseScraper

logger = logging.getLogger(__name__)

ASHBY_API = "https://api.ashbyhq.com/posting-api/job-board"
HEADERS = {"User-Agent": "SkillMap/1.0 (job aggregator)"}

# Org slugs don't capitalise nicely on their own (openai -> Openai)
COMPANY_NAMES = {
    "openai": "OpenAI",
    "cohere": "Cohere",
    "linear": "Linear",
    "notion": "Notion",
}

EMPLOYMENT_TYPES = {
    "intern": "internship",
    "contract": "contract",
    "temporary": "contract",
    "parttime": "part_time",
}

UIUX_HINTS = re.compile(r"\b(ui/ux|ux|user experience|user interface|product design)\b", re.IGNORECASE)
DESIGN_HINTS = re.compile(r"\b(design|brand|graphic|creative)\b", re.IGNORECASE)


class AshbyScraper(BaseScraper):
    def fetch(self, url: str = "") -> list[dict]:
        org = self._org_from_url(url)
        if not org:
            logger.error("Ashby scraper: could not read org slug from %s", url)
            return []

        try:
            resp = requests.get(
                f"{ASHBY_API}/{org}",
                params={"includeCompensation": "true"},
                headers=HEADERS,
                timeout=20,
            )
            resp.raise_for_status()
            postings = resp.json().get("jobs", []) or []
        except Exception as exc:
            logger.error("Ashby scraper: failed to fetch board %s: %s", org, exc)
            return []

        company = COMPANY_NAMES.get(org.lower(), org.replace("-", " ").title())
        jobs = [
            self._normalize({**posting, "_company": company})
            for posting in postings
            if posting.get("isListed", True)
        ]

        logger.info("Ashby scraper: %d jobs from %s", len(jobs), org)
        return jobs

    def _fetch_raw(self, url):
        pass

    def _parse(self, raw):
        pass

    @staticmethod
    def _org_from_url(url: str) -> str:
        """Accepts the API URL or the public jobs.ashbyhq.com/<org> board URL."""
        if not url:
            return ""
        match = re.search(r"(?:job-board|jobs\.ashbyhq\.com)/([^/?#]+)", url)
        return match.group(1) if match else ""

    def _normalize(self, posting: dict) -> dict:
        title = (posting.get("title") or "").strip()

        locations = [posting.get("location") or ""]
        locations += [
            loc.get("location", "") for loc in posting.get("secondaryLocations") or []
        ]
        location = " / ".join(dict.fromkeys(loc for loc in locations if loc)) or "See listing"

        description = self._html_to_text(posting.get("descriptionHtml", ""))

        return self._standard_job(
            title=title,
            company=posting.get("_company", ""),
            location=location,
            job_type=self._job_type(posting),
            category=self._category(posting, title),
            description=description[:12000],
            url=posting.get("jobUrl") or posting.get("applyUrl") or "",
            posted_at=posting.get("publishedAt"),
        )

    @staticmethod
    def _job_type(posting: dict) -> str:
        raw = (posting.get("employmentType") or "").replace("-", "").replace(" ", "").lower()
        mapped = EMPLOYMENT_TYPES.get(raw)
        if mapped:
            return mapped
        return "remote" if posting.get("isRemote") else "full_time"

    @staticmethod
    def _category(posting: dict, title: str) -> str:
        blob = f"{posting.get('department') or ''} {posting.get('team') or ''} {title}"
        if UIUX_HINTS.search(blob):
            return "uiux"
        if DESIGN_HINTS.search(blob):
            return "design"
        return "tech"

    @staticmethod
    def _html_to_text(html: str) -> str:
        if not html:
            return ""
        return BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
