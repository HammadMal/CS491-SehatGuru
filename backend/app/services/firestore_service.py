"""Firestore service for meal operations"""
import logging
from app.config.firebase import firebase_client

db = firebase_client.db

logger = logging.getLogger(__name__)


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