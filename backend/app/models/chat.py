from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class UserContext(BaseModel):
    """User context for personalized responses"""

    health_goals: Optional[List[str]] = Field(
        None,
        description="User's health goals (e.g., 'weight_loss', 'muscle_gain', 'diabetes_management')"
    )
    dietary_restrictions: Optional[List[str]] = Field(
        None,
        description="Dietary restrictions (e.g., 'vegetarian', 'diabetic', 'low_sodium')"
    )
    daily_calorie_target: Optional[int] = Field(
        None,
        description="User's daily calorie target"
    )
    age: Optional[int] = Field(None, description="User's age")
    gender: Optional[str] = Field(None, description="User's gender")


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
