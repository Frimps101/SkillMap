"""
Greenhouse Job Board API — no auth for public job boards.
Usage: pass the company board token via URL, e.g. https://boards-api.greenhouse.io/v1/boards/figma/jobs
"""

import requests

from .base import BaseScraper

GREENHOUSE_BASE = "https://boards-api.greenhouse.io/v1/boards"

# Built-in company boards to scrape
BUILTIN_BOARDS = ["figma", "linear", "vercel", "stripe", "notion"]


class GreenhouseScraper(BaseScraper):
    def fetch(self, url: str = "") -> list[dict]:
        all_jobs = []

        # If a specific board URL is given, use it; otherwise scrape built-in boards
        if url and "boards-api.greenhouse.io" in url:
            boards = [url.rstrip("/").split("/boards/")[-1].split("/")[0]]
        else:
            boards = BUILTIN_BOARDS

        for board in boards:
            try:
                resp = requests.get(
                    f"{GREENHOUSE_BASE}/{board}/jobs",
                    params={"content": "true"},
                    timeout=20,
                )
                resp.raise_for_status()
                jobs = resp.json().get("jobs", [])
                for job in jobs:
                    normalized = self._normalize(job)
                    all_jobs.append(normalized)
            except Exception:
                continue

        return all_jobs

    def _fetch_raw(self, url):
        pass

    def _parse(self, raw):
        pass

    def _normalize(self, job: dict) -> dict:
        departments = job.get("departments", [])
        dept = departments[0].get("name", "").lower() if departments else ""

        if "design" in dept or "ux" in dept:
            category = "design"
        elif "product" in dept or "engineer" in dept or "data" in dept:
            category = "tech"
        else:
            category = "tech"

        offices = job.get("offices", [])
        location = offices[0].get("name", "Remote") if offices else "Remote"

        return self._standard_job(
            title=job.get("title", ""),
            company=job.get("company", {}).get("name", ""),
            location=location,
            category=category,
            description=job.get("content", ""),
            url=job.get("absolute_url", ""),
            posted_at=job.get("updated_at"),
        )
