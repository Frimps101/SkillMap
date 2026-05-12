"""
Internal HTTP endpoints called by the Flask scraper.
Protected by a shared INTERNAL_API_KEY header — not exposed to the React frontend.
"""

import logging
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sources.models import Source

from .models import Job
from .serializers import IngestJobSerializer
from .services import extract_and_save_skills

logger = logging.getLogger(__name__)


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
        touched_source_ids = set()

        for item in jobs_data:
            serializer = IngestJobSerializer(data=item)
            if not serializer.is_valid():
                logger.warning(
                    "IngestJobSerializer errors: %s | data keys: %s",
                    serializer.errors,
                    list(item.keys()) if isinstance(item, dict) else "?",
                )
                continue

            data = serializer.validated_data

            if not data.get("url") or not data["url"].startswith("http"):
                skipped += 1
                continue

            source = None
            if data.get("source_id"):
                source = Source.objects.filter(id=data["source_id"]).first()
                if source:
                    touched_source_ids.add(source.id)

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
                    "last_verified_at": timezone.now(),
                },
            )
            if not created and not job.is_active:
                # Job re-appeared in a scrape run — re-activate it
                job.is_active = True
                job.last_verified_at = timezone.now()
                job.save(update_fields=["is_active", "last_verified_at"])

            if created:
                created_ids.append(job.id)
                try:
                    extract_and_save_skills.delay(job.id)
                except Exception as exc:
                    logger.warning("Could not dispatch skill extraction for job %s: %s", job.id, exc)
            else:
                skipped += 1

        # Mark every source that sent data as active, whether or not jobs were new
        if touched_source_ids:
            Source.objects.filter(id__in=touched_source_ids).update(
                status="active",
                last_scraped_at=timezone.now(),
            )

        return Response(
            {"created": len(created_ids), "skipped": skipped},
            status=status.HTTP_201_CREATED,
        )


class ActiveJobsView(APIView):
    """Return active job URLs that are due for re-verification.

    Query param: stale_days (default 7) — only return jobs not verified
    within that many days (or never verified).
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        key = request.headers.get("X-Internal-Key", "")
        if key != settings.INTERNAL_API_KEY:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        try:
            stale_days = int(request.query_params.get("stale_days", 7))
        except (TypeError, ValueError):
            stale_days = 7

        cutoff = timezone.now() - timedelta(days=stale_days)
        jobs = Job.objects.filter(is_active=True).filter(
            models.Q(last_verified_at__isnull=True) | models.Q(last_verified_at__lt=cutoff)
        ).values("id", "url", "last_verified_at")

        return Response(list(jobs))


class VerifyJobsView(APIView):
    """Accept verification results from the scraper.

    Body: {"verified": [...urls...], "inactive": [...urls...]}
    - verified  → stamp last_verified_at = now()
    - inactive  → set is_active=False, last_verified_at = now()
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        key = request.headers.get("X-Internal-Key", "")
        if key != settings.INTERNAL_API_KEY:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        verified_urls = request.data.get("verified", [])
        inactive_urls = request.data.get("inactive", [])

        verified_count = 0
        if verified_urls:
            verified_count = Job.objects.filter(url__in=verified_urls).update(
                last_verified_at=now
            )

        inactive_count = 0
        if inactive_urls:
            inactive_count = Job.objects.filter(url__in=inactive_urls).update(
                is_active=False,
                last_verified_at=now,
            )

        logger.info(
            "VerifyJobsView: %d verified, %d marked inactive", verified_count, inactive_count
        )
        return Response({"verified": verified_count, "inactive": inactive_count})
