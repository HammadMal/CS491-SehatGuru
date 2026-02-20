from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal
from datetime import datetime


class BasicInfo(BaseModel):
    """User's basic information"""
    full_name: str = Field(..., min_length=2, max_length=100)
    height: str = Field(..., description="Height value as string")
    height_unit: Literal["cm", "ft"] = Field(default="cm")
    weight: str = Field(..., description="Weight value as string")
    weight_unit: Literal["kg", "lbs"] = Field(default="kg")
    age: str = Field(..., description="Age as string")
    gender: Literal["male", "female", "other", "prefer-not-to-say", ""] = Field(default="")


class MealPreferences(BaseModel):
    """User's meal preferences"""
    breakfast: bool = Field(default=False)
    lunch: bool = Field(default=False)
    dinner: bool = Field(default=False)
    snacks: bool = Field(default=False)


class DietaryPreferences(BaseModel):
    """User's dietary preferences"""
    vegetarian: bool = Field(default=False)
    vegan: bool = Field(default=False)
    gluten_free: bool = Field(default=False)
    other: str = Field(default="", max_length=200)


class UserProfileRequest(BaseModel):
    """Request model for creating/updating user profile"""
    basic_info: BasicInfo
    activity_level: Literal[
        "sedentary",
        "lightly-active",
        "moderately-active",
        "very-active",
        "extra-active",
        ""
    ] = Field(default="")
    health_goals: List[Literal[
        "lose-weight",
        "maintain-weight",
        "gain-weight",
        "build-muscle",
        "improve-health",
        "manage-condition"
    ]] = Field(default_factory=list)
    meal_preferences: MealPreferences
    dietary_preferences: DietaryPreferences


class UserProfileResponse(BaseModel):
    """Response model for user profile"""
    uid: str
    basic_info: BasicInfo
    activity_level: str
    health_goals: List[str]
    meal_preferences: MealPreferences
    dietary_preferences: DietaryPreferences
    onboarding_completed: bool = Field(default=False)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Calorie calculation fields
    daily_calorie_goal: Optional[int] = Field(default=None, description="Personalized daily calorie target")
    bmr: Optional[float] = Field(default=None, description="Basal Metabolic Rate (calories/day)")
    tdee: Optional[float] = Field(default=None, description="Total Daily Energy Expenditure (calories/day)")
    goal_adjustment: Optional[int] = Field(default=None, description="Calorie adjustment for health goals")
    calculation_method: Optional[str] = Field(default=None, description="Algorithm used for calculation")
    calorie_last_calculated_at: Optional[datetime] = Field(default=None, description="When calories were last calculated")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class UserProfileUpdateRequest(BaseModel):
    """Request model for partial profile updates"""
    basic_info: Optional[BasicInfo] = None
    activity_level: Optional[str] = None
    health_goals: Optional[List[str]] = None
    meal_preferences: Optional[MealPreferences] = None
    dietary_preferences: Optional[DietaryPreferences] = None
