import json
import logging
import re

import anthropic
from django.conf import settings
from django.db.models import Sum

logger = logging.getLogger(__name__)

# Generic learning resources shown in the DB-driven fallback
_RESOURCES = {
    "technical": [
        {"title": "MDN Web Docs", "url": "https://developer.mozilla.org", "type": "free"},
        {"title": "freeCodeCamp", "url": "https://www.freecodecamp.org", "type": "free"},
    ],
    "design": [
        {"title": "Google UX Design Certificate", "url": "https://grow.google/certificates/ux-design/", "type": "paid"},
        {"title": "Figma Learn", "url": "https://help.figma.com/hc/en-us/categories/360002051613", "type": "free"},
    ],
    "soft": [
        {"title": "Coursera — Communication Skills", "url": "https://www.coursera.org/search?query=communication+skills", "type": "free"},
    ],
}

_HOURS = {"technical": 40, "design": 30, "soft": 15}


def _db_learning_path(target_role: str) -> dict:
    """
    Build a learning path directly from job + skill data already in the DB.
    Searches jobs whose title matches the target role, aggregates the skills
    most frequently required, and returns them ranked by demand.
    """
    from apps.jobs.models import Job, JobSkill

    # Build a loose keyword filter from the target role
    keywords = [w for w in re.split(r"\W+", target_role.lower()) if len(w) > 2]
    if not keywords:
        keywords = ["engineer"]

    # Find matching jobs
    job_qs = Job.objects.none()
    for kw in keywords:
        job_qs = job_qs | Job.objects.filter(title__icontains=kw)

    # If no role-specific jobs found, fall back to all jobs
    if not job_qs.exists():
        job_qs = Job.objects.all()

    # Aggregate skills by total frequency across those jobs
    top_skills = (
        JobSkill.objects.filter(job__in=job_qs)
        .values("skill__name", "skill__category")
        .annotate(total=Sum("frequency"))
        .order_by("-total")[:10]
    )

    skills = []
    for rank, row in enumerate(top_skills, start=1):
        name = row["skill__name"]
        category = row["skill__category"] or "technical"
        total = row["total"]
        resources = _RESOURCES.get(category, _RESOURCES["technical"])
        skills.append({
            "name": name,
            "priority_rank": rank,
            "reason": f"Required in {total} job posting{'s' if total != 1 else ''} for {target_role} roles — consistently in demand.",
            "hours_to_proficiency": _HOURS.get(category, 40),
            "resources": resources,
        })

    return {"raw": "", "skills": skills}


def generate_learning_path(user, current_role: str = "", target_role: str = "") -> dict:
    """
    Generates a prioritized learning path.
    Uses Claude when ANTHROPIC_API_KEY is set, otherwise builds the path
    directly from job/skill data already in the database.
    """
    profile = getattr(user, "profile", None)
    current_role = current_role or (profile.current_role if profile else "") or "Software Engineer"
    target_role = target_role or (profile.target_role if profile else "") or "Software Engineer"
    known_skills = (
        [s.name for s in profile.known_skills.all()] if profile else []
    )

    if not settings.ANTHROPIC_API_KEY:
        logger.info("No ANTHROPIC_API_KEY — building learning path from job data for: %s", target_role)
        return _db_learning_path(target_role)

    from apps.skills.models import Skill

    trending_skills = list(
        Skill.objects.order_by("-weekly_mentions").values_list("name", flat=True)[:20]
    )

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""You are a senior career coach specialising in tech and design careers.

My current role: {current_role}
My target role: {target_role}
Skills I already know: {known_skills or ["none"]}
Top 20 skills currently in demand (by job posting frequency): {trending_skills}

Create a prioritised learning path for me. For each recommended skill:
1. Explain in one sentence why employers want it right now
2. Estimate hours to reach job-ready proficiency
3. Recommend 2-3 specific free or paid learning resources with URLs
4. Assign a priority rank 1-10 (10 = learn this first)

Format your response as JSON matching this shape:
{{
  "skills": [
    {{
      "name": str,
      "priority_rank": int,
      "reason": str,
      "hours_to_proficiency": int,
      "resources": [{{ "title": str, "url": str, "type": "free"|"paid" }}]
    }}
  ]
}}"""

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    parsed = json.loads(raw)
    return {"raw": raw, "skills": parsed.get("skills", [])}
