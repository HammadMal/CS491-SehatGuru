from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class UserContext(BaseModel):
    """User context for personalized responses"""

    name: Optional[str] = Field(None, description="User's full name")
    health_goals: Optional[List[str]] = Field(
        None,
        description="User's health goals (e.g., 'weight_loss', 'muscle_gain', 'diabetes_management')"
    )
    dietary_restrictions: Optional[List[str]] = Field(
        None,
        description="Dietary restrictions (e.g., 'vegetarian', 'diabetic', 'low_sodium')"
    )
    meal_preferences: Optional[List[str]] = Field(
        None,
        description="Meals the user typically eats (e.g., ['breakfast', 'dinner'])"
    )
    daily_calorie_target: Optional[int] = Field(
        None,
        description="User's daily calorie target"
    )
    age: Optional[int] = Field(None, description="User's age")
    gender: Optional[str] = Field(None, description="User's gender")
    weight_kg: Optional[float] = Field(None, description="User's weight in kilograms")
    height_cm: Optional[float] = Field(None, description="User's height in centimeters")
    activity_level: Optional[str] = Field(None, description="User's activity level (e.g., 'sedentary', 'moderately-active')")


class ChatMessageRequest(BaseModel):
    """Request model for chat messages"""

    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="User's message to the chatbot"
    )
    user_context: Optional[UserContext] = Field(
        None,
        description="Optional user context for personalized responses"
    )
    use_rag: bool = Field(
        True,
        description="Whether to use RAG for context retrieval (default True)"
    )


class ChatHistoryMessage(BaseModel):
    """A single message in chat history"""

    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatWithHistoryRequest(BaseModel):
    """Request model for chat with conversation history"""

    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="User's current message"
    )
    chat_history: Optional[List[ChatHistoryMessage]] = Field(
        None,
        description="Previous conversation messages"
    )
    user_context: Optional[UserContext] = Field(
        None,
        description="Optional user context for personalized responses"
    )
    use_rag: bool = Field(
        True,
        description="Whether to use RAG for context retrieval"
    )
    user_memory_override: Optional[str] = Field(
        None,
        description="If set, use this preference summary instead of loading from Firestore. Also skips memory save. For testing only."
    )


class ValidationScores(BaseModel):
    """Validation scores for response quality."""
    safety: float = Field(..., ge=0.0, le=1.0, description="Safety score (0.0-1.0)")
    accuracy: float = Field(..., ge=0.0, le=1.0, description="Accuracy score (0.0-1.0)")
    personalization: float = Field(..., ge=0.0, le=1.0, description="Personalization score (0.0-1.0)")
    cultural: float = Field(..., ge=0.0, le=1.0, description="Cultural appropriateness score (0.0-1.0)")


class ChatMessageResponse(BaseModel):
    """Response model for chat messages"""

    response: str = Field(
        ...,
        description="Bot's response to the user's message"
    )
    rag_used: bool = Field(
        True,
        description="Whether RAG context was used in the response"
    )
    intent: Optional[str] = Field(
        None,
        description="Classified intent: 'nutritional_advice' or 'meal_plan_generation'"
    )
    # NEW VALIDATION FIELDS
    validation_scores: Optional[ValidationScores] = Field(
        None,
        description="Validation scores if validation was enabled"
    )
    validation_passed: Optional[bool] = Field(
        None,
        description="Whether response passed validation thresholds"
    )
    retry_count: Optional[int] = Field(
        None,
        description="Number of regeneration attempts (0 = first attempt)"
    )
    guard_result: Optional[str] = Field(
        None,
        description="Guard rail result: 'ok', 'off_topic', 'harmful', or 'dangerous_medical'"
    )
