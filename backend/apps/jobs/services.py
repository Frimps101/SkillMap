"""
Celery tasks for the jobs app.
Skill extraction via Claude lives here so it runs async after job ingestion.
"""

import json
import logging

import anthropic
from celery import shared_task
from django.conf import settings

from apps.skills.models import Skill

from .models import Job, JobSkill

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def extract_and_save_skills(self, job_id: int):
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        logger.warning("extract_and_save_skills: Job %s not found", job_id)
        return

    if not settings.ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set — skipping skill extraction for job %s", job_id)
        return

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""Extract all skills from the job description below.
Return a JSON array of objects, each with:
  "name": string (lowercase),
  "category": "technical" | "design" | "soft",
  "frequency": int (how many times the skill is mentioned or implied, min 1)

Include tools, languages, frameworks, design software, and methodologies.
Return ONLY the JSON array. No explanation.

Job description:
\"\"\"
{job.description[:4000]}
\"\"\""""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        skills_data = json.loads(raw)
    except Exception as exc:
        logger.error("Skill extraction failed for job %s: %s", job_id, exc)
        raise self.retry(exc=exc)

    for item in skills_data:
        name = item.get("name", "").strip().lower()
        if not name:
            continue
        category = item.get("category", "technical")
        frequency = max(1, int(item.get("frequency", 1)))

        skill, _ = Skill.objects.get_or_create(
            name=name,
            defaults={"category": category},
        )
        skill.weekly_mentions += frequency
        skill.save(update_fields=["weekly_mentions"])

        JobSkill.objects.update_or_create(
            job=job,
            skill=skill,
            defaults={"frequency": frequency},
        )

    logger.info("Extracted %d skills for job %s", len(skills_data), job_id)
