"""
CV analysis against live market data.

Pipeline:
  1. Match skills from the Skill table against the CV text.
  2. Compute market demand for the user's target role (what % of job
     postings mention each skill).
  3. Diff: which in-demand skills are missing from the CV.
  4. Score each active job listing against the CV (skill overlap).
  5. Narrative review via Claude when a key is set, deterministic fallback otherwise.
"""

import json
import logging
import re

import anthropic
from django.conf import settings
from django.db.models import Count, Q

logger = logging.getLogger(__name__)

TOP_DEMAND_LIMIT = 15
JOB_MATCH_LIMIT = 5


def _role_jobs(target_role: str):
    """Active jobs whose title matches the target role (all jobs as fallback)."""
    from apps.jobs.models import Job

    keywords = [w for w in re.split(r"\W+", target_role.lower()) if len(w) > 2]
    qs = Job.objects.none()
    for kw in keywords:
        qs = qs | Job.objects.filter(title__icontains=kw, is_active=True)
    if not qs.exists():
        qs = Job.objects.filter(is_active=True)
    return qs.distinct()


def find_cv_skills(cv_text: str) -> list[dict]:
    """Match known skills (from the live Skill table) against the CV text."""
    from apps.skills.models import Skill

    text_lower = cv_text.lower()
    matched = []
    for skill in Skill.objects.all().only("name", "category"):
        pattern = r"\b" + re.escape(skill.name.lower()) + r"\b"
        if re.search(pattern, text_lower):
            matched.append({"name": skill.name, "category": skill.category})
    return matched


def market_demand(job_qs) -> tuple[list[dict], int]:
    """Per-skill demand across the given jobs: how many postings mention each skill."""
    total_jobs = job_qs.count()
    if total_jobs == 0:
        return [], 0

    rows = (
        job_qs.values("skills__name", "skills__category")
        .exclude(skills__name=None)
        .annotate(job_count=Count("id", distinct=True))
        .order_by("-job_count")[:50]
    )

    demand = [
        {
            "name": r["skills__name"],
            "category": r["skills__category"] or "technical",
            "job_count": r["job_count"],
            "pct": round(100 * r["job_count"] / total_jobs),
        }
        for r in rows
    ]
    return demand, total_jobs


def score_jobs(job_qs, cv_skill_names: set[str]) -> list[dict]:
    """Skill-overlap score between the CV and each job; top matches returned."""
    scored = []
    jobs = job_qs.prefetch_related("skills")[:300]
    for job in jobs:
        job_skills = {s.name for s in job.skills.all()}
        if not job_skills:
            continue
        overlap = job_skills & cv_skill_names
        score = round(100 * len(overlap) / len(job_skills))
        scored.append(
            {
                "job_id": job.id,
                "title": job.title,
                "company": job.company,
                "score": score,
                "matched": sorted(overlap)[:8],
                "total": len(job_skills),
            }
        )
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:JOB_MATCH_LIMIT]


def _fallback_score(matched_demand: list[dict], missing: list[dict]) -> int:
    """Demand-weighted coverage: matched share of total demand weight."""
    covered = sum(d["pct"] for d in matched_demand)
    gap = sum(d["pct"] for d in missing)
    total = covered + gap
    if total == 0:
        return 50
    return max(10, min(95, round(100 * covered / total)))


def _fallback_review(matched, matched_demand, missing, market_count, target_role) -> dict:
    top_missing = [m["name"] for m in missing[:3]]
    summary = (
        f"Your CV mentions {len(matched)} skills that appear in current "
        f"{target_role} job postings ({market_count} listings analysed). "
    )
    if top_missing:
        summary += (
            f"The biggest gaps versus market demand are: {', '.join(top_missing)}."
        )
    else:
        summary += "It covers all of the most in-demand skills we track. Strong position."

    strengths = [
        f"{m['name'].title()} — recognised by employers in this market"
        for m in matched[:5]
    ]
    improvements = [
        f"Add evidence of {m['name']} — mentioned in {m['pct']}% of {target_role} postings"
        for m in missing[:5]
    ]
    return {
        "summary": summary,
        "strengths": strengths,
        "improvements": improvements,
        "overall_score": _fallback_score(matched_demand, missing),
    }


def _claude_review(cv_text, matched, missing, market_count, target_role) -> dict:
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    matched_str = ", ".join(m["name"] for m in matched) or "none detected"
    missing_str = (
        "\n".join(
            f"- {m['name']} (in {m['pct']}% of {market_count} postings)"
            for m in missing[:10]
        )
        or "none"
    )

    prompt = f"""You are a senior tech recruiter reviewing a CV for someone targeting: {target_role}.

We analysed {market_count} live job postings for this role. Skill data:
- Skills found in this CV that employers ask for: {matched_str}
- In-demand skills MISSING from this CV:
{missing_str}

CV text:
\"\"\"
{cv_text[:6000]}
\"\"\"

Review the CV with the market data above. Be specific and reference the percentages.
Also assess structure, clarity, and impact of the writing itself (quantified achievements, action verbs, length).

Return ONLY JSON:
{{
  "overall_score": int (0-100, how well this CV competes for {target_role} roles right now),
  "summary": str (3-4 sentences, the headline verdict),
  "strengths": [str, ...] (4-6 specific points),
  "improvements": [str, ...] (4-6 specific, actionable points — lead with the market-data gaps)
}}"""

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    parsed = json.loads(raw)
    return {
        "summary": parsed.get("summary", ""),
        "strengths": parsed.get("strengths", []),
        "improvements": parsed.get("improvements", []),
        "overall_score": int(parsed.get("overall_score", 50)),
    }


def analyze_cv(cv_text: str, target_role: str) -> dict:
    """Full analysis. Returns a dict matching CVReview's result fields."""
    job_qs = _role_jobs(target_role)
    matched = find_cv_skills(cv_text)
    matched_names = {m["name"] for m in matched}

    demand, market_count = market_demand(job_qs)
    matched_demand = [d for d in demand if d["name"] in matched_names]
    missing = [d for d in demand if d["name"] not in matched_names][:TOP_DEMAND_LIMIT]
    job_matches = score_jobs(job_qs, matched_names)

    if settings.ANTHROPIC_API_KEY:
        try:
            narrative = _claude_review(cv_text, matched, missing, market_count, target_role)
        except Exception as exc:
            logger.warning("Claude CV review failed, using fallback: %s", exc)
            narrative = _fallback_review(matched, matched_demand, missing, market_count, target_role)
    else:
        narrative = _fallback_review(matched, matched_demand, missing, market_count, target_role)

    return {
        "matched_skills": matched,
        "missing_skills": missing,
        "job_matches": job_matches,
        "market_job_count": market_count,
        **narrative,
    }
