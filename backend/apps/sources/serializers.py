from rest_framework import serializers

from .models import Source


class SourceSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source="owner.email", read_only=True, default=None)

    class Meta:
        model = Source
        fields = (
            "id",
            "name",
            "url",
            "source_type",
            "status",
            "frequency",
            "selector_config",
            "is_builtin",
            "last_scraped_at",
            "created_at",
            "owner_email",
        )
        read_only_fields = ("id", "is_builtin", "last_scraped_at", "created_at", "owner_email")
