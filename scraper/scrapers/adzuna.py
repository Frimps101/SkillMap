"""
Adzuna Jobs API — requires APP_ID and API_KEY env vars.
Covers tech, design, and UI/UX roles globally.
"""

import os

import requests
from decouple import config

from .base import BaseScraper

ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs"


class AdzunaScraper(BaseScraper):
    def __init__(self):
        self.app_id = config("ADZUNA_APP_ID", default="")
        self.api_key = config("ADZUNA_API_KEY", default="")

    def fetch(self, url: str = "", country: str = "us") -> list[dict]:
        if not self.app_id or not self.api_key:
            return []

        all_jobs = []
        for category, sm_category in [
            ("it-jobs", "tech"),
            ("creative-design-jobs", "design"),
        ]:
            try:
                resp = requests.get(
                    f"{ADZUNA_BASE}/{country}/search/1",
                    params={
                        "app_id": self.app_id,
                        "app_key": self.api_key,
                        "results_per_page": 50,
                        "category": category,
                        "content-type": "application/json",
                    },
                    timeout=30,
                )
                resp.raise_for_status()
                jobs = resp.json().get("results", [])
                all_jobs.extend(
                    [self._normalize(job, sm_category) for job in jobs]
                )
            except Exception:
                continue

        return all_jobs

    def _fetch_raw(self, url):
        pass

    def _parse(self, raw):
        pass

    def _normalize(self, job: dict, category: str = "tech") -> dict:
        return self._standard_job(
            title=job.get("title", ""),
            company=job.get("company", {}).get("display_name", ""),
            location=job.get("location", {}).get("display_name", ""),
            job_type="full_time",
            category=category,
            description=job.get("description", ""),
            url=job.get("redirect_url", ""),
            posted_at=job.get("created"),
        )
