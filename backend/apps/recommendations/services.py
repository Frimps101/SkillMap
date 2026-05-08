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


SKILL_KEYWORDS = {
    "javascript": "technical", "typescript": "technical", "python": "technical",
    "java": "technical", "go": "technical", "golang": "technical", "rust": "technical",
    "react": "technical", "next.js": "technical", "nextjs": "technical",
    "vue": "technical", "angular": "technical", "svelte": "technical",
    "node.js": "technical", "nodejs": "technical", "express": "technical",
    "django": "technical", "flask": "technical", "fastapi": "technical",
    "postgresql": "technical", "mysql": "technical", "mongodb": "technical",
    "redis": "technical", "elasticsearch": "technical", "sql": "technical",
    "graphql": "technical", "rest api": "technical", "docker": "technical",
    "kubernetes": "technical", "aws": "technical", "gcp": "technical",
    "azure": "technical", "terraform": "technical", "git": "technical",
    "ci/cd": "technical", "linux": "technical", "html": "technical", "css": "technical",
    "tailwind": "technical", "machine learning": "technical", "pytorch": "technical",
    "react native": "technical", "flutter": "technical", "swift": "technical",
    "kotlin": "technical", "figma": "design", "sketch": "design",
    "adobe xd": "design", "photoshop": "design", "illustrator": "design",
    "framer": "design", "webflow": "design", "ui design": "design",
    "ux design": "design", "user research": "design", "wireframing": "design",
    "prototyping": "design", "design systems": "design",
    "agile": "soft", "scrum": "soft", "communication": "soft", "leadership": "soft",
}


def _scan_descriptions(job_qs, target_role: str) -> dict:
    """Keyword-scan raw job descriptions when JobSkill table has no data yet."""
    counts: dict[str, dict] = {}
    for job in job_qs[:200]:
        text = job.description.lower()
        for skill, category in SKILL_KEYWORDS.items():
            pattern = r"\b" + re.escape(skill) + r"\b"
            hits = len(re.findall(pattern, text))
            if hits:
                if skill not in counts:
                    counts[skill] = {"category": category, "total": 0}
                counts[skill]["total"] += hits

    ranked = sorted(counts.items(), key=lambda x: x[1]["total"], reverse=True)[:10]
    skills = []
    for rank, (name, data) in enumerate(ranked, start=1):
        category = data["category"]
        total = data["total"]
        skills.append({
            "name": name,
            "priority_rank": rank,
            "reason": f"Mentioned {total} time{'s' if total != 1 else ''} across {target_role} job postings — high employer demand.",
            "hours_to_proficiency": _HOURS.get(category, 40),
            "resources": _RESOURCES.get(category, _RESOURCES["technical"]),
        })
    return {"raw": "", "skills": skills}


def _db_learning_path(target_role: str) -> dict:
    """
    Build a learning path from job data already in the DB.
    First tries pre-extracted JobSkill records; if empty, scans descriptions directly.
    """
    from apps.jobs.models import Job, JobSkill

    keywords = [w for w in re.split(r"\W+", target_role.lower()) if len(w) > 2]
    if not keywords:
        keywords = ["engineer"]

    job_qs = Job.objects.none()
    for kw in keywords:
        job_qs = job_qs | Job.objects.filter(title__icontains=kw)

    if not job_qs.exists():
        job_qs = Job.objects.all()

    # Try pre-extracted skills first
    top_skills = (
        JobSkill.objects.filter(job__in=job_qs)
        .values("skill__name", "skill__category")
        .annotate(total=Sum("frequency"))
        .order_by("-total")[:10]
    )

    if top_skills.exists():
        skills = []
        for rank, row in enumerate(top_skills, start=1):
            name = row["skill__name"]
            category = row["skill__category"] or "technical"
            total = row["total"]
            skills.append({
                "name": name,
                "priority_rank": rank,
                "reason": f"Required in {total} job posting{'s' if total != 1 else ''} for {target_role} roles — consistently in demand.",
                "hours_to_proficiency": _HOURS.get(category, 40),
                "resources": _RESOURCES.get(category, _RESOURCES["technical"]),
            })
        return {"raw": "", "skills": skills}

    # No pre-extracted skills — scan descriptions directly
    logger.info("No JobSkill data found — scanning job descriptions directly for: %s", target_role)
    return _scan_descriptions(job_qs, target_role)


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
