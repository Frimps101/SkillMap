from django.contrib import admin

from .models import CVDocument, CVReview


@admin.register(CVDocument)
class CVDocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "original_filename", "uploaded_at")


@admin.register(CVReview)
class CVReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "cv", "status", "overall_score", "target_role", "created_at")
    list_filter = ("status",)
