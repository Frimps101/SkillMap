from django.urls import path

from .views import JobDetailView, JobListView, TrendingJobsView

urlpatterns = [
    path("", JobListView.as_view(), name="job-list"),
    path("trending/", TrendingJobsView.as_view(), name="job-trending"),
    path("<int:pk>/", JobDetailView.as_view(), name="job-detail"),
]
