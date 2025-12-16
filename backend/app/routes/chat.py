from fastapi import APIRouter, Depends, HTTPException, status
from app.models.chat import ChatMessageRequest, ChatMessageResponse
from app.services.gemini_service import gemini_service
from app.middleware.auth import get_current_active_user

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(
    request: ChatMessageRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Send a message to the fitness chatbot and get a response

    Requires valid access token in Authorization header.

    - **message**: User's message/question (1-2000 characters)

    Returns chatbot's response
    """
    try:
        # Generate response using Gemini service
        response_text = await gemini_service.generate_chat_response(request.message)

        return ChatMessageResponse(response=response_text)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate chatbot response: {str(e)}"
        )
