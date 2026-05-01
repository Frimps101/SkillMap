from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import UserProfile

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "email", "username", "password")

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            username=validated_data["username"],
            password=validated_data["password"],
        )
        UserProfile.objects.create(user=user)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    known_skill_ids = serializers.PrimaryKeyRelatedField(
        source="known_skills",
        many=True,
        read_only=True,
    )

    class Meta:
        model = UserProfile
        fields = ("current_role", "target_role", "known_skill_ids")


class MeSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "username", "avatar", "profile")
        read_only_fields = ("id", "email")
