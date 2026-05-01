"""
Remotive public API — no auth required.
Returns tech and design remote jobs.
"""

import requests

from .base import BaseScraper

REMOTIVE_API = "https://remotive.com/api/remote-jobs"


class RemotiveScraper(BaseScraper):
    CATEGORY_MAP = {
        "software-dev": "tech",
        "design": "design",
        "product": "tech",
        "devops": "tech",
        "data": "tech",
        "qa": "tech",
        "ux": "uiux",
    }

    def fetch(self, url: str = REMOTIVE_API) -> list[dict]:
        resp = requests.get(
            REMOTIVE_API,
            params={"limit": 100},
            timeout=30,
        )
        resp.raise_for_status()
        jobs = resp.json().get("jobs", [])
        return [self._normalize(job) for job in jobs]

    def _fetch_raw(self, url):
        pass

    def _parse(self, raw):
        pass

    def _normalize(self, job: dict) -> dict:
        category_slug = job.get("category", "").lower().replace(" ", "-")
        category = "tech"
        for key, val in self.CATEGORY_MAP.items():
            if key in category_slug:
                category = val
                break

        return self._standard_job(
            title=job.get("title", ""),
            company=job.get("company_name", ""),
            location=job.get("candidate_required_location", "Remote"),
            job_type="remote",
            category=category,
            description=job.get("description", ""),
            url=job.get("url", ""),
            logo_url=job.get("company_logo", ""),
            posted_at=job.get("publication_date"),
        )
