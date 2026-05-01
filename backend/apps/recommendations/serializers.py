from rest_framework import serializers

from .models import LearningPath


class LearningPathSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningPath
        fields = ("id", "skills", "generated_at")
