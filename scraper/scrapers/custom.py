"""
DynamicScraper — reads a Source's selector_config to scrape any HTML job board.
Supports pagination via a next_page_selector field in selector_config.

selector_config shape:
{
  "job_container": ".job-listing",
  "title": "h2.job-title",
  "company": ".company-name",
  "location": ".location",
  "description": ".job-description",
  "url": "a.job-link[href]",          # attr extraction when ends with [attr]
  "next_page": "a.next-page[href]"    # optional
}
"""

import logging

import requests
from bs4 import BeautifulSoup

from .base import BaseScraper

logger = logging.getLogger(__name__)

MAX_PAGES = 5


class CustomScraper(BaseScraper):
    def __init__(self, selector_config: dict):
        self.config = selector_config

    def fetch(self, url: str) -> list[dict]:
        all_jobs = []
        current_url = url
        pages = 0

        while current_url and pages < MAX_PAGES:
            try:
                resp = requests.get(
                    current_url,
                    timeout=30,
                    headers={"User-Agent": "SkillMap/1.0 (+https://skillmap.app)"},
                )
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")
                jobs = self._parse(soup)
                all_jobs.extend([self._normalize(job) for job in jobs])

                next_sel = self.config.get("next_page", "")
                current_url = self._extract_attr(soup, next_sel) if next_sel else None
                pages += 1
            except Exception as exc:
                logger.error("CustomScraper error on %s: %s", current_url, exc)
                break

        return all_jobs

    def _fetch_raw(self, url):
        pass

    def _parse(self, soup: BeautifulSoup) -> list[dict]:
        container_sel = self.config.get("job_container", "")
        if not container_sel:
            return []
        return soup.select(container_sel)

    def _normalize(self, element) -> dict:
        def extract(sel: str) -> str:
            if not sel:
                return ""
            if "[" in sel and sel.endswith("]"):
                css_sel, attr = sel[: sel.rfind("[")], sel[sel.rfind("[") + 1 : -1]
                el = element.select_one(css_sel)
                return el[attr] if el and el.has_attr(attr) else ""
            el = element.select_one(sel)
            return el.get_text(strip=True) if el else ""

        return self._standard_job(
            title=extract(self.config.get("title", "")),
            company=extract(self.config.get("company", "")),
            location=extract(self.config.get("location", "")),
            description=extract(self.config.get("description", "")),
            url=extract(self.config.get("url", "")),
        )

    @staticmethod
    def _extract_attr(soup: BeautifulSoup, sel: str) -> str | None:
        if not sel:
            return None
        if "[" in sel and sel.endswith("]"):
            css_sel, attr = sel[: sel.rfind("[")], sel[sel.rfind("[") + 1 : -1]
            el = soup.select_one(css_sel)
            return el[attr] if el and el.has_attr(attr) else None
        el = soup.select_one(sel)
        return el.get_text(strip=True) if el else None
