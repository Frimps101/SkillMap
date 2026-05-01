from django.urls import path

from .views import SkillDetailView, SkillListView, SkillTrendingView

urlpatterns = [
    path("", SkillListView.as_view(), name="skill-list"),
    path("trending/", SkillTrendingView.as_view(), name="skill-trending"),
    path("<int:pk>/", SkillDetailView.as_view(), name="skill-detail"),
]
