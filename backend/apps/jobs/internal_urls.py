from django.urls import path

from .internal_views import ActiveJobsView, IngestJobsView, VerifyJobsView

urlpatterns = [
    path("ingest/", IngestJobsView.as_view(), name="internal-ingest"),
    path("jobs/active/", ActiveJobsView.as_view(), name="internal-jobs-active"),
    path("jobs/verify/", VerifyJobsView.as_view(), name="internal-jobs-verify"),
]
