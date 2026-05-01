from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LearningPath
from .serializers import LearningPathSerializer
from .services import generate_learning_path


class LearningPathView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        path = LearningPath.objects.filter(user=request.user).first()
        if not path:
            return self._generate(request)
        return Response(LearningPathSerializer(path).data)

    def _generate(self, request):
        try:
            result = generate_learning_path(request.user)
        except Exception as exc:
            return Response(
                {"detail": f"AI generation failed: {exc}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        path, _ = LearningPath.objects.update_or_create(
            user=request.user,
            defaults={"raw_response": result["raw"], "skills": result["skills"]},
        )
        return Response(LearningPathSerializer(path).data, status=status.HTTP_201_CREATED)


class RegenerateLearningPathView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            result = generate_learning_path(request.user)
        except Exception as exc:
            return Response(
                {"detail": f"AI generation failed: {exc}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        path, _ = LearningPath.objects.update_or_create(
            user=request.user,
            defaults={"raw_response": result["raw"], "skills": result["skills"]},
        )
        return Response(LearningPathSerializer(path).data)
