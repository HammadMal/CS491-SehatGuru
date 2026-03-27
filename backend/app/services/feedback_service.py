from datetime import datetime, timezone

from app.config.firebase import firebase_client
from app.models.feedback import FeedbackSubmissionRequest


class FeedbackService:
    @staticmethod
    async def save_feedback(uid: str, email: str, payload: FeedbackSubmissionRequest):
        db = firebase_client.db
        submitted_at = datetime.now(timezone.utc)

        doc = {
            "userId": uid,
            "userEmail": email,
            "sections": [section.model_dump() for section in payload.sections],
            "comment": payload.comment or "",
            "submitted_at": submitted_at.isoformat(),
        }

        ref = db.collection("feedback_submissions").document()
        ref.set(doc)

        return {
            "id": ref.id,
            "message": "Feedback submitted successfully",
            "submitted_at": submitted_at,
        }

