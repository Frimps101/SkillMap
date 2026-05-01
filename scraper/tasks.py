"""
Celery application and task definitions for the scraper service.
"""

import logging
import os

import requests
from celery import Celery
from celery.schedules import crontab
from decouple import config

from scrapers.adzuna import AdzunaScraper
from scrapers.custom import CustomScraper
from scrapers.greenhouse import GreenhouseScraper
from scrapers.remotive import RemotiveScraper

logger = logging.getLogger(__name__)

REDIS_URL = config("REDIS_URL", default="redis://localhost:6379/0")
DJANGO_INGEST_URL = config("DJANGO_INGEST_URL", default="http://backend:8000/api/internal/ingest/")
INTERNAL_API_KEY = config("INTERNAL_API_KEY", default="dev-internal-key")

celery_app = Celery("scraper", broker=REDIS_URL, backend=REDIS_URL)

celery_app.conf.beat_schedule = {
    "scrape-all-active-sources-every-6h": {
        "task": "tasks.scrape_all_sources",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    "update-skill-trends-weekly": {
        "task": "tasks.update_skill_trends",
        "schedule": crontab(minute=0, hour=0, day_of_week="sunday"),
    },
}
celery_app.conf.timezone = "UTC"


def _post_to_django(jobs: list):
    if not jobs:
        return
    try:
        resp = requests.post(
            DJANGO_INGEST_URL,
            json=jobs,
            headers={"X-Internal-Key": INTERNAL_API_KEY},
            timeout=30,
        )
        resp.raise_for_status()
        logger.info("Ingested %d jobs → Django: %s", len(jobs), resp.json())
    except Exception as exc:
        logger.error("Failed to post jobs to Django: %s", exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=120, name="tasks.scrape_source")
def scrape_source(self, source_id, source_type, url, selector_config):
    try:
        if source_type == "api":
            if "adzuna" in url:
                scraper = AdzunaScraper()
            elif "greenhouse" in url or "boards-api" in url:
                scraper = GreenhouseScraper()
            elif "remotive" in url:
                scraper = RemotiveScraper()
            else:
                # Default: try Remotive-style public API
                scraper = RemotiveScraper()
        else:
            if selector_config:
                scraper = CustomScraper(selector_config=selector_config)
            else:
                scraper = RemotiveScraper()

        jobs = scraper.fetch(url)
        # Attach source_id to each job dict
        for job in jobs:
            job["source_id"] = source_id

        _post_to_django(jobs)
        return {"status": "ok", "count": len(jobs)}

    except Exception as exc:
        logger.error("scrape_source failed for source %s: %s", source_id, exc)
        raise self.retry(exc=exc)


@celery_app.task(name="tasks.scrape_all_sources")
def scrape_all_sources():
    """Fetch all active sources from Django and trigger a scrape for each."""
    try:
        resp = requests.get(
            config("DJANGO_SOURCES_URL", default="http://backend:8000/api/sources/"),
            headers={"X-Internal-Key": INTERNAL_API_KEY},
            timeout=15,
        )
        sources = resp.json().get("results", [])
    except Exception as exc:
        logger.error("Could not fetch sources from Django: %s", exc)
        return

    for source in sources:
        if source.get("status") not in ("active", "pending"):
            continue
        scrape_source.delay(
            source["id"],
            source["source_type"],
            source["url"],
            source.get("selector_config", {}),
        )
    logger.info("Queued %d sources for scraping", len(sources))


@celery_app.task(name="tasks.update_skill_trends")
def update_skill_trends():
    """Aggregate JobSkill counts into SkillTrend rows — runs weekly via Django management cmd."""
    try:
        resp = requests.post(
            config(
                "DJANGO_TREND_URL",
                default="http://backend:8000/api/internal/update-trends/",
            ),
            headers={"X-Internal-Key": INTERNAL_API_KEY},
            timeout=60,
        )
        logger.info("update_skill_trends → Django: %s", resp.status_code)
    except Exception as exc:
        logger.error("update_skill_trends failed: %s", exc)
