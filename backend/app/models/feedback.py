from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class FeedbackAnswer(BaseModel):
    question_id: str = Field(..., min_length=1, max_length=100)
    question: str = Field(..., min_length=3, max_length=300)
    rating: int = Field(..., ge=1, le=5)


class FeedbackSection(BaseModel):
    section_id: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=2, max_length=100)
    answers: List[FeedbackAnswer] = Field(..., min_length=1)
    improvement_comment: Optional[str] = Field(default="", max_length=1000)


class FeedbackSubmissionRequest(BaseModel):
    sections: List[FeedbackSection] = Field(..., min_length=1)
    comment: Optional[str] = Field(default="", max_length=1500)


class FeedbackSubmissionResponse(BaseModel):
    id: str
    message: str
    submitted_at: datetime
