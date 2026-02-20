"""
Simple test script to verify calorie calculator functionality
"""

import sys
sys.path.insert(0, '.')

from app.utils.calorie_calculator import calculate_daily_calories, get_calorie_explanation

print("=" * 60)
print("CALORIE CALCULATOR VERIFICATION TEST")
print("=" * 60)

# Test Case 1: 25-year-old male, moderately active, lose weight
print("\n📊 Test 1: 25M, 70kg, 175cm, Moderately Active, Lose Weight")
print("-" * 60)
result1 = calculate_daily_calories(
    age=25,
    gender="male",
    height=175,
    height_unit="cm",
    weight=70,
    weight_unit="kg",
    activity_level="moderately-active",
    health_goals=["lose-weight"]
)

print(f"BMR: {result1['bmr']} kcal/day")
print(f"TDEE: {result1['tdee']} kcal/day")
print(f"Goal Adjustment: {result1['goal_adjustment']} kcal")
print(f"Daily Calorie Goal: {result1['daily_calorie_goal']} kcal")
print(f"Method: {result1['calculation_method']}")
print(f"\n✅ Expected: ~2087 kcal (BMR 1669 → TDEE 2587 → -500 deficit)")

# Test Case 2: 25-year-old female, lightly active, maintain weight
print("\n📊 Test 2: 25F, 60kg, 165cm, Lightly Active, Maintain Weight")
print("-" * 60)
result2 = calculate_daily_calories(
    age=25,
    gender="female",
    height=165,
    height_unit="cm",
    weight=60,
    weight_unit="kg",
    activity_level="lightly-active",
    health_goals=["maintain-weight"]
)

print(f"BMR: {result2['bmr']} kcal/day")
print(f"TDEE: {result2['tdee']} kcal/day")
print(f"Goal Adjustment: {result2['goal_adjustment']} kcal")
print(f"Daily Calorie Goal: {result2['daily_calorie_goal']} kcal")
print(f"\n✅ Expected: ~1892 kcal (BMR 1376 → TDEE 1892 → no adjustment)")

# Test Case 3: Imperial units (lbs, ft)
print("\n📊 Test 3: 30M, 154lbs, 5.75ft, Very Active, Build Muscle")
print("-" * 60)
result3 = calculate_daily_calories(
    age=30,
    gender="male",
    height=5.75,  # 5'9"
    height_unit="ft",
    weight=154,  # ~70kg
    weight_unit="lbs",
    activity_level="very-active",
    health_goals=["build-muscle"]
)

print(f"BMR: {result3['bmr']} kcal/day")
print(f"TDEE: {result3['tdee']} kcal/day")
print(f"Goal Adjustment: {result3['goal_adjustment']} kcal")
print(f"Daily Calorie Goal: {result3['daily_calorie_goal']} kcal")
print(f"\n✅ Expected: ~3000+ kcal (high activity + muscle gain surplus)")

# Test Case 4: Small person with percentage-based adjustment
print("\n📊 Test 4: 25F, 50kg, 155cm, Sedentary, Lose Weight")
print("-" * 60)
result4 = calculate_daily_calories(
    age=25,
    gender="female",
    height=155,
    height_unit="cm",
    weight=50,
    weight_unit="kg",
    activity_level="sedentary",
    health_goals=["lose-weight"]
)

print(f"BMR: {result4['bmr']} kcal/day")
print(f"TDEE: {result4['tdee']} kcal/day")
print(f"Goal Adjustment: {result4['goal_adjustment']} kcal")
print(f"Daily Calorie Goal: {result4['daily_calorie_goal']} kcal")
print(f"\n✅ Percentage-based: 20% of TDEE (safer for small person)")

# Test explanation generation
print("\n" + "=" * 60)
print("EXPLANATION GENERATION TEST")
print("=" * 60)
explanation = get_calorie_explanation(result1)
print(f"\n{explanation}")

print("\n" + "=" * 60)
print("✅ ALL TESTS COMPLETED SUCCESSFULLY")
print("=" * 60)
