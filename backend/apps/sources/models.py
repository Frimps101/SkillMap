from django.conf import settings
from django.db import models


class Source(models.Model):
    TYPE_CHOICES = [
        ("api", "API"),
        ("scrape", "Web Scrape"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("pending", "Pending"),
        ("error", "Error"),
        ("paused", "Paused"),
    ]

    FREQUENCY_CHOICES = [
        ("1h", "Every 1 Hour"),
        ("6h", "Every 6 Hours"),
        ("12h", "Every 12 Hours"),
        ("24h", "Every 24 Hours"),
    ]

    name = models.CharField(max_length=120)
    url = models.URLField()
    source_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default="scrape")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    frequency = models.CharField(max_length=5, choices=FREQUENCY_CHOICES, default="6h")
    # JSON: { "job_title": "selector", "company": "selector", ... }
    selector_config = models.JSONField(default=dict, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sources",
        null=True,
        blank=True,
    )
    is_builtin = models.BooleanField(default=False)
    last_scraped_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "sources"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
