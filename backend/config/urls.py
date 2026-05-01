from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/jobs/", include("apps.jobs.urls")),
    path("api/skills/", include("apps.skills.urls")),
    path("api/sources/", include("apps.sources.urls")),
    path("api/recommendations/", include("apps.recommendations.urls")),
    # Internal endpoint called by the Flask scraper
    path("api/internal/", include("apps.jobs.internal_urls")),
]
