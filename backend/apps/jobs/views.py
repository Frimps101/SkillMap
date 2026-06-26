import logging

from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Case, Exists, IntegerField, OuterRef, Q, When
from django.shortcuts import get_object_or_404

from .models import Job, SavedJob
from .serializers import IngestJobSerializer, JobDetailSerializer, JobListSerializer
from .services import extract_and_save_skills

logger = logging.getLogger(__name__)


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

        from django.db.models import F

        # Default: most recently posted first; jobs without a posted date go last
        ordering = self.request.query_params.get("ordering", "-posted_at")
        ordering_map = {
            "-posted_at": [F("posted_at").desc(nulls_last=True), "-scraped_at"],
            "posted_at": [F("posted_at").asc(nulls_last=True), "-scraped_at"],
            "-scraped_at": ["-scraped_at"],
            "scraped_at": ["scraped_at"],
        }
        qs = qs.order_by(*ordering_map.get(ordering, ordering_map["-posted_at"]))

        saved = SavedJob.objects.filter(user=self.request.user, job_id=OuterRef("pk"))
        return qs.annotate(is_saved=Exists(saved))


class SavedJobListView(generics.ListAPIView):
    """Jobs the current user has saved, most recently saved first."""

    serializer_class = JobListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        saved_ids = list(
            SavedJob.objects.filter(user=user)
            .order_by("-saved_at")
            .values_list("job_id", flat=True)
        )
        if not saved_ids:
            return Job.objects.none()

        order = Case(
            *[When(pk=pk, then=pos) for pos, pk in enumerate(saved_ids)],
            output_field=IntegerField(),
        )
        saved = SavedJob.objects.filter(user=user, job_id=OuterRef("pk"))
        return (
            Job.objects.select_related("source")
            .prefetch_related("skills")
            .filter(is_active=True, pk__in=saved_ids)
            .annotate(is_saved=Exists(saved))
            .order_by(order)
        )


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


class SaveJobView(APIView):
    """Save or unsave a job for the current user."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        job = get_object_or_404(Job, pk=pk, is_active=True)
        SavedJob.objects.get_or_create(user=request.user, job=job)
        return Response({"saved": True})

    def delete(self, request, pk):
        SavedJob.objects.filter(user=request.user, job_id=pk).delete()
        return Response({"saved": False})


class ImportJobView(APIView):
    """Import a single job from the Chrome extension (JWT-authenticated)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = IngestJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        url = data.get("url", "")
        if not url or not url.startswith("http"):
            return Response(
                {"detail": "A valid job URL is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job, created = Job.objects.get_or_create(
            url=url,
            defaults={
                "title": data["title"],
                "company": data["company"] or "Unknown",
                "location": data["location"],
                "job_type": data["job_type"],
                "category": data["category"],
                "description": data["description"],
                "logo_url": data["logo_url"],
                "posted_at": data["posted_at"],
                "source_id": data.get("source_id"),
                "last_verified_at": timezone.now(),
            },
        )

        if not created:
            if not job.is_active:
                job.is_active = True
                job.last_verified_at = timezone.now()
                job.save(update_fields=["is_active", "last_verified_at"])
            return Response(
                {
                    "created": False,
                    "skipped": True,
                    "job_id": job.id,
                    "detail": "This job is already in SkillMap.",
                },
                status=status.HTTP_200_OK,
            )

        try:
            extract_and_save_skills.delay(job.id)
        except Exception as exc:
            logger.warning("Could not dispatch skill extraction for job %s: %s", job.id, exc)

        return Response(
            {
                "created": True,
                "skipped": False,
                "job_id": job.id,
                "detail": "Job imported. Skill extraction started in the background.",
            },
            status=status.HTTP_201_CREATED,
        )
