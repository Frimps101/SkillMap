from django.conf import settings
from django.db import models


class CVDocument(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cvs"
    )
    file = models.FileField(upload_to="cvs/")
    original_filename = models.CharField(max_length=255)
    extracted_text = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cv_documents"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"CV({self.user.email}, {self.original_filename})"


class CVReview(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("done", "Done"),
        ("failed", "Failed"),
    ]

    cv = models.ForeignKey(CVDocument, on_delete=models.CASCADE, related_name="reviews")
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="pending")
    target_role = models.CharField(max_length=120, blank=True)

    overall_score = models.PositiveSmallIntegerField(default=0)
    summary = models.TextField(blank=True)
    strengths = models.JSONField(default=list)
    improvements = models.JSONField(default=list)

    # [{"name", "category"}]
    matched_skills = models.JSONField(default=list)
    # [{"name", "category", "job_count", "pct"}] — in-demand skills absent from the CV
    missing_skills = models.JSONField(default=list)
    # [{"job_id", "title", "company", "score", "matched", "total"}]
    job_matches = models.JSONField(default=list)
    # How many active jobs for the target role the stats were computed from
    market_job_count = models.PositiveIntegerField(default=0)

    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cv_reviews"
        ordering = ["-created_at"]

    def __str__(self):
        return f"CVReview({self.cv_id}, {self.status})"
