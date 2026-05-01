from rest_framework import serializers

from apps.skills.serializers import SkillSerializer

from .models import Job


class JobListSerializer(serializers.ModelSerializer):
    skills = SkillSerializer(many=True, read_only=True)
    source_name = serializers.CharField(source="source.name", read_only=True, default=None)

    class Meta:
        model = Job
        fields = (
            "id",
            "title",
            "company",
            "location",
            "job_type",
            "category",
            "url",
            "logo_url",
            "posted_at",
            "scraped_at",
            "source_name",
            "skills",
        )


class JobDetailSerializer(JobListSerializer):
    class Meta(JobListSerializer.Meta):
        fields = JobListSerializer.Meta.fields + ("description",)


class IngestJobSerializer(serializers.Serializer):
    """Accepts raw job dicts from the Flask scraper."""

    title = serializers.CharField()
    company = serializers.CharField(allow_blank=True, default="Unknown")
    location = serializers.CharField(allow_blank=True, default="")
    job_type = serializers.CharField(default="full_time")
    category = serializers.CharField(default="tech")
    description = serializers.CharField(allow_blank=True, default="")
    url = serializers.CharField()  # validated as string; filtered below
    logo_url = serializers.CharField(allow_blank=True, default="")
    posted_at = serializers.DateTimeField(allow_null=True, default=None, required=False)
    source_id = serializers.IntegerField(allow_null=True, default=None, required=False)
