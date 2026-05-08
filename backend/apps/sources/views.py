import logging
import threading

import requests
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Source
from .serializers import SourceSerializer

logger = logging.getLogger(__name__)


def _mark_active_if_still_pending(source_id: int, delay: int = 90) -> None:
    """
    Fallback: if the source is still pending after `delay` seconds
    (scraper ran but sent no ingest data), flip it to active.
    """
    import time
    time.sleep(delay)
    updated = Source.objects.filter(pk=source_id, status="pending").update(
        status="active",
        last_scraped_at=timezone.now(),
    )
    if updated:
        logger.info("Source %s auto-marked active after scrape timeout", source_id)


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.owner == request.user or obj.is_builtin


class SourceListCreateView(generics.ListCreateAPIView):
    serializer_class = SourceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Source.objects.filter(
            Q(is_builtin=True) | Q(owner=self.request.user)
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class SourceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SourceSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        return Source.objects.filter(
            Q(is_builtin=True) | Q(owner=self.request.user)
        )


class TriggerScrapeView(APIView):
    """Manually kick off a scrape for a specific source."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            source = Source.objects.get(pk=pk)
        except Source.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not source.is_builtin and source.owner != request.user:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        # Try external scraper service first (if configured)
        scraper_url = getattr(settings, "SCRAPER_INTERNAL_URL", "")
        if scraper_url:
            try:
                resp = requests.post(
                    f"{scraper_url}/scrape",
                    json={
                        "source_id": source.id,
                        "source_type": source.source_type,
                        "url": source.url,
                        "selector_config": source.selector_config,
                    },
                    headers={"X-Internal-Key": settings.INTERNAL_API_KEY},
                    timeout=10,
                )
                task_id = resp.json().get("task_id")
                source.status = "pending"
                source.save(update_fields=["status"])
                # Safety timer: if the scraper sends no ingest data, flip to active after 90 s
                threading.Thread(
                    target=_mark_active_if_still_pending,
                    args=(source.id,),
                    daemon=True,
                ).start()
                return Response({"task_id": task_id}, status=status.HTTP_202_ACCEPTED)
            except Exception:
                pass  # fall through to inline scraper

        # Inline fallback — runs in a background thread, returns immediately
        from .scraper import trigger_async
        source.status = "pending"
        source.save(update_fields=["status"])
        trigger_async(source)
        return Response({"detail": "Scrape started."}, status=status.HTTP_202_ACCEPTED)
