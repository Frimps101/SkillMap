from rest_framework import serializers

from .models import CVDocument, CVReview


class CVReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CVReview
        fields = (
            "id",
            "status",
            "target_role",
            "overall_score",
            "summary",
            "strengths",
            "improvements",
            "matched_skills",
            "missing_skills",
            "job_matches",
            "market_job_count",
            "error",
            "created_at",
        )


class CVDocumentSerializer(serializers.ModelSerializer):
    latest_review = serializers.SerializerMethodField()

    class Meta:
        model = CVDocument
        fields = ("id", "original_filename", "uploaded_at", "latest_review")

    def get_latest_review(self, obj):
        review = obj.reviews.first()
        return CVReviewSerializer(review).data if review else None
