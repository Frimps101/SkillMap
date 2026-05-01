"""Abstract base class all scrapers inherit from."""

import logging
from abc import ABC, abstractmethod

import requests

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    def fetch(self, url: str) -> list[dict]:
        """Entry point. Returns list of normalized job dicts."""
        raw = self._fetch_raw(url)
        jobs = self._parse(raw)
        return [self._normalize(job) for job in jobs]

    def _fetch_raw(self, url: str):
        """Override for non-HTTP sources (APIs with SDKs, Playwright, etc.)."""
        resp = requests.get(url, timeout=30, headers={"User-Agent": "SkillMap/1.0"})
        resp.raise_for_status()
        return resp

    @abstractmethod
    def _parse(self, raw) -> list[dict]:
        """Parse raw response into list of dicts."""

    @abstractmethod
    def _normalize(self, job: dict) -> dict:
        """Map arbitrary job dict to SkillMap's standard schema."""

    @staticmethod
    def _standard_job(
        title="",
        company="",
        location="",
        job_type="full_time",
        category="tech",
        description="",
        url="",
        logo_url="",
        posted_at=None,
    ) -> dict:
        return {
            "title": title,
            "company": company,
            "location": location,
            "job_type": job_type,
            "category": category,
            "description": description,
            "url": url,
            "logo_url": logo_url,
            "posted_at": posted_at,
        }
