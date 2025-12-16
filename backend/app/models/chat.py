from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    """Request model for chat messages"""

    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="User's message to the chatbot"
    )


class ChatMessageResponse(BaseModel):
    """Response model for chat messages"""

    response: str = Field(
        ...,
        description="Bot's response to the user's message"
    )
