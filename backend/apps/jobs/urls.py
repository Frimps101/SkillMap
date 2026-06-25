from django.urls import path

from .views import ImportJobView, JobDetailView, JobListView, SaveJobView, TrendingJobsView

urlpatterns = [
    path("", JobListView.as_view(), name="job-list"),
    path("import/", ImportJobView.as_view(), name="job-import"),
    path("trending/", TrendingJobsView.as_view(), name="job-trending"),
    # Static "save/" prefix — avoids any clash with <pk>/ detail routing
    path("save/<int:pk>/", SaveJobView.as_view(), name="job-save"),
    path("<int:pk>/", JobDetailView.as_view(), name="job-detail"),
]
