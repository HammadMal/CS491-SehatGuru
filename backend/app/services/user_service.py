from datetime import datetime
from typing import Optional, Dict
from fastapi import HTTPException, status
from app.config.firebase import firebase_client
from app.config.settings import settings
from app.models.user import UserProfileRequest, UserProfileResponse, UserProfileUpdateRequest
from app.utils.calorie_calculator import calculate_daily_calories


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
                "basic_info": profile_data.basic_info.model_dump(),
                "activity_level": profile_data.activity_level,
                "health_goals": profile_data.health_goals,
                "meal_preferences": profile_data.meal_preferences.model_dump(),
                "dietary_preferences": profile_data.dietary_preferences.model_dump(),
                "onboarding_completed": True,
                "updated_at": now
            }
            
            # Calculate personalized daily calorie goal
            try:
                calorie_result = calculate_daily_calories(
                    age=int(profile_data.basic_info.age),
                    gender=profile_data.basic_info.gender,
                    height=float(profile_data.basic_info.height),
                    height_unit=profile_data.basic_info.height_unit,
                    weight=float(profile_data.basic_info.weight),
                    weight_unit=profile_data.basic_info.weight_unit,
                    activity_level=profile_data.activity_level,
                    health_goals=profile_data.health_goals
                )
                
                # Add calorie calculation results to profile
                profile_dict["daily_calorie_goal"] = calorie_result["daily_calorie_goal"]
                profile_dict["bmr"] = calorie_result["bmr"]
                profile_dict["tdee"] = calorie_result["tdee"]
                profile_dict["goal_adjustment"] = calorie_result["goal_adjustment"]
                profile_dict["calculation_method"] = calorie_result["calculation_method"]
                profile_dict["calorie_last_calculated_at"] = datetime.fromisoformat(calorie_result["last_calculated_at"])
                
                print(f"Calculated daily calorie goal: {calorie_result['daily_calorie_goal']} for user {uid}")
            except Exception as calc_error:
                print(f"Warning: Could not calculate calories: {str(calc_error)}")
                # Continue without calorie calculation - not critical for profile save

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
                updated_at=now,
                daily_calorie_goal=updated_user.get("daily_calorie_goal"),
                bmr=updated_user.get("bmr"),
                tdee=updated_user.get("tdee"),
                goal_adjustment=updated_user.get("goal_adjustment"),
                calculation_method=updated_user.get("calculation_method"),
                calorie_last_calculated_at=updated_user.get("calorie_last_calculated_at")
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
                updated_at=user_data.get("updated_at"),
                daily_calorie_goal=user_data.get("daily_calorie_goal"),
                bmr=user_data.get("bmr"),
                tdee=user_data.get("tdee"),
                goal_adjustment=user_data.get("goal_adjustment"),
                calculation_method=user_data.get("calculation_method"),
                calorie_last_calculated_at=user_data.get("calorie_last_calculated_at")
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
            
            # Track if we need to recalculate calories
            needs_calorie_recalc = False

            if update_data.basic_info is not None:
                update_dict["basic_info"] = update_data.basic_info.model_dump()
                needs_calorie_recalc = True  # Age, weight, height, or gender changed

            if update_data.activity_level is not None:
                update_dict["activity_level"] = update_data.activity_level
                needs_calorie_recalc = True  # Activity level changed

            if update_data.health_goals is not None:
                update_dict["health_goals"] = update_data.health_goals
                needs_calorie_recalc = True  # Health goals changed

            if update_data.meal_preferences is not None:
                update_dict["meal_preferences"] = update_data.meal_preferences.model_dump()

            if update_data.dietary_preferences is not None:
                update_dict["dietary_preferences"] = update_data.dietary_preferences.model_dump()
            
            # Recalculate calories if relevant fields changed
            if needs_calorie_recalc:
                try:
                    # Get current user data to fill in missing fields
                    existing_data = user_snapshot.to_dict()
                    basic_info = update_data.basic_info or existing_data.get("basic_info", {})
                    activity_level = update_data.activity_level or existing_data.get("activity_level", "")
                    health_goals = update_data.health_goals or existing_data.get("health_goals", [])
                    
                    # Only recalculate if we have all required data
                    if basic_info and activity_level:
                        from app.models.user import BasicInfo as BasicInfoModel
                        if isinstance(basic_info, dict):
                            basic_info_obj = BasicInfoModel(**basic_info)
                        else:
                            basic_info_obj = basic_info
                        
                        calorie_result = calculate_daily_calories(
                            age=int(basic_info_obj.age),
                            gender=basic_info_obj.gender,
                            height=float(basic_info_obj.height),
                            height_unit=basic_info_obj.height_unit,
                            weight=float(basic_info_obj.weight),
                            weight_unit=basic_info_obj.weight_unit,
                            activity_level=activity_level,
                            health_goals=health_goals
                        )
                        
                        # Update calorie fields
                        update_dict["daily_calorie_goal"] = calorie_result["daily_calorie_goal"]
                        update_dict["bmr"] = calorie_result["bmr"]
                        update_dict["tdee"] = calorie_result["tdee"]
                        update_dict["goal_adjustment"] = calorie_result["goal_adjustment"]
                        update_dict["calculation_method"] = calorie_result["calculation_method"]
                        update_dict["calorie_last_calculated_at"] = datetime.fromisoformat(calorie_result["last_calculated_at"])
                        
                        print(f"Recalculated daily calorie goal: {calorie_result['daily_calorie_goal']} for user {uid}")
                except Exception as calc_error:
                    print(f"Warning: Could not recalculate calories: {str(calc_error)}")
                    # Continue with update even if calorie calculation fails

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
