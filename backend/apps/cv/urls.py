from django.urls import path

from .views import (
    CVDeleteView,
    CVListView,
    CVRereviewView,
    CVReviewDetailView,
    CVUploadView,
)

urlpatterns = [
    path("", CVListView.as_view(), name="cv-list"),
    path("upload/", CVUploadView.as_view(), name="cv-upload"),
    path("<int:pk>/review/", CVReviewDetailView.as_view(), name="cv-review"),
    path("<int:pk>/rereview/", CVRereviewView.as_view(), name="cv-rereview"),
    path("<int:pk>/", CVDeleteView.as_view(), name="cv-delete"),
]
