import requests
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Source
from .serializers import SourceSerializer


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.owner == request.user and not obj.is_builtin


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

        try:
            resp = requests.post(
                f"{settings.SCRAPER_INTERNAL_URL}/scrape",
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
            return Response({"task_id": task_id}, status=status.HTTP_202_ACCEPTED)
        except Exception as exc:
            return Response(
                {"detail": f"Scraper unreachable: {exc}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
