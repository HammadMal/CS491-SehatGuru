from datetime import datetime
from typing import Optional, Dict
from fastapi import HTTPException, status
from app.config.firebase import firebase_client
from app.config.settings import settings
from app.models.user import UserProfileRequest, UserProfileResponse, UserProfileUpdateRequest


class UserService:
    """Service for handling user profile operations"""

    @staticmethod
    async def save_user_profile(uid: str, profile_data: UserProfileRequest) -> UserProfileResponse:
        """
        Save or update user profile/onboarding data

        Args:
            uid: User ID from Firebase Auth
            profile_data: User profile/onboarding data

        Returns:
            UserProfileResponse with saved data

        Raises:
            HTTPException: If save operation fails
        """
        try:
            users_ref = firebase_client.db.collection(settings.FIRESTORE_COLLECTION_USERS)
            user_doc = users_ref.document(uid)

            # Check if user exists
            user_snapshot = user_doc.get()
            if not user_snapshot.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            # Prepare profile data
            now = datetime.utcnow()
            profile_dict = {
                "basic_info": profile_data.basic_info.dict(),
                "activity_level": profile_data.activity_level,
                "health_goals": profile_data.health_goals,
                "meal_preferences": profile_data.meal_preferences.dict(),
                "dietary_preferences": profile_data.dietary_preferences.dict(),
                "onboarding_completed": True,
                "updated_at": now
            }

            # Update full_name at the top level if provided and currently empty
            existing_data = user_snapshot.to_dict()
            if profile_data.basic_info.full_name and (not existing_data.get("full_name") or existing_data.get("full_name") == ""):
                profile_dict["full_name"] = profile_data.basic_info.full_name
                # Also update Firebase Auth display name
                try:
                    firebase_client.update_user(uid, display_name=profile_data.basic_info.full_name)
                except Exception as e:
                    print(f"Warning: Could not update Firebase Auth display name: {str(e)}")

            # Check if this is first time saving profile
            if not existing_data.get("onboarding_completed"):
                profile_dict["profile_created_at"] = now

            # Update user document with profile data
            user_doc.update(profile_dict)

            # Get updated user data
            updated_user = user_doc.get().to_dict()

            return UserProfileResponse(
                uid=uid,
                basic_info=profile_data.basic_info,
                activity_level=profile_data.activity_level,
                health_goals=profile_data.health_goals,
                meal_preferences=profile_data.meal_preferences,
                dietary_preferences=profile_data.dietary_preferences,
                onboarding_completed=True,
                created_at=updated_user.get("profile_created_at"),
                updated_at=now
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save user profile: {str(e)}"
            )

    @staticmethod
    async def get_user_profile(uid: str) -> Optional[UserProfileResponse]:
        """
        Get user profile data

        Args:
            uid: User ID from Firebase Auth

        Returns:
            UserProfileResponse if profile exists, None otherwise

        Raises:
            HTTPException: If retrieval fails
        """
        try:
            users_ref = firebase_client.db.collection(settings.FIRESTORE_COLLECTION_USERS)
            user_doc = users_ref.document(uid).get()

            if not user_doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            user_data = user_doc.to_dict()

            # Check if user has completed onboarding
            if not user_data.get("onboarding_completed"):
                return None

            # Parse nested data
            from app.models.user import BasicInfo, MealPreferences, DietaryPreferences

            basic_info_data = user_data.get("basic_info", {})
            meal_prefs_data = user_data.get("meal_preferences", {})
            dietary_prefs_data = user_data.get("dietary_preferences", {})

            return UserProfileResponse(
                uid=uid,
                basic_info=BasicInfo(**basic_info_data),
                activity_level=user_data.get("activity_level", ""),
                health_goals=user_data.get("health_goals", []),
                meal_preferences=MealPreferences(**meal_prefs_data),
                dietary_preferences=DietaryPreferences(**dietary_prefs_data),
                onboarding_completed=user_data.get("onboarding_completed", False),
                created_at=user_data.get("profile_created_at"),
                updated_at=user_data.get("updated_at")
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve user profile: {str(e)}"
            )

    @staticmethod
    async def update_user_profile(uid: str, update_data: UserProfileUpdateRequest) -> UserProfileResponse:
        """
        Partially update user profile

        Args:
            uid: User ID from Firebase Auth
            update_data: Partial profile data to update

        Returns:
            UserProfileResponse with updated data

        Raises:
            HTTPException: If update operation fails
        """
        try:
            users_ref = firebase_client.db.collection(settings.FIRESTORE_COLLECTION_USERS)
            user_doc = users_ref.document(uid)

            # Check if user exists
            user_snapshot = user_doc.get()
            if not user_snapshot.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            # Prepare update data (only include fields that are provided)
            update_dict = {"updated_at": datetime.utcnow()}

            if update_data.basic_info is not None:
                update_dict["basic_info"] = update_data.basic_info.dict()

            if update_data.activity_level is not None:
                update_dict["activity_level"] = update_data.activity_level

            if update_data.health_goals is not None:
                update_dict["health_goals"] = update_data.health_goals

            if update_data.meal_preferences is not None:
                update_dict["meal_preferences"] = update_data.meal_preferences.dict()

            if update_data.dietary_preferences is not None:
                update_dict["dietary_preferences"] = update_data.dietary_preferences.dict()

            # Update user document
            user_doc.update(update_dict)

            # Return updated profile
            return await UserService.get_user_profile(uid)

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update user profile: {str(e)}"
            )

    @staticmethod
    async def check_onboarding_status(uid: str) -> bool:
        """
        Check if user has completed onboarding

        Args:
            uid: User ID from Firebase Auth

        Returns:
            True if onboarding completed, False otherwise
        """
        try:
            users_ref = firebase_client.db.collection(settings.FIRESTORE_COLLECTION_USERS)
            user_doc = users_ref.document(uid).get()

            if not user_doc.exists:
                return False

            user_data = user_doc.to_dict()
            return user_data.get("onboarding_completed", False)

        except Exception as e:
            print(f"Error checking onboarding status: {str(e)}")
            return False
