from rest_framework import generics, permissions

from .models import Skill
from .serializers import SkillDetailSerializer, SkillSerializer


class SkillListView(generics.ListAPIView):
    """All skills ordered by weekly_mentions desc."""

    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        return qs


class SkillTrendingView(generics.ListAPIView):
    """Top 20 skills by weekly_mentions."""

    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Skill.objects.order_by("-weekly_mentions")[:20]


class SkillDetailView(generics.RetrieveAPIView):
    """Single skill with last 12 weeks of trend data."""

    queryset = Skill.objects.prefetch_related("trends")
    serializer_class = SkillDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
