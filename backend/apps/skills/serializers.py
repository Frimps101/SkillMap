from rest_framework import serializers

from .models import Skill, SkillTrend


class SkillTrendSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillTrend
        fields = ("week_start", "mention_count")


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ("id", "name", "category", "weekly_mentions")


class SkillDetailSerializer(SkillSerializer):
    trends = SkillTrendSerializer(many=True, read_only=True)

    class Meta(SkillSerializer.Meta):
        fields = SkillSerializer.Meta.fields + ("trends",)
