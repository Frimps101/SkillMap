from django.db import models


class Job(models.Model):
    JOB_TYPE_CHOICES = [
        ("full_time", "Full Time"),
        ("part_time", "Part Time"),
        ("contract", "Contract"),
        ("internship", "Internship"),
        ("remote", "Remote"),
    ]

    CATEGORY_CHOICES = [
        ("tech", "Tech"),
        ("design", "Design"),
        ("uiux", "UI/UX"),
    ]

    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    job_type = models.CharField(max_length=20, choices=JOB_TYPE_CHOICES, default="full_time")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="tech")
    description = models.TextField()
    url = models.URLField(unique=True)
    source = models.ForeignKey(
        "sources.Source",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jobs",
    )
    skills = models.ManyToManyField(
        "skills.Skill", through="JobSkill", related_name="jobs", blank=True
    )
    logo_url = models.URLField(blank=True)
    posted_at = models.DateTimeField(null=True, blank=True)
    scraped_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True, db_index=True)
    last_verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "jobs"
        ordering = ["-scraped_at"]

    def __str__(self):
        return f"{self.title} @ {self.company}"


class JobSkill(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE)
    skill = models.ForeignKey("skills.Skill", on_delete=models.CASCADE)
    frequency = models.PositiveSmallIntegerField(default=1)

    class Meta:
        db_table = "job_skills"
        unique_together = ("job", "skill")
