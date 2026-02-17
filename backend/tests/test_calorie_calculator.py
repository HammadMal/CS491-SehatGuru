"""
Unit tests for calorie calculator utility

Tests BMR calculation, TDEE calculation, goal adjustments, and unit conversions
using the Mifflin-St Jeor equation (1990).
"""

import pytest
from app.utils.calorie_calculator import (
    calculate_bmr,
    calculate_tdee,
    adjust_for_goals,
    calculate_daily_calories,
    convert_to_metric,
    get_calorie_explanation
)


class TestUnitConversions:
    """Test unit conversion functions"""
    
    def test_lbs_to_kg(self):
        """Test pounds to kilograms conversion"""
        assert round(convert_to_metric(150, "lbs", "weight"), 2) == 68.04
        assert round(convert_to_metric(200, "lbs", "weight"), 2) == 90.72
    
    def test_kg_unchanged(self):
        """Test kg values remain unchanged"""
        assert convert_to_metric(70, "kg", "weight") == 70
    
    def test_ft_to_cm(self):
        """Test feet to centimeters conversion"""
        assert round(convert_to_metric(5.75, "ft", "height"), 2) == 175.26
        assert round(convert_to_metric(6, "ft", "height"), 2) == 182.88
    
    def test_cm_unchanged(self):
        """Test cm values remain unchanged"""
        assert convert_to_metric(175, "cm", "height") == 175


class TestBMRCalculation:
    """Test Basal Metabolic Rate calculations"""
    
    def test_bmr_male(self):
        """Test BMR for 25-year-old male, 70kg, 175cm"""
        # Expected: (10 * 70) + (6.25 * 175) - (5 * 25) + 5 = 1668.75
        bmr = calculate_bmr(70, 175, 25, "male")
        assert round(bmr, 1) == 1668.8
    
    def test_bmr_female(self):
        """Test BMR for 25-year-old female, 60kg, 165cm"""
        # Expected: (10 * 60) + (6.25 * 165) - (5 * 25) - 161 = 1376.25
        bmr = calculate_bmr(60, 165, 25, "female")
        assert round(bmr, 1) == 1376.2
    
    def test_bmr_older_male(self):
        """Test BMR for 60-year-old male, 75kg, 170cm"""
        # Expected: (10 * 75) + (6.25 * 170) - (5 * 60) + 5 = 1417.5
        bmr = calculate_bmr(75, 170, 60, "male")
        assert round(bmr, 1) == 1417.5
    
    def test_bmr_gender_other(self):
        """Test BMR for 'other' gender uses female formula"""
        bmr_female = calculate_bmr(65, 170, 30, "female")
        bmr_other = calculate_bmr(65, 170, 30, "other")
        assert bmr_female == bmr_other


class TestTDEECalculation:
    """Test Total Daily Energy Expenditure calculations"""
    
    def test_tdee_sedentary(self):
        """Test TDEE with sedentary activity level"""
        bmr = 1668.8
        tdee = calculate_tdee(bmr, "sedentary")
        assert round(tdee, 1) == 2002.6  # 1668.8 * 1.2
    
    def test_tdee_moderately_active(self):
        """Test TDEE with moderately active level"""
        bmr = 1668.8
        tdee = calculate_tdee(bmr, "moderately-active")
        assert round(tdee, 1) == 2586.6  # 1668.8 * 1.55
    
    def test_tdee_very_active(self):
        """Test TDEE with very active level"""
        bmr = 1668.8
        tdee = calculate_tdee(bmr, "very-active")
        assert round(tdee, 1) == 2878.7  # 1668.8 * 1.725
    
    def test_tdee_invalid_activity(self):
        """Test TDEE with invalid activity defaults to sedentary"""
        bmr = 1668.8
        tdee = calculate_tdee(bmr, "invalid-activity")
        assert round(tdee, 1) == 2002.6  # 1668.8 * 1.2 (sedentary default)


class TestGoalAdjustments:
    """Test calorie adjustments for health goals"""
    
    def test_lose_weight_small_tdee(self):
        """Test weight loss adjustment for small TDEE (percentage-capped)"""
        tdee = 1500  # Small TDEE
        adjusted, adjustment = adjust_for_goals(tdee, ["lose-weight"])
        # 20% of 1500 = 300 (less than 500 cap)
        assert adjustment == -300
        assert adjusted == 1200
    
    def test_lose_weight_large_tdee(self):
        """Test weight loss adjustment for large TDEE (fixed cap)"""
        tdee = 3000  # Large TDEE
        adjusted, adjustment = adjust_for_goals(tdee, ["lose-weight"])
        # 20% of 3000 = 600, but capped at 500
        assert adjustment == -500
        assert adjusted == 2500
    
    def test_gain_weight_small_tdee(self):
        """Test weight gain adjustment for small TDEE (percentage-capped)"""
        tdee = 1800
        adjusted, adjustment = adjust_for_goals(tdee, ["gain-weight"])
        # 15% of 1800 = 270 (less than 400 cap)
        assert adjustment == 270
        assert adjusted == 2070
    
    def test_build_muscle_large_tdee(self):
        """Test muscle building adjustment for large TDEE (fixed cap)"""
        tdee = 3000
        adjusted, adjustment = adjust_for_goals(tdee, ["build-muscle"])
        # 15% of 3000 = 450, but capped at 400
        assert adjustment == 400
        assert adjusted == 3400
    
    def test_maintain_weight(self):
        """Test maintenance goal has no adjustment"""
        tdee = 2500
        adjusted, adjustment = adjust_for_goals(tdee, ["maintain-weight"])
        assert adjustment == 0
        assert adjusted == 2500
    
    def test_improve_health(self):
        """Test improve health goal has no adjustment"""
        tdee = 2500
        adjusted, adjustment = adjust_for_goals(tdee, ["improve-health"])
        assert adjustment == 0
        assert adjusted == 2500
    
    def test_multiple_goals_priority(self):
        """Test that lose-weight takes priority over gain-weight"""
        tdee = 2500
        adjusted, adjustment = adjust_for_goals(tdee, ["lose-weight", "gain-weight"])
        assert adjustment == -500  # Lose weight takes priority
        assert adjusted == 2000


class TestFullCalculation:
    """Test complete calorie calculation pipeline"""
    
    def test_male_moderately_active_lose_weight(self):
        """Test 25M, 70kg, 175cm, moderately active, lose weight"""
        result = calculate_daily_calories(
            age=25,
            gender="male",
            height=175,
            height_unit="cm",
            weight=70,
            weight_unit="kg",
            activity_level="moderately-active",
            health_goals=["lose-weight"]
        )
        
        # BMR ≈ 1668.8, TDEE ≈ 2586.6, Adjusted ≈ 2086.6
        assert result["bmr"] == 1668.8
        assert result["tdee"] == 2586.6
        assert result["goal_adjustment"] == -500  # Capped at 500
        assert result["daily_calorie_goal"] == 2087
        assert result["calculation_method"] == "mifflin-st-jeor-1990"
        assert "last_calculated_at" in result
    
    def test_female_lightly_active_maintain(self):
        """Test 25F, 60kg, 165cm, lightly active, maintain weight"""
        result = calculate_daily_calories(
            age=25,
            gender="female",
            height=165,
            height_unit="cm",
            weight=60,
            weight_unit="kg",
            activity_level="lightly-active",
            health_goals=["maintain-weight"]
        )
        
        # BMR ≈ 1376.2, TDEE ≈ 1892.3, No adjustment
        assert result["bmr"] == 1376.2
        assert result["tdee"] == 1892.3
        assert result["goal_adjustment"] == 0
        assert result["daily_calorie_goal"] == 1892
    
    def test_imperial_units(self):
        """Test calculation with imperial units (lbs, ft)"""
        result = calculate_daily_calories(
            age=30,
            gender="male",
            height=5.75,  # 5'9" in feet
            height_unit="ft",
            weight=154,  # ~70kg
            weight_unit="lbs",
            activity_level="moderately-active",
            health_goals=["maintain-weight"]
        )
        
        # Should convert to metric and calculate
        assert result["daily_calorie_goal"] > 2000
        assert result["daily_calorie_goal"] < 3000
    
    def test_edge_case_very_young(self):
        """Test that very young age is clamped"""
        result = calculate_daily_calories(
            age=10,  # Too young, should be clamped to 13
            gender="male",
            height=150,
            height_unit="cm",
            weight=40,
            weight_unit="kg",
            activity_level="moderately-active",
            health_goals=["maintain-weight"]
        )
        
        # Should still calculate without error
        assert result["daily_calorie_goal"] > 0
    
    def test_edge_case_very_old(self):
        """Test that very old age is clamped"""
        result = calculate_daily_calories(
            age=150,  # Too old, should be clamped to 120
            gender="female",
            height=160,
            height_unit="cm",
            weight=60,
            weight_unit="kg",
            activity_level="sedentary",
            health_goals=["maintain-weight"]
        )
        
        # Should still calculate without error
        assert result["daily_calorie_goal"] > 0


class TestCalorieExplanation:
    """Test human-readable explanation generation"""
    
    def test_explanation_lose_weight(self):
        """Test explanation for weight loss goal"""
        result = {
            "bmr": 1668.8,
            "tdee": 2586.6,
            "goal_adjustment": -500,
            "daily_calorie_goal": 2087
        }
        
        explanation = get_calorie_explanation(result)
        assert "1669" in explanation  # BMR
        assert "2587" in explanation  # TDEE
        assert "500" in explanation  # Adjustment
        assert "lose weight" in explanation.lower()
        assert "2087" in explanation  # Final goal
    
    def test_explanation_gain_weight(self):
        """Test explanation for weight gain goal"""
        result = {
            "bmr": 1376.2,
            "tdee": 1892.3,
            "goal_adjustment": 283,
            "daily_calorie_goal": 2175
        }
        
        explanation = get_calorie_explanation(result)
        assert "gain weight" in explanation.lower() or "muscle" in explanation.lower()
        assert "283" in explanation
    
    def test_explanation_maintain(self):
        """Test explanation for maintenance goal"""
        result = {
            "bmr": 1668.8,
            "tdee": 2586.6,
            "goal_adjustment": 0,
            "daily_calorie_goal": 2587
        }
        
        explanation = get_calorie_explanation(result)
        assert "maintain" in explanation.lower()
        assert "no adjustment" in explanation.lower()
