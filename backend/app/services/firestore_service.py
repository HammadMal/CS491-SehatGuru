"""Firestore service for meal operations and user memory"""
import logging
from datetime import datetime, timezone
from app.config.firebase import firebase_client
from firebase_admin import firestore

db = firebase_client.db

logger = logging.getLogger(__name__)

USER_MEMORY_COLLECTION = "user_memory"
MEMORY_MAX_RECENT_MESSAGES = 20
MEMORY_SUMMARIZE_EVERY_N = 5


def get_user_memory(user_id: str) -> dict:
    """Return stored preference summary and recent messages for a user."""
    ref = db.collection(USER_MEMORY_COLLECTION).document(user_id)
    doc = ref.get()
    if not doc.exists:
        print(f"[MEMORY] No memory found for user {user_id} — starting fresh")
        return {"preference_summary": None, "recent_messages": [], "message_count": 0}
    data = doc.to_dict()
    summary = data.get("preference_summary")
    count = data.get("message_count", 0)
    recent_len = len(data.get("recent_messages", []))
    print(f"[MEMORY] Loaded memory for user {user_id}: message_count={count}, recent_messages={recent_len}, has_summary={bool(summary)}")
    if summary:
        print(f"[MEMORY] Summary: {summary[:120]}{'...' if len(summary) > 120 else ''}")
    return {
        "preference_summary": summary,
        "recent_messages": data.get("recent_messages", []),
        "message_count": count,
    }


def save_user_memory(user_id: str, user_message: str, bot_response: str) -> int:
    """Append new turn to recent_messages, return updated message_count."""
    ref = db.collection(USER_MEMORY_COLLECTION).document(user_id)
    doc = ref.get()
    data = doc.to_dict() if doc.exists else {}

    recent = data.get("recent_messages", [])
    recent.append({"role": "user", "content": user_message})
    recent.append({"role": "assistant", "content": bot_response})
    if len(recent) > MEMORY_MAX_RECENT_MESSAGES:
        recent = recent[-MEMORY_MAX_RECENT_MESSAGES:]

    count = data.get("message_count", 0) + 1
    ref.set({
        **data,
        "recent_messages": recent,
        "message_count": count,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }, merge=True)
    print(f"[MEMORY] Saved turn for user {user_id}: message_count={count}, recent_messages={len(recent)}")
    if count % MEMORY_SUMMARIZE_EVERY_N == 0:
        print(f"[MEMORY] *** Count={count} hit threshold — summary regeneration will be triggered ***")
    return count


def update_preference_summary(user_id: str, summary: str) -> None:
    """Store a newly generated preference summary."""
    ref = db.collection(USER_MEMORY_COLLECTION).document(user_id)
    ref.set({
        "preference_summary": summary,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }, merge=True)
    print(f"[MEMORY] Summary written to Firestore for user {user_id}: {summary[:120]}{'...' if len(summary) > 120 else ''}")

async def delete_meal_from_firestore(meal_id: str, user_id: str):
    """
    Delete a meal from Firestore

    Args:
        meal_id: The ID of the meal to delete
        user_id: The user ID to verify ownership

    Raises:
        ValueError: If meal not found or doesn't belong to user
    """
    try:
        meal_ref = db.collection('meals').document(meal_id)
        meal_doc = meal_ref.get()

        if not meal_doc.exists:
            raise ValueError("Meal not found")

        meal_data = meal_doc.to_dict()
        if meal_data.get('userId') != user_id:
            raise ValueError("Meal does not belong to user")

        meal_ref.delete()
        logger.info(f"Deleted meal {meal_id} for user {user_id}")

    except Exception as e:
        logger.error(f"Error deleting meal {meal_id}: {str(e)}")
        raise