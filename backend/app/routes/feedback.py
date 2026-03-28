from fastapi import APIRouter, Depends, status

from app.middleware.auth import get_current_active_user
from app.models.feedback import FeedbackSubmissionRequest, FeedbackSubmissionResponse
from app.services.feedback_service import FeedbackService

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("", response_model=FeedbackSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    feedback_data: FeedbackSubmissionRequest,
    current_user: dict = Depends(get_current_active_user)
):
    uid = current_user["uid"]
    email = current_user.get("email", "")
    return await FeedbackService.save_feedback(uid, email, feedback_data)

