from django.conf import settings
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Job
from .serializers import IngestJobSerializer, JobDetailSerializer, JobListSerializer


class JobListView(generics.ListAPIView):
    serializer_class = JobListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Job.objects.select_related("source").prefetch_related("skills").filter(is_active=True)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(company__icontains=search)
                | Q(description__icontains=search)
            )

        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        job_type = self.request.query_params.get("job_type")
        if job_type:
            qs = qs.filter(job_type=job_type)

        location = self.request.query_params.get("location")
        if location:
            qs = qs.filter(location__icontains=location)

        source_id = self.request.query_params.get("source")
        if source_id:
            qs = qs.filter(source_id=source_id)

        skills = self.request.query_params.get("skills")
        if skills:
            skill_ids = [s.strip() for s in skills.split(",") if s.strip()]
            qs = qs.filter(skills__id__in=skill_ids).distinct()

        ordering = self.request.query_params.get("ordering", "-scraped_at")
        allowed_orderings = {"-scraped_at", "scraped_at", "-posted_at", "posted_at"}
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)

        return qs


class JobDetailView(generics.RetrieveAPIView):
    queryset = Job.objects.select_related("source").prefetch_related("skills")
    serializer_class = JobDetailSerializer
    permission_classes = [permissions.IsAuthenticated]


class TrendingJobsView(generics.ListAPIView):
    """Jobs with most distinct skill mentions this week."""

    serializer_class = JobListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Job.objects.select_related("source")
            .prefetch_related("skills")
            .filter(is_active=True)
            .order_by("-scraped_at")[:20]
        )
