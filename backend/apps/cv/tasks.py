import logging

from celery import shared_task

from .models import CVReview
from .services import analyze_cv

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def run_cv_review(self, review_id: int):
    try:
        review = CVReview.objects.select_related("cv").get(id=review_id)
    except CVReview.DoesNotExist:
        logger.warning("run_cv_review: review %s not found", review_id)
        return

    review.status = "processing"
    review.save(update_fields=["status"])

    try:
        result = analyze_cv(review.cv.extracted_text, review.target_role)
    except Exception as exc:
        logger.error("CV review %s failed: %s", review_id, exc)
        review.status = "failed"
        review.error = str(exc)[:1000]
        review.save(update_fields=["status", "error"])
        raise self.retry(exc=exc)

    review.overall_score = result["overall_score"]
    review.summary = result["summary"]
    review.strengths = result["strengths"]
    review.improvements = result["improvements"]
    review.matched_skills = result["matched_skills"]
    review.missing_skills = result["missing_skills"]
    review.job_matches = result["job_matches"]
    review.market_job_count = result["market_job_count"]
    review.status = "done"
    review.error = ""
    review.save()
    logger.info("CV review %s complete (score %s)", review_id, review.overall_score)
