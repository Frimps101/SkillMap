"""
Internal HTTP endpoint called by the Flask scraper.
Protected by a shared INTERNAL_API_KEY header — not exposed to the React frontend.
"""

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.skills.models import Skill
from apps.sources.models import Source

from .models import Job, JobSkill
from .serializers import IngestJobSerializer
from .services import extract_and_save_skills


class InternalAPIKeyPermission:
    def has_permission(self, request, view):
        key = request.headers.get("X-Internal-Key", "")
        return key == settings.INTERNAL_API_KEY


class IngestJobsView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        key = request.headers.get("X-Internal-Key", "")
        if key != settings.INTERNAL_API_KEY:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        jobs_data = request.data if isinstance(request.data, list) else [request.data]
        created_ids = []
        skipped = 0

        for item in jobs_data:
            serializer = IngestJobSerializer(data=item)
            if not serializer.is_valid():
                logger.warning("IngestJobSerializer errors: %s | data keys: %s", serializer.errors, list(item.keys()) if isinstance(item, dict) else "?")
                continue

            data = serializer.validated_data

            # Skip jobs without a valid URL
            if not data.get("url") or not data["url"].startswith("http"):
                skipped += 1
                continue

            source = None
            if data.get("source_id"):
                source = Source.objects.filter(id=data["source_id"]).first()

            job, created = Job.objects.get_or_create(
                url=data["url"],
                defaults={
                    "title": data["title"],
                    "company": data["company"],
                    "location": data["location"],
                    "job_type": data["job_type"],
                    "category": data["category"],
                    "description": data["description"],
                    "logo_url": data["logo_url"],
                    "posted_at": data["posted_at"],
                    "source": source,
                },
            )

            if created:
                created_ids.append(job.id)
                # Dispatch async skill extraction — if broker unavailable, skip silently
                try:
                    extract_and_save_skills.delay(job.id)
                except Exception as exc:
                    logger.warning("Could not dispatch skill extraction for job %s: %s", job.id, exc)
            else:
                skipped += 1

        return Response(
            {"created": len(created_ids), "skipped": skipped},
            status=status.HTTP_201_CREATED,
        )
