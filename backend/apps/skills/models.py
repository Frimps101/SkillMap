from django.db import models
from django.utils import timezone


class Skill(models.Model):
    CATEGORY_CHOICES = [
        ("technical", "Technical"),
        ("design", "Design"),
        ("soft", "Soft"),
    ]

    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="technical")
    weekly_mentions = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "skills"
        ordering = ["-weekly_mentions"]

    def __str__(self):
        return self.name


class SkillTrend(models.Model):
    """Weekly snapshot of a skill's mention count — used for growth charts."""

    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name="trends")
    week_start = models.DateField()
    mention_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "skill_trends"
        unique_together = ("skill", "week_start")
        ordering = ["week_start"]

    def __str__(self):
        return f"{self.skill.name} @ {self.week_start}: {self.mention_count}"
