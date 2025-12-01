from fastapi import APIRouter, Depends, status
from app.models.user import (
    UserProfileRequest,
    UserProfileResponse,
    UserProfileUpdateRequest
)
from app.models.auth import MessageResponse
from app.services.user_service import UserService
from app.middleware.auth import get_current_active_user
from app.models.auth import TokenData

router = APIRouter(prefix="/user", tags=["User Profile"])


@router.post("/profile", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def save_profile(
    profile_data: UserProfileRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Save or update user profile/onboarding data

    Requires valid access token in Authorization header.

    - **basic_info**: User's basic information (name, height, weight, age, gender)
    - **activity_level**: User's activity level
    - **health_goals**: List of health goals
    - **meal_preferences**: Meal preferences (breakfast, lunch, dinner, snacks)
    - **dietary_preferences**: Dietary restrictions and preferences

    Returns complete user profile with onboarding_completed = True
    """
    uid = current_user["uid"]
    return await UserService.save_user_profile(uid, profile_data)


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(current_user: dict = Depends(get_current_active_user)):
    """
    Get user profile data

    Requires valid access token in Authorization header.

    Returns user profile if onboarding completed, 404 if not found or not completed.
    """
    uid = current_user["uid"]
    profile = await UserService.get_user_profile(uid)

    if profile is None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found or onboarding not completed"
        )

    return profile


@router.patch("/profile", response_model=UserProfileResponse)
async def update_profile(
    update_data: UserProfileUpdateRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Partially update user profile

    Requires valid access token in Authorization header.

    Only provide the fields you want to update. All fields are optional.

    Returns updated user profile.
    """
    uid = current_user["uid"]
    return await UserService.update_user_profile(uid, update_data)


@router.get("/onboarding-status", response_model=dict)
async def get_onboarding_status(current_user: dict = Depends(get_current_active_user)):
    """
    Check if user has completed onboarding

    Requires valid access token in Authorization header.

    Returns onboarding_completed status as boolean.
    """
    uid = current_user["uid"]
    completed = await UserService.check_onboarding_status(uid)

    return {
        "uid": uid,
        "onboarding_completed": completed
    }


@router.get("/health")
async def health_check():
    """Health check endpoint for user service"""
    return {"status": "healthy", "service": "user-profile"}
