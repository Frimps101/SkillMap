from django.urls import path

from .views import SourceDetailView, SourceListCreateView, TriggerScrapeView

urlpatterns = [
    path("", SourceListCreateView.as_view(), name="source-list"),
    path("<int:pk>/", SourceDetailView.as_view(), name="source-detail"),
    path("<int:pk>/trigger/", TriggerScrapeView.as_view(), name="source-trigger"),
]
