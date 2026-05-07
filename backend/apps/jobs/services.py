"""
Celery tasks for the jobs app.
Skill extraction runs async after job ingestion.
Uses Claude if ANTHROPIC_API_KEY is set, otherwise falls back to keyword matching.
"""

import json
import logging
import re

import anthropic
from celery import shared_task
from django.conf import settings

from apps.skills.models import Skill

from .models import Job, JobSkill

logger = logging.getLogger(__name__)

# Fallback keyword list used when no Anthropic key is available
SKILL_KEYWORDS = {
    "technical": [
        "javascript", "typescript", "python", "java", "go", "golang", "rust", "c++", "c#",
        "react", "next.js", "nextjs", "vue", "angular", "svelte", "html", "css", "tailwind",
        "node.js", "nodejs", "express", "fastapi", "django", "flask", "spring",
        "postgresql", "mysql", "sqlite", "mongodb", "redis", "elasticsearch",
        "graphql", "rest", "grpc", "websockets",
        "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "ci/cd",
        "git", "linux", "bash", "sql", "nosql",
        "machine learning", "deep learning", "pytorch", "tensorflow", "llm",
        "react native", "flutter", "swift", "kotlin", "android", "ios",
    ],
    "design": [
        "figma", "sketch", "adobe xd", "photoshop", "illustrator", "indesign",
        "after effects", "framer", "webflow", "zeplin", "invision",
        "ui design", "ux design", "user research", "wireframing", "prototyping",
        "design systems", "typography", "motion design", "interaction design",
    ],
    "soft": [
        "communication", "leadership", "agile", "scrum", "kanban", "jira",
        "project management", "cross-functional", "mentoring", "collaboration",
    ],
}


def _keyword_extract(text: str) -> list[dict]:
    """Simple keyword scan — used when no Anthropic API key is configured."""
    text_lower = text.lower()
    found = []
    for category, skills in SKILL_KEYWORDS.items():
        for skill in skills:
            pattern = r"\b" + re.escape(skill) + r"\b"
            matches = re.findall(pattern, text_lower)
            if matches:
                found.append({"name": skill, "category": category, "frequency": len(matches)})
    return found


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def extract_and_save_skills(self, job_id: int):
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        logger.warning("extract_and_save_skills: Job %s not found", job_id)
        return

    if settings.ANTHROPIC_API_KEY:
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
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = message.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()
            skills_data = json.loads(raw)
        except Exception as exc:
            logger.error("Skill extraction failed for job %s: %s", job_id, exc)
            raise self.retry(exc=exc)
    else:
        logger.info("No ANTHROPIC_API_KEY — using keyword extraction for job %s", job_id)
        skills_data = _keyword_extract(job.description)

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
