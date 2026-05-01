from django.urls import path

from .views import LearningPathView, RegenerateLearningPathView

urlpatterns = [
    path("", LearningPathView.as_view(), name="learning-path"),
    path("regenerate/", RegenerateLearningPathView.as_view(), name="learning-path-regenerate"),
]
