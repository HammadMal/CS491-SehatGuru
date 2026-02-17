"""
Calorie Calculation Utilities

Resting energy expenditure is estimated using the Mifflin-St Jeor equation (1990).
Total Daily Energy Expenditure (TDEE) is computed using standardized activity multipliers.
Caloric targets are adjusted according to evidence-based energy balance principles.

References:
- Mifflin, M. D., et al. (1990). A new predictive equation for resting energy expenditure 
  in healthy individuals. The American Journal of Clinical Nutrition, 51(2), 241-247.
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime


# Activity level multipliers (standard values used in practice)
ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,           # Little or no exercise
    "lightly-active": 1.375,    # Exercise 1-3 times/week
    "moderately-active": 1.55,  # Exercise 4-5 times/week
    "very-active": 1.725,       # Exercise 6-7 times/week
    "extra-active": 1.9,        # Very hard exercise, physical job
}


def convert_to_metric(value: float, unit: str, measurement_type: str) -> float:
    """
    Convert imperial units to metric.
    
    Args:
        value: The numeric value to convert
        unit: The unit ('kg', 'lbs', 'cm', 'ft')
        measurement_type: Either 'weight' or 'height'
    
    Returns:
        Value in metric units (kg or cm)
    """
    if measurement_type == "weight":
        if unit == "lbs":
            return value * 0.453592  # lbs to kg
        return value  # already kg
    
    elif measurement_type == "height":
        if unit == "ft":
            return value * 30.48  # feet to cm
        return value  # already cm
    
    return value


def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    """
    Calculate Basal Metabolic Rate using the Mifflin-St Jeor equation (1990).
    
    Formula:
    - Men: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
    - Women: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161
    
    Args:
        weight_kg: Weight in kilograms
        height_cm: Height in centimeters
        age: Age in years
        gender: 'male' or 'female' (other values default to female formula)
    
    Returns:
        BMR in calories per day
    """
    # Base calculation (same for both genders)
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    
    # Gender-specific adjustment
    if gender.lower() == "male":
        bmr += 5
    else:
        # Use female formula for 'female', 'other', 'prefer-not-to-say'
        bmr -= 161
    
    return bmr


def calculate_tdee(bmr: float, activity_level: str) -> float:
    """
    Calculate Total Daily Energy Expenditure.
    
    TDEE = BMR × Activity Multiplier
    
    Args:
        bmr: Basal Metabolic Rate
        activity_level: Activity level string (e.g., 'moderately-active')
    
    Returns:
        TDEE in calories per day
    """
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, 1.2)  # Default to sedentary
    return bmr * multiplier


def adjust_for_goals(tdee: float, health_goals: List[str]) -> Tuple[int, int]:
    """
    Adjust TDEE based on health goals using percentage-based capping.
    
    This approach is more physiologically consistent than fixed adjustments,
    as it scales appropriately for different body sizes and activity levels.
    
    Args:
        tdee: Total Daily Energy Expenditure
        health_goals: List of health goal strings
    
    Returns:
        Tuple of (adjusted_calories, adjustment_amount)
    """
    adjustment = 0
    
    # Priority order: lose > maintain > gain
    if "lose-weight" in health_goals:
        # Max 20% deficit, capped at 500 kcal (safe weight loss)
        adjustment = -min(500, int(0.20 * tdee))
    
    elif "gain-weight" in health_goals or "build-muscle" in health_goals:
        # Max 15% surplus, capped at 400 kcal (lean muscle gain)
        adjustment = min(400, int(0.15 * tdee))
    
    # 'maintain-weight', 'improve-health', 'manage-condition' → no adjustment
    
    adjusted_calories = int(tdee + adjustment)
    return adjusted_calories, adjustment


def calculate_daily_calories(
    age: int,
    gender: str,
    height: float,
    height_unit: str,
    weight: float,
    weight_unit: str,
    activity_level: str,
    health_goals: List[str]
) -> Dict[str, any]:
    """
    Calculate personalized daily calorie goal with full metadata.
    
    Args:
        age: Age in years
        gender: 'male', 'female', 'other', or 'prefer-not-to-say'
        height: Height value
        height_unit: 'cm' or 'ft'
        weight: Weight value
        weight_unit: 'kg' or 'lbs'
        activity_level: Activity level string
        health_goals: List of health goal strings
    
    Returns:
        Dictionary containing:
        - daily_calorie_goal: Final calorie target (int)
        - bmr: Basal Metabolic Rate (float)
        - tdee: Total Daily Energy Expenditure (float)
        - goal_adjustment: Calorie adjustment applied (int)
        - calculation_method: Algorithm used (str)
        - last_calculated_at: Timestamp (str)
    """
    # Convert to metric units
    weight_kg = convert_to_metric(weight, weight_unit, "weight")
    height_cm = convert_to_metric(height, height_unit, "height")
    
    # Validate inputs
    if age < 13 or age > 120:
        age = max(13, min(120, age))  # Clamp to valid range
    
    if weight_kg < 20 or weight_kg > 500:
        weight_kg = max(20, min(500, weight_kg))
    
    if height_cm < 50 or height_cm > 300:
        height_cm = max(50, min(300, height_cm))
    
    # Calculate BMR
    bmr = calculate_bmr(weight_kg, height_cm, age, gender)
    
    # Calculate TDEE
    tdee = calculate_tdee(bmr, activity_level)
    
    # Adjust for goals
    daily_calorie_goal, goal_adjustment = adjust_for_goals(tdee, health_goals)
    
    # Return comprehensive result
    return {
        "daily_calorie_goal": daily_calorie_goal,
        "bmr": round(bmr, 1),
        "tdee": round(tdee, 1),
        "goal_adjustment": goal_adjustment,
        "calculation_method": "mifflin-st-jeor-1990",
        "last_calculated_at": datetime.utcnow().isoformat()
    }


def get_calorie_explanation(calculation_result: Dict[str, any]) -> str:
    """
    Generate human-readable explanation of calorie calculation.
    
    Args:
        calculation_result: Result from calculate_daily_calories()
    
    Returns:
        Formatted explanation string
    """
    bmr = calculation_result["bmr"]
    tdee = calculation_result["tdee"]
    adjustment = calculation_result["goal_adjustment"]
    goal = calculation_result["daily_calorie_goal"]
    
    explanation = f"Your resting metabolism (BMR) is {bmr:.0f} calories/day. "
    explanation += f"With your activity level, you burn {tdee:.0f} calories/day (TDEE). "
    
    if adjustment < 0:
        explanation += f"To lose weight safely, we've reduced this by {abs(adjustment)} calories. "
    elif adjustment > 0:
        explanation += f"To gain weight/muscle, we've added {adjustment} calories. "
    else:
        explanation += "To maintain your weight, no adjustment is needed. "
    
    explanation += f"Your daily calorie goal is {goal} calories."
    
    return explanation
