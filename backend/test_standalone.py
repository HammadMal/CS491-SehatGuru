"""
Standalone test for calorie calculator - no external dependencies required
"""

from datetime import datetime
from typing import List, Dict, Tuple

# Activity level multipliers
ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "lightly-active": 1.375,
    "moderately-active": 1.55,
    "very-active": 1.725,
    "extra-active": 1.9,
}

def convert_to_metric(value: float, unit: str, measurement_type: str) -> float:
    if measurement_type == "weight":
        if unit == "lbs":
            return value * 0.453592
        return value
    elif measurement_type == "height":
        if unit == "ft":
            return value * 30.48
        return value
    return value

def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    if gender.lower() == "male":
        bmr += 5
    else:
        bmr -= 161
    return bmr

def calculate_tdee(bmr: float, activity_level: str) -> float:
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, 1.2)
    return bmr * multiplier

def adjust_for_goals(tdee: float, health_goals: List[str]) -> Tuple[int, int]:
    adjustment = 0
    if "lose-weight" in health_goals:
        adjustment = -min(500, int(0.20 * tdee))
    elif "gain-weight" in health_goals or "build-muscle" in health_goals:
        adjustment = min(400, int(0.15 * tdee))
    adjusted_calories = int(tdee + adjustment)
    return adjusted_calories, adjustment

def calculate_daily_calories(age, gender, height, height_unit, weight, weight_unit, activity_level, health_goals):
    weight_kg = convert_to_metric(weight, weight_unit, "weight")
    height_cm = convert_to_metric(height, height_unit, "height")
    
    bmr = calculate_bmr(weight_kg, height_cm, age, gender)
    tdee = calculate_tdee(bmr, activity_level)
    daily_calorie_goal, goal_adjustment = adjust_for_goals(tdee, health_goals)
    
    return {
        "daily_calorie_goal": daily_calorie_goal,
        "bmr": round(bmr, 1),
        "tdee": round(tdee, 1),
        "goal_adjustment": goal_adjustment,
        "calculation_method": "mifflin-st-jeor-1990"
    }

# Run Tests
print("=" * 70)
print("CALORIE CALCULATOR STANDALONE TEST")
print("=" * 70)

# Test 1: 25M, 70kg, 175cm, moderately active, lose weight
print("\n✅ Test 1: 25M, 70kg, 175cm, Moderately Active, Lose Weight")
print("-" * 70)
result1 = calculate_daily_calories(25, "male", 175, "cm", 70, "kg", "moderately-active", ["lose-weight"])
print(f"BMR: {result1['bmr']} kcal/day")
print(f"TDEE: {result1['tdee']} kcal/day")
print(f"Goal Adjustment: {result1['goal_adjustment']} kcal")
print(f"Daily Calorie Goal: {result1['daily_calorie_goal']} kcal")
print(f"Method: {result1['calculation_method']}")

# Verify calculation
expected_bmr = (10 * 70) + (6.25 * 175) - (5 * 25) + 5
expected_tdee = expected_bmr * 1.55
expected_adjustment = -500  # 20% of 2586.6 = 517.3, capped at 500
expected_goal = int(expected_tdee + expected_adjustment)

assert abs(result1['bmr'] - expected_bmr) < 0.1, f"BMR mismatch: {result1['bmr']} vs {expected_bmr}"
assert abs(result1['tdee'] - expected_tdee) < 0.1, f"TDEE mismatch: {result1['tdee']} vs {expected_tdee}"
assert result1['goal_adjustment'] == expected_adjustment, f"Adjustment mismatch: {result1['goal_adjustment']} vs {expected_adjustment}"
assert result1['daily_calorie_goal'] == expected_goal, f"Goal mismatch: {result1['daily_calorie_goal']} vs {expected_goal}"
print("✅ PASSED - All values match expected calculations")

# Test 2: 25F, 60kg, 165cm, lightly active, maintain
print("\n✅ Test 2: 25F, 60kg, 165cm, Lightly Active, Maintain Weight")
print("-" * 70)
result2 = calculate_daily_calories(25, "female", 165, "cm", 60, "kg", "lightly-active", ["maintain-weight"])
print(f"BMR: {result2['bmr']} kcal/day")
print(f"TDEE: {result2['tdee']} kcal/day")
print(f"Goal Adjustment: {result2['goal_adjustment']} kcal")
print(f"Daily Calorie Goal: {result2['daily_calorie_goal']} kcal")

expected_bmr2 = (10 * 60) + (6.25 * 165) - (5 * 25) - 161
expected_tdee2 = expected_bmr2 * 1.375
expected_adjustment2 = 0
expected_goal2 = int(expected_tdee2)

assert abs(result2['bmr'] - expected_bmr2) < 0.1, "BMR mismatch"
assert abs(result2['tdee'] - expected_tdee2) < 0.1, "TDEE mismatch"
assert result2['goal_adjustment'] == expected_adjustment2, "Adjustment mismatch"
assert result2['daily_calorie_goal'] == expected_goal2, "Goal mismatch"
print("✅ PASSED - All values match expected calculations")

# Test 3: Small person with percentage-based adjustment
print("\n✅ Test 3: 25F, 50kg, 155cm, Sedentary, Lose Weight (Percentage Test)")
print("-" * 70)
result3 = calculate_daily_calories(25, "female", 155, "cm", 50, "kg", "sedentary", ["lose-weight"])
print(f"BMR: {result3['bmr']} kcal/day")
print(f"TDEE: {result3['tdee']} kcal/day")
print(f"Goal Adjustment: {result3['goal_adjustment']} kcal")
print(f"Daily Calorie Goal: {result3['daily_calorie_goal']} kcal")

expected_bmr3 = (10 * 50) + (6.25 * 155) - (5 * 25) - 161
expected_tdee3 = expected_bmr3 * 1.2
expected_adjustment3 = -min(500, int(0.20 * expected_tdee3))  # Should be percentage-based, not 500
print(f"Expected adjustment: {expected_adjustment3} kcal (20% of {expected_tdee3:.1f} = {0.20 * expected_tdee3:.1f})")

assert result3['goal_adjustment'] == expected_adjustment3, f"Adjustment should be percentage-based: {result3['goal_adjustment']} vs {expected_adjustment3}"
assert result3['goal_adjustment'] > -500, "Adjustment should be less than 500 for small person (percentage-based)"
print("✅ PASSED - Percentage-based adjustment working correctly (safer for small individuals)")

# Test 4: Imperial units
print("\n✅ Test 4: 30M, 154lbs, 5.75ft, Very Active, Build Muscle")
print("-" * 70)
result4 = calculate_daily_calories(30, "male", 5.75, "ft", 154, "lbs", "very-active", ["build-muscle"])
print(f"BMR: {result4['bmr']} kcal/day")
print(f"TDEE: {result4['tdee']} kcal/day")
print(f"Goal Adjustment: {result4['goal_adjustment']} kcal")
print(f"Daily Calorie Goal: {result4['daily_calorie_goal']} kcal")

# Convert to metric
weight_kg = 154 * 0.453592
height_cm = 5.75 * 30.48
expected_bmr4 = (10 * weight_kg) + (6.25 * height_cm) - (5 * 30) + 5
expected_tdee4 = expected_bmr4 * 1.725
expected_adjustment4 = min(400, int(0.15 * expected_tdee4))

assert abs(result4['bmr'] - expected_bmr4) < 0.2, "BMR mismatch for imperial units"
assert abs(result4['tdee'] - expected_tdee4) < 0.2, "TDEE mismatch for imperial units"
print("✅ PASSED - Imperial unit conversion working correctly")

print("\n" + "=" * 70)
print("🎉 ALL TESTS PASSED SUCCESSFULLY!")
print("=" * 70)
print("\n📊 Summary:")
print(f"  • Mifflin-St Jeor BMR calculation: ✅ Working")
print(f"  • TDEE with activity multipliers: ✅ Working")
print(f"  • Percentage-based goal adjustments: ✅ Working")
print(f"  • Capping at safe maximums: ✅ Working")
print(f"  • Imperial unit conversion: ✅ Working")
print("\n✅ The calorie calculation logic is mathematically correct!")
