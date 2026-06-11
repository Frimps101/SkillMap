import logging

from rest_framework import permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .extractors import ALLOWED_EXTENSIONS, MAX_FILE_BYTES, extract_text
from .models import CVDocument, CVReview
from .serializers import CVDocumentSerializer, CVReviewSerializer
from .tasks import run_cv_review

logger = logging.getLogger(__name__)


def _queue_review(cv: CVDocument, target_role: str) -> CVReview:
    review = CVReview.objects.create(cv=cv, target_role=target_role)
    try:
        run_cv_review.delay(review.id)
    except Exception as exc:
        # Broker unreachable — run inline so the feature still works in dev
        logger.warning("Celery unavailable (%s) — running CV review inline", exc)
        run_cv_review(review.id)
    return review


def _resolve_target_role(request) -> str:
    explicit = (request.data.get("target_role") or "").strip()
    if explicit:
        return explicit
    profile = getattr(request.user, "profile", None)
    return (profile.target_role if profile else "") or "Software Engineer"


class CVUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"detail": "No file provided. Send multipart with a 'file' field."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if file.size > MAX_FILE_BYTES:
            return Response(
                {"detail": "File too large (max 5 MB)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not file.name.lower().endswith(ALLOWED_EXTENSIONS):
            return Response(
                {"detail": "Unsupported file type. Upload PDF, DOCX, or TXT."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = file.read()
        try:
            text = extract_text(data, file.name)
        except Exception as exc:
            return Response(
                {"detail": f"Could not read file: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(text) < 100:
            return Response(
                {"detail": "Could not extract enough text from this file. Is it a scanned image? Export a text-based PDF and try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file.seek(0)
        cv = CVDocument.objects.create(
            user=request.user,
            file=file,
            original_filename=file.name,
            extracted_text=text,
        )
        review = _queue_review(cv, _resolve_target_role(request))

        return Response(
            {
                "cv": CVDocumentSerializer(cv).data,
                "review": CVReviewSerializer(review).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CVListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cvs = CVDocument.objects.filter(user=request.user).prefetch_related("reviews")
        return Response(CVDocumentSerializer(cvs, many=True).data)


class CVReviewDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        review = (
            CVReview.objects.filter(cv__user=request.user, cv_id=pk)
            .order_by("-created_at")
            .first()
        )
        if not review:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CVReviewSerializer(review).data)


class CVRereviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            cv = CVDocument.objects.get(pk=pk, user=request.user)
        except CVDocument.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        review = _queue_review(cv, _resolve_target_role(request))
        return Response(CVReviewSerializer(review).data, status=status.HTTP_202_ACCEPTED)


class CVDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            cv = CVDocument.objects.get(pk=pk, user=request.user)
        except CVDocument.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        cv.file.delete(save=False)
        cv.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
