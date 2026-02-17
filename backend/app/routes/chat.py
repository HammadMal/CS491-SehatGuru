import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatWithHistoryRequest
)
from app.services.gemini_service import gemini_service
from app.services.rag_service import rag_service
from app.services.intent_router import route_and_respond, generate_preference_summary
from app.services.firestore_service import (
    get_user_memory,
    save_user_memory,
    update_preference_summary,
    MEMORY_SUMMARIZE_EVERY_N,
)
from app.middleware.auth import get_current_active_user

router = APIRouter(prefix="/chat", tags=["Chat"])
logger = logging.getLogger(__name__)


async def _regenerate_summary(user_id: str, recent_messages: list) -> None:
    """Background task to regenerate preference summary."""
    try:
        summary = await generate_preference_summary(recent_messages)
        if summary:
            update_preference_summary(user_id, summary)
            logger.info(f"Summary regenerated for user {user_id}")
    except Exception as e:
        logger.warning(f"Summary regeneration failed for {user_id}: {e}")


@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(
    request: ChatMessageRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Send a message to SehatGuru chatbot and get a RAG-enhanced response.

    The chatbot uses Retrieval Augmented Generation (RAG) to provide
    responses grounded in Pakistani Dietary Guidelines and local food data.

    Requires valid access token in Authorization header.

    - **message**: User's message/question (1-2000 characters)
    - **user_context**: Optional user profile for personalized responses
      - health_goals: List of goals (e.g., ["weight_loss", "diabetes_management"])
      - dietary_restrictions: List of restrictions (e.g., ["vegetarian", "low_sodium"])
      - daily_calorie_target: Target calories per day
      - age: User's age
      - gender: User's gender
    - **use_rag**: Whether to use RAG context (default True)

    Returns chatbot's response with Pakistani nutrition expertise.
    """
    try:
        # Convert user_context to dict if provided
        user_context_dict = None
        if request.user_context:
            user_context_dict = request.user_context.model_dump(exclude_none=True)

        if request.use_rag:
            # Use intent router for RAG-enabled requests
            result = await route_and_respond(
                message=request.message,
                user_context=user_context_dict,
                use_rag=True,
                use_validation=True,  # NEW: Enable validation by default
            )
            return ChatMessageResponse(
                response=result["response"],
                rag_used=result["rag_used"],
                intent=result["intent"],
                validation_scores=result.get("validation_scores"),  # NEW
                validation_passed=result.get("validation_passed"),  # NEW
                retry_count=result.get("retry_count"),              # NEW
            )

        # Fall back to existing Gemini service when RAG is disabled
        response_text = await gemini_service.generate_chat_response(
            message=request.message,
            user_context=user_context_dict,
            use_rag=False,
        )

        return ChatMessageResponse(
            response=response_text,
            rag_used=False,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate chatbot response: {str(e)}"
        )


@router.post("/message/with-history", response_model=ChatMessageResponse)
async def send_chat_message_with_history(
    request: ChatWithHistoryRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Send a message with conversation history for context-aware responses.

    This endpoint maintains conversation context by accepting previous messages,
    allowing for more coherent multi-turn conversations.

    - **message**: Current user message
    - **chat_history**: List of previous messages with role and content
    - **user_context**: Optional user profile
    - **use_rag**: Whether to use RAG context

    Returns chatbot's response considering conversation history.
    """
    try:
        # Convert user_context to dict if provided
        user_context_dict = None
        if request.user_context:
            user_context_dict = request.user_context.model_dump(exclude_none=True)

        # Convert chat history to list of dicts
        chat_history = None
        if request.chat_history:
            chat_history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.chat_history
            ]

        # Load user memory from Firestore (cross-session preference summary)
        try:
            memory = get_user_memory(current_user["uid"])
            preference_summary = memory.get("preference_summary")
            logger.info(f"[MEMORY] Loaded for uid={current_user['uid']}: has_summary={bool(preference_summary)}, msg_count={memory.get('message_count', 0)}")
        except Exception as e:
            logger.warning(f"[MEMORY] Failed to load user memory: {e}")
            preference_summary = None

        if request.use_rag:
            # Use intent router for RAG-enabled requests
            result = await route_and_respond(
                message=request.message,
                user_context=user_context_dict,
                chat_history=chat_history,
                use_rag=True,
                use_validation=True,
                user_memory=preference_summary,
            )

            # Save turn and trigger re-summarization if needed
            try:
                new_count = save_user_memory(
                    current_user["uid"], request.message, result["response"]
                )
                logger.info(f"[MEMORY] Turn saved for uid={current_user['uid']}, new message_count={new_count}")
                if new_count % MEMORY_SUMMARIZE_EVERY_N == 0:
                    logger.info(f"[MEMORY] Threshold hit at count={new_count} — firing background summary task")
                    updated_memory = get_user_memory(current_user["uid"])
                    asyncio.create_task(
                        _regenerate_summary(current_user["uid"], updated_memory["recent_messages"])
                    )
            except Exception as e:
                logger.warning(f"[MEMORY] Failed to save user memory: {e}")

            return ChatMessageResponse(
                response=result["response"],
                rag_used=result["rag_used"],
                intent=result["intent"],
                validation_scores=result.get("validation_scores"),
                validation_passed=result.get("validation_passed"),
                retry_count=result.get("retry_count"),
            )

        # Fall back to existing Gemini service when RAG is disabled
        response_text = await gemini_service.generate_chat_response_with_history(
            message=request.message,
            chat_history=chat_history,
            user_context=user_context_dict,
            use_rag=False,
        )

        # Save turn even when RAG is disabled
        try:
            save_user_memory(current_user["uid"], request.message, response_text)
        except Exception as e:
            logger.warning(f"Failed to save user memory: {e}")

        return ChatMessageResponse(
            response=response_text,
            rag_used=False,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate chatbot response: {str(e)}"
        )


@router.get("/rag/status")
async def get_rag_status(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get the status of RAG collections.

    Returns information about:
    - Knowledge base (Pakistani Dietary Guidelines) collection
    - Dishes database collection
    - Overall system readiness

    Useful for debugging and monitoring RAG system health.
    """
    try:
        status = rag_service.get_status()
        return {
            "status": "ok",
            "rag": status
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get RAG status: {str(e)}"
        )
