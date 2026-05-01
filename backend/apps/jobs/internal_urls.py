from django.urls import path

from .internal_views import IngestJobsView

urlpatterns = [
    path("ingest/", IngestJobsView.as_view(), name="internal-ingest"),
]
