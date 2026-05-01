import json
import logging

import anthropic
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_learning_path(user) -> dict:
    """
    Calls Claude to produce a prioritized learning path JSON.
    Returns the parsed skills list.
    """
    profile = getattr(user, "profile", None)
    target_roles = profile.target_role if profile else ""
    known_skills = (
        [s.name for s in profile.known_skills.all()] if profile else []
    )

    from apps.skills.models import Skill

    trending_skills = list(
        Skill.objects.order_by("-weekly_mentions").values_list("name", flat=True)[:20]
    )

    if not settings.ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set — returning empty learning path")
        return {"raw": "", "skills": []}

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""You are a senior career coach specialising in tech and design careers.

I am targeting these roles: {target_roles or "Software Engineer"}
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
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    parsed = json.loads(raw)
    return {"raw": raw, "skills": parsed.get("skills", [])}
