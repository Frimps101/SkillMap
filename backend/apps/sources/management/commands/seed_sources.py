"""
Management command: seed_sources
Creates the built-in job sources and optionally triggers an immediate scrape.

Usage:
  python manage.py seed_sources            # seed only
  python manage.py seed_sources --scrape   # seed + trigger scrapes
"""

import os

import requests
from django.core.management.base import BaseCommand

from apps.sources.models import Source

BUILTIN_SOURCES = [
    {
        "name": "Remotive (Remote Tech & Design)",
        "url": "https://remotive.com/api/remote-jobs",
        "source_type": "api",
        "status": "active",
        "frequency": "6h",
        "selector_config": {},
    },
    {
        "name": "Greenhouse — Figma",
        "url": "https://boards-api.greenhouse.io/v1/boards/figma/jobs",
        "source_type": "api",
        "status": "active",
        "frequency": "6h",
        "selector_config": {},
    },
    {
        "name": "Greenhouse — Linear",
        "url": "https://boards-api.greenhouse.io/v1/boards/linear/jobs",
        "source_type": "api",
        "status": "active",
        "frequency": "6h",
        "selector_config": {},
    },
    {
        "name": "Greenhouse — Vercel",
        "url": "https://boards-api.greenhouse.io/v1/boards/vercel/jobs",
        "source_type": "api",
        "status": "active",
        "frequency": "6h",
        "selector_config": {},
    },
    {
        "name": "Greenhouse — Stripe",
        "url": "https://boards-api.greenhouse.io/v1/boards/stripe/jobs",
        "source_type": "api",
        "status": "active",
        "frequency": "6h",
        "selector_config": {},
    },
    {
        "name": "Greenhouse — Notion",
        "url": "https://boards-api.greenhouse.io/v1/boards/notion/jobs",
        "source_type": "api",
        "status": "active",
        "frequency": "6h",
        "selector_config": {},
    },
]


class Command(BaseCommand):
    help = "Seed built-in job sources. Pass --scrape to trigger an immediate scrape."

    def add_arguments(self, parser):
        parser.add_argument(
            "--scrape",
            action="store_true",
            help="Trigger an immediate scrape for each seeded source.",
        )

    def handle(self, *args, **options):
        created_count = 0
        skipped_count = 0

        for data in BUILTIN_SOURCES:
            source, created = Source.objects.get_or_create(
                name=data["name"],
                defaults={**data, "is_builtin": True},
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"  Created: {source.name}"))
            else:
                skipped_count += 1
                self.stdout.write(f"  Exists:  {source.name}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. {created_count} created, {skipped_count} already existed."
            )
        )

        if options["scrape"]:
            self.stdout.write("\nTriggering scrapes...")
            scraper_url = os.environ.get("SCRAPER_INTERNAL_URL", "http://scraper:5000")
            internal_key = os.environ.get("INTERNAL_API_KEY", "dev-internal-key")

            for source in Source.objects.filter(is_builtin=True, status="active"):
                try:
                    resp = requests.post(
                        f"{scraper_url}/scrape",
                        json={
                            "source_id": source.id,
                            "source_type": source.source_type,
                            "url": source.url,
                            "selector_config": source.selector_config,
                        },
                        headers={"X-Internal-Key": internal_key},
                        timeout=10,
                    )
                    task_id = resp.json().get("task_id", "?")
                    self.stdout.write(
                        self.style.SUCCESS(f"  Queued: {source.name} → task {task_id}")
                    )
                except Exception as exc:
                    self.stdout.write(
                        self.style.WARNING(f"  Failed to queue {source.name}: {exc}")
                    )
