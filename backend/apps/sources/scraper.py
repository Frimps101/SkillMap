"""
Inline scraper — runs directly in the Django process.
Used as a fallback when the external scraper microservice is not available.
Supports Remotive and Greenhouse board APIs.
"""
import logging
import threading
from datetime import datetime

import requests as http
from django.utils import timezone

logger = logging.getLogger(__name__)

HEADERS = {"User-Agent": "SkillMap/1.0 (job aggregator)"}


# ── Public API ────────────────────────────────────────────────────────────────

def trigger_async(source) -> None:
    """
    Start a background thread that scrapes the source and updates its status.
    Returns immediately; the thread updates source.status when done.
    """
    t = threading.Thread(target=_run, args=(source,), daemon=True)
    t.start()


# ── Internal ──────────────────────────────────────────────────────────────────

def _run(source) -> None:
    from apps.sources.models import Source  # local import to avoid circular deps

    try:
        created, error = _scrape(source)
        if error:
            logger.warning("Inline scrape failed for source %s: %s", source.id, error)
            Source.objects.filter(pk=source.pk).update(status="error")
        else:
            logger.info("Inline scrape finished for source %s — %d new jobs", source.id, created)
            Source.objects.filter(pk=source.pk).update(
                status="active",
                last_scraped_at=timezone.now(),
            )
    except Exception as exc:
        logger.exception("Unexpected error in inline scrape for source %s: %s", source.id, exc)
        from apps.sources.models import Source as S
        S.objects.filter(pk=source.pk).update(status="error")


def _scrape(source) -> tuple[int, str | None]:
    if source.source_type != "api":
        return 0, (
            "Web scrape sources require the external scraper service. "
            "Switch the source type to 'API' if the URL exposes a JSON endpoint."
        )

    url = source.url
    try:
        resp = http.get(url, timeout=20, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return 0, f"Could not reach {url}: {exc}"

    if "remotive.com" in url:
        jobs = _parse_remotive(data)
    elif "greenhouse.io" in url:
        jobs = _parse_greenhouse(data, url)
    else:
        return 0, (
            f"Unrecognised API format for {url}. "
            "Built-in inline scraper supports Remotive and Greenhouse board APIs."
        )

    return _persist(jobs, source), None


def _persist(jobs: list[dict], source) -> int:
    from apps.jobs.models import Job

    created = 0
    for job_data in jobs:
        job_url = job_data.get("url", "")
        if not job_url or not job_url.startswith("http"):
            continue

        job, is_new = Job.objects.get_or_create(
            url=job_url,
            defaults={**job_data, "source": source},
        )
        if is_new:
            created += 1
            _dispatch_skills(job.id)

    return created


# ── Parsers ───────────────────────────────────────────────────────────────────

def _parse_remotive(data: dict) -> list[dict]:
    results = []
    for j in data.get("jobs", []):
        results.append({
            "title": j.get("title", ""),
            "company": j.get("company_name", ""),
            "location": j.get("candidate_required_location") or "Remote",
            "job_type": _normalise_job_type(j.get("job_type", "")),
            "category": _map_category(j.get("category", "")),
            "description": j.get("description", ""),
            "url": j.get("url", ""),
            "logo_url": j.get("company_logo") or "",
            "posted_at": _parse_date(j.get("publication_date")),
        })
    return results


def _parse_greenhouse(data: dict, source_url: str) -> list[dict]:
    parts = source_url.rstrip("/").split("/")
    # URL pattern: .../v1/boards/{company}/jobs
    try:
        company_slug = parts[parts.index("boards") + 1]
    except (ValueError, IndexError):
        company_slug = "unknown"
    company_name = company_slug.replace("-", " ").title()

    results = []
    for j in data.get("jobs", []):
        depts = j.get("departments", [])
        dept_name = depts[0].get("name", "") if depts else ""
        loc = (j.get("location") or {}).get("name") or "Remote"
        results.append({
            "title": j.get("title", ""),
            "company": company_name,
            "location": loc,
            "job_type": "full_time",
            "category": _map_category(dept_name),
            "description": (
                f"{j.get('title', '')} at {company_name}. "
                f"Location: {loc}. Department: {dept_name}."
            ),
            "url": j.get("absolute_url", ""),
            "logo_url": "",
            "posted_at": _parse_date(j.get("updated_at")),
        })
    return results


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalise_job_type(raw: str) -> str:
    raw = raw.lower().replace("-", "_").replace(" ", "_")
    if "part" in raw:
        return "part_time"
    if "contract" in raw or "freelance" in raw:
        return "contract"
    if "intern" in raw:
        return "internship"
    return "full_time"


def _map_category(raw: str) -> str:
    raw = raw.lower()
    if any(k in raw for k in ["ui/ux", "user experience", "product design"]):
        return "uiux"
    if any(k in raw for k in ["design", "visual", "graphic", "creative", "brand"]):
        return "design"
    return "tech"


def _parse_date(s) -> datetime | None:
    if not s:
        return None
    s = str(s)
    for fmt in (
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%d",
    ):
        try:
            naive = datetime.strptime(s[: len(fmt)], fmt)
            return timezone.make_aware(naive)
        except ValueError:
            continue
    return None


def _dispatch_skills(job_id: int) -> None:
    from apps.jobs.services import extract_and_save_skills

    try:
        extract_and_save_skills.delay(job_id)
    except Exception:
        # Celery broker not available — run synchronously
        try:
            extract_and_save_skills(job_id)
        except Exception as exc:
            logger.debug("Skill extraction failed for job %s: %s", job_id, exc)
