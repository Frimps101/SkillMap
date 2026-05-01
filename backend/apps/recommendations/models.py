from django.conf import settings
from django.db import models


class LearningPath(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="learning_path",
    )
    raw_response = models.TextField()
    skills = models.JSONField(default=list)
    generated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "learning_paths"

    def __str__(self):
        return f"LearningPath({self.user.email})"
