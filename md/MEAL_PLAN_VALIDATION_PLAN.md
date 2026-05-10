# Meal Plan Generation & Validation Pipeline - Implementation Plan

## Overview

This document outlines the complete implementation plan for the **Meal Plan Generation & Validation Pipeline** based on the SehatGuru system architecture flowchart. Unlike nutritional advice (which uses LLM-based validation), meal plans use **Python-based rule validation** for deterministic, fast quality checks.

---

## Current State vs Target State

### Current Implementation (Phase 3)

```
classify_intent → retrieve_meal_plan_context → generate_response → END
```

**Issues:**
- ✅ Intent classification works
- ✅ RAG retrieval works (dishes_top_k=8, guidelines_top_k=2)
- ❌ No context injection of today's logs
- ❌ No remaining calorie calculation
- ❌ No meal plan validation
- ❌ No regeneration loop

### Target Implementation (Phase 5)

```
classify_intent
    ↓
3B. Context Injector
    - Inject today's consumed calories
    - Calculate remaining calories
    - Add user profile (health goals, restrictions)
    ↓
3B. Docs Retriever
    - Search 100+ Pakistani dishes
    - Filter by dietary restrictions
    - Rank by health goals
    ↓
5B. Plan Generator (LLM)
    - Create meal plan (Breakfast/Lunch/Dinner/Snacks)
    - Include nutrition tables
    - Use Pakistani dishes from RAG
    ↓
6B. Python Validator ← NEW
    - Calorie validation (±10%)
    - Macro balance validation
    - Portion distribution validation
    ↓
Is Validation Passed?
    ├─ Yes → Store in User Profile Database → END
    └─ No → Loop back to 5B (regenerate, max 3 retries)
```

---

## Missing Components

### 1. Today's Logs & Remaining Calories

**Problem:**
- Frontend logs meals to Firestore `meals` collection
- Backend has no API to fetch today's logs
- Context injector doesn't know how many calories user already consumed

**Solution Needed:**
- Backend endpoint: `GET /api/meals/today`
- Firestore service method: `get_meals_for_today(user_id)`
- Calculate: `remaining_calories = daily_target - consumed_today`

---

### 2. Context Injector Enhancement

**Problem:**
- Currently only passes static user_context (health goals, restrictions)
- Doesn't include today's consumption data
- LLM generates meal plans without knowing what user already ate

**Solution Needed:**
- Fetch today's logs before RAG retrieval
- Inject into context:
  ```
  Today's Calorie Summary:
  - Consumed: 1200 kcal (Breakfast: 400, Lunch: 600, Snacks: 200)
  - Target: 2000 kcal
  - Remaining: 800 kcal
  ```
- Modify query for RAG: "Suggest dinner (user has 800 kcal remaining)"

---

### 3. Python Validator (Step 6B)

**Problem:**
- No validation of generated meal plans
- LLM might hallucinate calories, create unbalanced macros, or ignore user constraints

**Solution Needed:**
- Parse LLM-generated meal plan text
- Extract structured data (meals, dishes, calories, macros)
- Rule-based validation checks
- Return pass/fail with specific error messages

---

### 4. Validation Loop

**Problem:**
- No regeneration mechanism if meal plan is invalid
- Bad meal plans get delivered to users

**Solution Needed:**
- Conditional routing after validation
- Loop back to `generate_response` with feedback
- Max retry limit (3 attempts)
- Fail gracefully after max retries

---

## Implementation Plan

### Phase 1: Data Collection Infrastructure

#### 1.1 Backend API - Today's Logs Endpoint

**File:** `backend/app/routes/meals.py` (NEW)

```python
from fastapi import APIRouter, Depends
from app.middleware.auth import get_current_active_user
from app.services.firestore_service import firestore_service
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api/meals", tags=["Meals"])

@router.get("/today")
async def get_todays_meals(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get user's meals logged today with calorie summary.

    Returns:
        - meals: List of today's meals with nutrition info
        - total_calories: Sum of calories consumed today
        - total_protein: Sum of protein (g)
        - total_carbs: Sum of carbs (g)
        - total_fat: Sum of fat (g)
        - target_calories: User's daily calorie target
        - remaining_calories: target - consumed (minimum 0)
        - breakdown_by_meal: Calories grouped by meal type
        - last_meal_time: When user last logged a meal
    """
    user_id = current_user["uid"]

    # Get today's meals from Firestore
    meals_today = firestore_service.get_meals_for_today(user_id)

    # Calculate totals
    total_calories = sum(meal.get("calories", 0) for meal in meals_today)
    total_protein = sum(meal.get("protein", 0) for meal in meals_today)
    total_carbs = sum(meal.get("carbs", 0) for meal in meals_today)
    total_fat = sum(meal.get("fat", 0) for meal in meals_today)

    # Get user's daily target
    user_profile = firestore_service.get_user(user_id)
    target_calories = user_profile.get("daily_calorie_target", 2000)

    # Calculate remaining (never negative)
    remaining_calories = max(0, target_calories - total_calories)

    # Breakdown by meal type
    breakdown = {
        "breakfast": sum(m.get("calories", 0) for m in meals_today if m.get("mealType") == "Breakfast"),
        "lunch": sum(m.get("calories", 0) for m in meals_today if m.get("mealType") == "Lunch"),
        "dinner": sum(m.get("calories", 0) for m in meals_today if m.get("mealType") == "Dinner"),
        "snacks": sum(m.get("calories", 0) for m in meals_today if m.get("mealType") == "Snack"),
    }

    # Find last meal time
    last_meal_time = None
    if meals_today:
        sorted_meals = sorted(meals_today, key=lambda x: x.get("createdAt", ""), reverse=True)
        last_meal_time = sorted_meals[0].get("createdAt")

    return {
        "meals": meals_today,
        "total_calories": total_calories,
        "total_protein": total_protein,
        "total_carbs": total_carbs,
        "total_fat": total_fat,
        "target_calories": target_calories,
        "remaining_calories": remaining_calories,
        "breakdown_by_meal": breakdown,
        "last_meal_time": last_meal_time,
        "meals_logged_count": len(meals_today),
    }
```

**Register in `main.py`:**
```python
from app.routes import meals
app.include_router(meals.router)
```

---

#### 1.2 Firestore Service Method

**File:** `backend/app/services/firestore_service.py`

```python
def get_meals_for_today(self, user_id: str) -> List[Dict]:
    """
    Get all meals logged by user today (UTC timezone).

    Args:
        user_id: Firebase user ID

    Returns:
        List of meal documents with all fields
    """
    from datetime import datetime, timezone

    # Get start of today in UTC (00:00:00)
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    # Query Firestore 'meals' collection
    meals_ref = self.db.collection("meals")
    query = (
        meals_ref
        .where("userId", "==", user_id)
        .where("createdAt", ">=", today_start.isoformat())
        .order_by("createdAt", direction="DESCENDING")
    )

    docs = query.stream()
    meals = []
    for doc in docs:
        meal_data = doc.to_dict()
        meal_data["id"] = doc.id
        meals.append(meal_data)

    return meals
```

---

#### 1.3 Update User Context Model

**File:** `backend/app/models/chat.py`

```python
class UserContext(BaseModel):
    """User context for personalized responses"""

    # NEW: User ID for fetching logs
    user_id: Optional[str] = Field(
        None,
        description="Firebase user ID (required for meal plans with today's context)"
    )

    health_goals: Optional[List[str]] = Field(
        None,
        description="User's health goals (e.g., 'weight_loss', 'muscle_gain', 'diabetes_management')"
    )
    dietary_restrictions: Optional[List[str]] = Field(
        None,
        description="Dietary restrictions (e.g., 'vegetarian', 'diabetic', 'low_sodium')"
    )
    daily_calorie_target: Optional[int] = Field(
        None,
        description="User's daily calorie target (manually set, not calculated from TDEE)"
    )
    age: Optional[int] = Field(None, description="User's age")
    gender: Optional[str] = Field(None, description="User's gender")
```

---

### Phase 2: Context Injector Enhancement

#### 2.1 Modify retrieve_meal_plan_context()

**File:** `backend/app/services/intent_router.py`

```python
async def retrieve_meal_plan_context(state: RouterState) -> dict:
    """
    Retrieve RAG context optimized for meal plan generation.

    NEW: Injects today's consumed calories and remaining calories into context.
    """
    try:
        user_ctx = state.get("user_context", {})

        # STEP 1: Fetch today's calorie summary (if user_id provided)
        todays_summary = None
        if user_ctx.get("user_id"):
            try:
                from app.services.firestore_service import firestore_service
                meals_today = firestore_service.get_meals_for_today(user_ctx["user_id"])

                total_calories = sum(m.get("calories", 0) for m in meals_today)
                total_protein = sum(m.get("protein", 0) for m in meals_today)
                total_carbs = sum(m.get("carbs", 0) for m in meals_today)
                total_fat = sum(m.get("fat", 0) for m in meals_today)

                target_calories = user_ctx.get("daily_calorie_target", 2000)
                remaining_calories = max(0, target_calories - total_calories)

                breakdown = {
                    "breakfast": sum(m.get("calories", 0) for m in meals_today if m.get("mealType") == "Breakfast"),
                    "lunch": sum(m.get("calories", 0) for m in meals_today if m.get("mealType") == "Lunch"),
                    "dinner": sum(m.get("calories", 0) for m in meals_today if m.get("mealType") == "Dinner"),
                    "snacks": sum(m.get("calories", 0) for m in meals_today if m.get("mealType") == "Snack"),
                }

                todays_summary = {
                    "total_calories": total_calories,
                    "total_protein": total_protein,
                    "total_carbs": total_carbs,
                    "total_fat": total_fat,
                    "target_calories": target_calories,
                    "remaining_calories": remaining_calories,
                    "breakdown": breakdown,
                    "meals_count": len(meals_today),
                }
            except Exception as e:
                print(f"Failed to fetch today's meals: {e}")
                todays_summary = None

        # STEP 2: Build enhanced query for RAG
        query = state["message"]
        if todays_summary and todays_summary["remaining_calories"] > 0:
            query += f" (User has {todays_summary['remaining_calories']} calories remaining today)"

        # STEP 3: Retrieve dishes from RAG
        results = await rag_service.hybrid_search_async(
            query=query,
            user_context=user_ctx,
            guidelines_top_k=2,
            dishes_top_k=8,
        )

        # STEP 4: Build context with today's summary
        context_parts = []

        # Add today's consumption summary
        if todays_summary:
            context_parts.append("## Today's Calorie Summary:\n")
            context_parts.append(f"- **Consumed**: {todays_summary['total_calories']} kcal "
                               f"(Protein: {todays_summary['total_protein']:.1f}g, "
                               f"Carbs: {todays_summary['total_carbs']:.1f}g, "
                               f"Fat: {todays_summary['total_fat']:.1f}g)\n")
            context_parts.append(f"- **Daily Target**: {todays_summary['target_calories']} kcal\n")
            context_parts.append(f"- **Remaining**: {todays_summary['remaining_calories']} kcal\n")
            context_parts.append(f"- **Breakdown by Meal**:\n")
            context_parts.append(f"  - Breakfast: {todays_summary['breakdown']['breakfast']} kcal\n")
            context_parts.append(f"  - Lunch: {todays_summary['breakdown']['lunch']} kcal\n")
            context_parts.append(f"  - Dinner: {todays_summary['breakdown']['dinner']} kcal\n")
            context_parts.append(f"  - Snacks: {todays_summary['breakdown']['snacks']} kcal\n")
            context_parts.append(f"- **Meals Logged**: {todays_summary['meals_count']}\n\n")

        # Add available dishes
        if results.get("dishes"):
            context_parts.append("## Available Pakistani Dishes for Meal Planning:\n")
            for d in results["dishes"]:
                context_parts.append(
                    f"- **{d['name']}**: {d['calories']:.0f} kcal | "
                    f"P: {d['protein_g']:.1f}g | "
                    f"C: {d['carbs_g']:.1f}g | "
                    f"F: {d['fat_g']:.1f}g\n"
                )

        # Add dietary guidelines
        if results.get("guidelines"):
            context_parts.append("\n## Key Dietary Guidelines:\n")
            for g in results["guidelines"]:
                context_parts.append(f"- {g['content']}\n")

        return {"rag_context": "".join(context_parts)}

    except Exception as e:
        print(f"Meal plan context retrieval failed: {e}")
        return {"rag_context": ""}
```

---

### Phase 3: Meal Plan Parser

#### 3.1 Parse LLM Output to Structured Data

**File:** `backend/app/services/meal_plan_parser.py` (NEW)

```python
"""
Meal Plan Parser
Extracts structured data from LLM-generated meal plan text.
"""
import re
from typing import Dict, List, Optional

class MealPlanParser:
    """Parse LLM-generated meal plans into structured format."""

    @staticmethod
    def parse(response_text: str) -> Optional[Dict]:
        """
        Parse meal plan text into structured format.

        Expected format:
        **Breakfast** (400 kcal)
        - Dish Name: calories, protein, carbs, fat

        **Lunch** (600 kcal)
        - Dish Name: calories, protein, carbs, fat

        Returns:
            {
                "breakfast": {"dishes": [...], "total_calories": 400, ...},
                "lunch": {...},
                "dinner": {...},
                "snacks": {...},
                "daily_totals": {"calories": 2000, "protein": 150, ...}
            }
        """
        try:
            meals = {
                "breakfast": {"dishes": [], "total_calories": 0, "total_protein": 0, "total_carbs": 0, "total_fat": 0},
                "lunch": {"dishes": [], "total_calories": 0, "total_protein": 0, "total_carbs": 0, "total_fat": 0},
                "dinner": {"dishes": [], "total_calories": 0, "total_protein": 0, "total_carbs": 0, "total_fat": 0},
                "snacks": {"dishes": [], "total_calories": 0, "total_protein": 0, "total_carbs": 0, "total_fat": 0},
            }

            # Regex patterns for extraction
            meal_header_pattern = r'\*\*(?:Breakfast|Lunch|Dinner|Snack[s]?)\*\*.*?(\d+)\s*kcal'
            dish_pattern = r'-\s*(.+?):\s*(\d+)\s*kcal.*?(\d+\.?\d*)\s*g?\s*protein.*?(\d+\.?\d*)\s*g?\s*carbs?.*?(\d+\.?\d*)\s*g?\s*fat'

            # Split by meal sections
            sections = re.split(r'\*\*(?:Breakfast|Lunch|Dinner|Snack[s]?)\*\*', response_text)

            current_meal = None
            for section in sections:
                section_lower = section.lower()

                # Identify meal type
                if 'breakfast' in section_lower:
                    current_meal = 'breakfast'
                elif 'lunch' in section_lower:
                    current_meal = 'lunch'
                elif 'dinner' in section_lower:
                    current_meal = 'dinner'
                elif 'snack' in section_lower:
                    current_meal = 'snacks'
                else:
                    continue

                # Extract dishes
                dish_matches = re.finditer(dish_pattern, section, re.IGNORECASE)
                for match in dish_matches:
                    dish_name = match.group(1).strip()
                    calories = float(match.group(2))
                    protein = float(match.group(3))
                    carbs = float(match.group(4))
                    fat = float(match.group(5))

                    meals[current_meal]["dishes"].append({
                        "name": dish_name,
                        "calories": calories,
                        "protein": protein,
                        "carbs": carbs,
                        "fat": fat,
                    })

                    meals[current_meal]["total_calories"] += calories
                    meals[current_meal]["total_protein"] += protein
                    meals[current_meal]["total_carbs"] += carbs
                    meals[current_meal]["total_fat"] += fat

            # Calculate daily totals
            daily_totals = {
                "calories": sum(m["total_calories"] for m in meals.values()),
                "protein": sum(m["total_protein"] for m in meals.values()),
                "carbs": sum(m["total_carbs"] for m in meals.values()),
                "fat": sum(m["total_fat"] for m in meals.values()),
            }

            return {
                "meals": meals,
                "daily_totals": daily_totals,
            }

        except Exception as e:
            print(f"Meal plan parsing failed: {e}")
            return None
```

---

### Phase 4: Python Validator (Step 6B)

#### 4.1 Validation Rules Implementation

**File:** `backend/app/services/meal_plan_validator.py` (NEW)

```python
"""
Meal Plan Python Validator (Step 6B from Flowchart)
Rule-based validation for generated meal plans.
"""
from typing import Dict, Optional

class MealPlanValidator:
    """Python-based validator for meal plans (Calorie ±10%, Macro balance, Portion relation)."""

    @staticmethod
    def validate(
        meal_plan_data: Dict,
        target_calories: int,
        user_context: Optional[Dict] = None
    ) -> Dict:
        """
        Validate meal plan using rule-based checks.

        Args:
            meal_plan_data: Parsed meal plan structure
            target_calories: User's daily calorie target
            user_context: User health goals and restrictions

        Returns:
            {
                "passed": bool,
                "calorie_check": {...},
                "macro_check": {...},
                "portion_check": {...},
                "errors": [...]
            }
        """
        errors = []

        # Extract totals
        daily_totals = meal_plan_data.get("daily_totals", {})
        total_calories = daily_totals.get("calories", 0)
        total_protein = daily_totals.get("protein", 0)
        total_carbs = daily_totals.get("carbs", 0)
        total_fat = daily_totals.get("fat", 0)

        # Validation Check 1: Calorie Target (±10%)
        calorie_check = MealPlanValidator._validate_calories(
            total_calories, target_calories
        )
        if not calorie_check["passed"]:
            errors.append(calorie_check["error"])

        # Validation Check 2: Macro Balance
        macro_check = MealPlanValidator._validate_macros(
            total_calories, total_protein, total_carbs, total_fat
        )
        if not macro_check["passed"]:
            errors.extend(macro_check["errors"])

        # Validation Check 3: Portion Distribution
        meals = meal_plan_data.get("meals", {})
        portion_check = MealPlanValidator._validate_portions(
            meals, total_calories
        )
        if not portion_check["passed"]:
            errors.extend(portion_check["errors"])

        # Overall result
        all_passed = calorie_check["passed"] and macro_check["passed"] and portion_check["passed"]

        return {
            "passed": all_passed,
            "calorie_check": calorie_check,
            "macro_check": macro_check,
            "portion_check": portion_check,
            "errors": errors,
        }

    @staticmethod
    def _validate_calories(total_calories: float, target_calories: int) -> Dict:
        """
        Check if total calories are within ±10% of target.

        Example: Target 2000 kcal → Accept 1800-2200 kcal
        """
        tolerance = 0.10
        lower_bound = target_calories * (1 - tolerance)
        upper_bound = target_calories * (1 + tolerance)

        passed = lower_bound <= total_calories <= upper_bound

        return {
            "passed": passed,
            "total_calories": total_calories,
            "target_calories": target_calories,
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
            "error": None if passed else
                    f"Total calories {total_calories:.0f} outside acceptable range "
                    f"({lower_bound:.0f}-{upper_bound:.0f} kcal for target {target_calories})"
        }

    @staticmethod
    def _validate_macros(
        total_calories: float,
        total_protein: float,
        total_carbs: float,
        total_fat: float
    ) -> Dict:
        """
        Check if macros are balanced (healthy ranges as % of total calories).

        Healthy ranges:
        - Protein: 15-35% of calories (4 cal/g)
        - Carbs: 45-65% of calories (4 cal/g)
        - Fat: 20-35% of calories (9 cal/g)
        """
        errors = []

        if total_calories == 0:
            return {
                "passed": False,
                "errors": ["Total calories is 0, cannot calculate macro percentages"]
            }

        # Calculate percentages
        protein_calories = total_protein * 4
        carbs_calories = total_carbs * 4
        fat_calories = total_fat * 9

        protein_pct = (protein_calories / total_calories) * 100
        carbs_pct = (carbs_calories / total_calories) * 100
        fat_pct = (fat_calories / total_calories) * 100

        # Check ranges
        if not (15 <= protein_pct <= 35):
            errors.append(
                f"Protein {protein_pct:.1f}% outside healthy range (15-35%)"
            )

        if not (45 <= carbs_pct <= 65):
            errors.append(
                f"Carbs {carbs_pct:.1f}% outside healthy range (45-65%)"
            )

        if not (20 <= fat_pct <= 35):
            errors.append(
                f"Fat {fat_pct:.1f}% outside healthy range (20-35%)"
            )

        return {
            "passed": len(errors) == 0,
            "protein_pct": protein_pct,
            "carbs_pct": carbs_pct,
            "fat_pct": fat_pct,
            "errors": errors,
        }

    @staticmethod
    def _validate_portions(meals: Dict, total_calories: float) -> Dict:
        """
        Check if meal distribution is reasonable.

        Expected ranges (as % of daily calories):
        - Breakfast: 20-35%
        - Lunch: 30-45%
        - Dinner: 25-40%
        - Snacks: 0-20%
        """
        errors = []

        if total_calories == 0:
            return {
                "passed": False,
                "errors": ["Total calories is 0, cannot validate portions"]
            }

        breakfast_cal = meals.get("breakfast", {}).get("total_calories", 0)
        lunch_cal = meals.get("lunch", {}).get("total_calories", 0)
        dinner_cal = meals.get("dinner", {}).get("total_calories", 0)
        snacks_cal = meals.get("snacks", {}).get("total_calories", 0)

        breakfast_pct = (breakfast_cal / total_calories) * 100
        lunch_pct = (lunch_cal / total_calories) * 100
        dinner_pct = (dinner_cal / total_calories) * 100
        snacks_pct = (snacks_cal / total_calories) * 100

        # Check ranges (allow flexibility if meal is 0)
        if breakfast_cal > 0 and not (20 <= breakfast_pct <= 35):
            errors.append(
                f"Breakfast {breakfast_pct:.1f}% outside healthy range (20-35%)"
            )

        if lunch_cal > 0 and not (30 <= lunch_pct <= 45):
            errors.append(
                f"Lunch {lunch_pct:.1f}% outside healthy range (30-45%)"
            )

        if dinner_cal > 0 and not (25 <= dinner_pct <= 40):
            errors.append(
                f"Dinner {dinner_pct:.1f}% outside healthy range (25-40%)"
            )

        if snacks_cal > 0 and not (0 <= snacks_pct <= 20):
            errors.append(
                f"Snacks {snacks_pct:.1f}% outside healthy range (0-20%)"
            )

        return {
            "passed": len(errors) == 0,
            "breakfast_pct": breakfast_pct,
            "lunch_pct": lunch_pct,
            "dinner_pct": dinner_pct,
            "snacks_pct": snacks_pct,
            "errors": errors,
        }
```

---

### Phase 5: LangGraph Integration

#### 5.1 Extend RouterState

**File:** `backend/app/services/intent_router.py`

```python
class RouterState(TypedDict):
    message: str
    user_context: Optional[Dict[str, Any]]
    chat_history: Optional[List[Dict[str, str]]]
    use_rag: bool
    intent: str
    rag_context: str
    response: str

    # Nutritional advice validation fields
    validation_enabled: bool
    retry_count: int
    validation_scores: Optional[Dict[str, float]]
    validation_passed: bool
    validation_reasoning: Optional[str]

    # NEW: Meal plan validation fields
    meal_plan_data: Optional[Dict]           # Parsed meal plan structure
    meal_plan_validation: Optional[Dict]     # Validation results
    meal_plan_passed: bool                   # Overall pass/fail
```

---

#### 5.2 Add Meal Plan Validation Nodes

**File:** `backend/app/services/intent_router.py`

```python
def parse_and_validate_meal_plan(state: RouterState) -> dict:
    """
    Parse meal plan response and run Python validation (Step 6B).
    Only runs for meal_plan_generation intent.
    """
    # Skip if not meal plan intent
    if state.get("intent") != "meal_plan_generation":
        return {
            "meal_plan_passed": True,
            "meal_plan_data": None,
            "meal_plan_validation": None,
        }

    try:
        from app.services.meal_plan_parser import MealPlanParser
        from app.services.meal_plan_validator import MealPlanValidator

        # Step 1: Parse LLM response text
        meal_plan_data = MealPlanParser.parse(state["response"])

        if not meal_plan_data:
            print("Failed to parse meal plan, auto-passing")
            return {
                "meal_plan_passed": True,  # Auto-pass on parse failure
                "meal_plan_data": None,
                "meal_plan_validation": {"error": "Failed to parse meal plan"},
            }

        # Step 2: Get target calories
        user_ctx = state.get("user_context", {})
        target_calories = user_ctx.get("daily_calorie_target", 2000)

        # Step 3: Run Python validation
        validation_result = MealPlanValidator.validate(
            meal_plan_data=meal_plan_data,
            target_calories=target_calories,
            user_context=user_ctx,
        )

        # Log validation result
        if not validation_result["passed"]:
            print(f"Meal plan validation failed: {validation_result['errors']}")

        return {
            "meal_plan_data": meal_plan_data,
            "meal_plan_validation": validation_result,
            "meal_plan_passed": validation_result["passed"],
        }

    except Exception as e:
        print(f"Meal plan validation error, auto-passing: {e}")
        return {
            "meal_plan_passed": True,  # Auto-pass on error
            "meal_plan_data": None,
            "meal_plan_validation": {"error": str(e)},
        }


def check_meal_plan_approval(state: RouterState) -> str:
    """
    Decide whether to approve meal plan or regenerate.
    Only applies to meal_plan_generation intent.
    """
    # If nutritional advice, route to nutritional validation
    if state.get("intent") == "nutritional_advice":
        return check_approval(state)  # Use existing nutritional validation

    # Meal plan approval logic
    if state.get("meal_plan_passed", False):
        return "approved"

    # Check retry limit
    retry_count = state.get("retry_count", 0)
    max_retries = 3  # Allow 3 retries for meal plans (4 total attempts)

    if retry_count >= max_retries:
        print(f"Max retries ({max_retries}) reached for meal plan, returning anyway")
        return "max_retries_reached"

    return "retry"


def increment_meal_plan_retry(state: RouterState) -> dict:
    """Increment retry counter and log meal plan validation failure."""
    current_count = state.get("retry_count", 0)
    validation = state.get("meal_plan_validation", {})
    errors = validation.get("errors", [])

    print(f"Meal plan validation failed (attempt {current_count + 1}): {errors}")
    print(f"Regenerating meal plan (attempt {current_count + 2}/4)")

    return {"retry_count": current_count + 1}
```

---

#### 5.3 Update Graph Builder

**File:** `backend/app/services/intent_router.py`

```python
def build_intent_router() -> StateGraph:
    """Build and compile the LangGraph intent router with validation."""
    graph = StateGraph(RouterState)

    # Classification
    graph.add_node("classify_intent", classify_intent)

    # Retrieval nodes
    graph.add_node("retrieve_nutrition_context", retrieve_nutrition_context)
    graph.add_node("retrieve_meal_plan_context", retrieve_meal_plan_context)

    # Generation
    graph.add_node("generate_response", generate_response)

    # Validation nodes (nutritional advice)
    graph.add_node("validate_response", validate_response)
    graph.add_node("increment_retry", increment_retry)

    # NEW: Validation nodes (meal plans)
    graph.add_node("parse_and_validate_meal_plan", parse_and_validate_meal_plan)
    graph.add_node("increment_meal_plan_retry", increment_meal_plan_retry)

    # Entry point
    graph.set_entry_point("classify_intent")

    # Routing by intent
    graph.add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {
            "retrieve_nutrition_context": "retrieve_nutrition_context",
            "retrieve_meal_plan_context": "retrieve_meal_plan_context",
        }
    )

    # Both retrieval paths lead to generation
    graph.add_edge("retrieve_nutrition_context", "generate_response")
    graph.add_edge("retrieve_meal_plan_context", "generate_response")

    # After generation, route to appropriate validation
    graph.add_conditional_edges(
        "generate_response",
        lambda state: "nutritional_validation" if state["intent"] == "nutritional_advice" else "meal_plan_validation",
        {
            "nutritional_validation": "validate_response",
            "meal_plan_validation": "parse_and_validate_meal_plan",
        }
    )

    # Nutritional advice validation flow (existing)
    graph.add_conditional_edges(
        "validate_response",
        check_approval,
        {
            "approved": END,
            "retry": "increment_retry",
            "max_retries_reached": END,
        }
    )
    graph.add_edge("increment_retry", "generate_response")

    # NEW: Meal plan validation flow
    graph.add_conditional_edges(
        "parse_and_validate_meal_plan",
        check_meal_plan_approval,
        {
            "approved": END,
            "retry": "increment_meal_plan_retry",
            "max_retries_reached": END,
        }
    )
    graph.add_edge("increment_meal_plan_retry", "generate_response")

    return graph.compile()
```

---

#### 5.4 Update route_and_respond()

**File:** `backend/app/services/intent_router.py`

```python
async def route_and_respond(
    message: str,
    user_context: Optional[Dict[str, Any]] = None,
    chat_history: Optional[List[Dict[str, str]]] = None,
    use_rag: bool = True,
    use_validation: bool = True,
) -> Dict[str, Any]:
    """
    Route message through intent router with validation.

    Returns validation metadata for both nutritional advice and meal plans.
    """
    initial_state: RouterState = {
        "message": message,
        "user_context": user_context,
        "chat_history": chat_history,
        "use_rag": use_rag,
        "intent": "",
        "rag_context": "",
        "response": "",

        # Nutritional advice validation
        "validation_enabled": use_validation and settings.ENABLE_RESPONSE_VALIDATION,
        "retry_count": 0,
        "validation_scores": None,
        "validation_passed": False,
        "validation_reasoning": None,

        # Meal plan validation
        "meal_plan_data": None,
        "meal_plan_validation": None,
        "meal_plan_passed": False,
    }

    result = await intent_router.ainvoke(initial_state)

    return {
        "response": result["response"],
        "intent": result["intent"],
        "rag_used": use_rag,

        # Nutritional advice fields
        "validation_scores": result.get("validation_scores"),
        "validation_passed": result.get("validation_passed", True),

        # Meal plan fields
        "meal_plan_data": result.get("meal_plan_data"),
        "meal_plan_validation": result.get("meal_plan_validation"),
        "meal_plan_passed": result.get("meal_plan_passed", True),

        # Common
        "retry_count": result.get("retry_count", 0),
    }
```

---

### Phase 6: Response Models

#### 6.1 Update ChatMessageResponse

**File:** `backend/app/models/chat.py`

```python
class MealPlanValidation(BaseModel):
    """Validation results for meal plans."""
    passed: bool = Field(..., description="Overall validation passed")
    calorie_check: Dict = Field(..., description="Calorie validation (±10%)")
    macro_check: Dict = Field(..., description="Macro balance validation")
    portion_check: Dict = Field(..., description="Portion distribution validation")
    errors: List[str] = Field(default=[], description="List of validation errors")


class ChatMessageResponse(BaseModel):
    """Response model for chat messages"""

    response: str = Field(..., description="Bot's response to the user's message")
    rag_used: bool = Field(True, description="Whether RAG context was used")
    intent: Optional[str] = Field(None, description="Classified intent")

    # Nutritional advice validation fields
    validation_scores: Optional[ValidationScores] = Field(None, description="LLM validation scores (nutritional advice)")
    validation_passed: Optional[bool] = Field(None, description="Whether response passed LLM validation")

    # Meal plan validation fields
    meal_plan_data: Optional[Dict] = Field(None, description="Parsed meal plan structure")
    meal_plan_validation: Optional[MealPlanValidation] = Field(None, description="Python validation results (meal plans)")
    meal_plan_passed: Optional[bool] = Field(None, description="Whether meal plan passed validation")

    # Common fields
    retry_count: Optional[int] = Field(None, description="Number of regeneration attempts")
```

---

### Phase 7: Frontend Integration

#### 7.1 Update Chat API Call

**File:** `app/services/chat.api.ts`

```typescript
// Include user_id in user_context
const userContext = {
  user_id: currentUser.uid,  // NEW: Required for meal plans
  health_goals: user.health_goals,
  dietary_restrictions: user.dietary_restrictions,
  daily_calorie_target: user.daily_calorie_target,
  age: user.age,
  gender: user.gender,
};

const response = await api.post('/chat/message', {
  message: userMessage,
  user_context: userContext,
  use_rag: true,
});

// Response will include meal_plan_validation for meal plan intents
if (response.data.intent === 'meal_plan_generation') {
  console.log('Meal plan validation:', response.data.meal_plan_validation);
  console.log('Meal plan passed:', response.data.meal_plan_passed);
  console.log('Retries:', response.data.retry_count);
}
```

---

## Configuration & Settings

### Validation Thresholds

```python
# backend/app/config/settings.py

# Meal Plan Validation
MEAL_PLAN_VALIDATION_ENABLED: bool = True
MEAL_PLAN_MAX_RETRIES: int = 3  # 4 total attempts
MEAL_PLAN_CALORIE_TOLERANCE: float = 0.10  # ±10%

# Macro ranges (% of total calories)
MEAL_PLAN_PROTEIN_MIN: float = 15.0
MEAL_PLAN_PROTEIN_MAX: float = 35.0
MEAL_PLAN_CARBS_MIN: float = 45.0
MEAL_PLAN_CARBS_MAX: float = 65.0
MEAL_PLAN_FAT_MIN: float = 20.0
MEAL_PLAN_FAT_MAX: float = 35.0

# Portion distribution ranges (% of daily calories)
MEAL_PLAN_BREAKFAST_MIN: float = 20.0
MEAL_PLAN_BREAKFAST_MAX: float = 35.0
MEAL_PLAN_LUNCH_MIN: float = 30.0
MEAL_PLAN_LUNCH_MAX: float = 45.0
MEAL_PLAN_DINNER_MIN: float = 25.0
MEAL_PLAN_DINNER_MAX: float = 40.0
MEAL_PLAN_SNACKS_MAX: float = 20.0
```

---

## Testing Plan

### Test 1: Today's Logs API

```bash
# Endpoint: GET /api/meals/today
curl -X GET http://localhost:8000/api/meals/today \
  -H "Authorization: Bearer <token>"

# Expected response:
{
  "meals": [...],
  "total_calories": 1200,
  "target_calories": 2000,
  "remaining_calories": 800,
  "breakdown_by_meal": {
    "breakfast": 400,
    "lunch": 600,
    "dinner": 0,
    "snacks": 200
  }
}
```

---

### Test 2: Meal Plan Generation with Context

```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a meal plan for the rest of the day",
    "user_context": {
      "user_id": "firebase_uid_here",
      "health_goals": ["weight_loss"],
      "daily_calorie_target": 2000
    },
    "use_rag": true
  }'

# Expected: LLM should suggest meals totaling ~800 kcal (remaining)
```

---

### Test 3: Validation Failure & Retry

Manually create a scenario where validation fails:
- User target: 2000 kcal
- LLM generates plan with 2500 kcal (>10% over)
- Expected: Validation fails, regeneration triggered
- Check retry_count in response

---

### Test 4: Max Retries Reached

- Force validation to fail 3 times
- Expected: meal_plan_passed = false, but response still returned
- Check retry_count = 3

---

## Edge Cases & Handling

### 1. User Has No Meals Logged Today

**Scenario:** User asks for meal plan, but hasn't logged any meals yet.

**Handling:**
- `todays_summary` will be None or show 0 consumed calories
- Context will show: "Remaining: 2000 kcal (full daily target)"
- LLM generates complete meal plan

---

### 2. User Already Exceeded Daily Target

**Scenario:** User consumed 2200 kcal, target is 2000 kcal.

**Handling:**
- `remaining_calories = max(0, target - consumed) = 0`
- Context shows: "Remaining: 0 kcal (daily target exceeded)"
- LLM suggests low-calorie options or advises against eating more

---

### 3. LLM Generates Unparseable Text

**Scenario:** LLM response doesn't match expected format.

**Handling:**
- Parser returns `None`
- Validation auto-passes (avoid blocking response)
- Log warning for monitoring
- Frontend shows response as-is (no validation badge)

---

### 4. Partial Meal Plans

**Scenario:** User asks "Suggest dinner only" instead of full day plan.

**Handling:**
- LLM generates only dinner section
- Validation checks only populated meals
- Breakfast/Lunch at 0% is acceptable if not included

---

### 5. Collection Name Mismatch

**Issue:** Frontend uses `meals`, backend settings say `food_logs`.

**Resolution:**
- **Decision needed:** Standardize on `meals` collection
- Update `FIRESTORE_COLLECTION_FOOD_LOGS` to `FIRESTORE_COLLECTION_MEALS`
- Or create migration to move data from `meals` to `food_logs`

---

## Performance Considerations

### Latency Breakdown

| Step | Estimated Time |
|------|----------------|
| Fetch today's meals (Firestore) | 50-150ms |
| RAG retrieval (ChromaDB + embeddings) | 200-400ms |
| LLM generation (Gemini) | 800-1500ms |
| Parse meal plan | 10-50ms |
| Python validation | 5-20ms |
| **Total (first attempt)** | **1.1-2.1 seconds** |

With retry (validation fails):
- **Total (1 retry)** | **2.2-4.2 seconds**
- **Total (3 retries)** | **4.4-8.4 seconds** (worst case)

### Optimization Strategies

1. **Cache Today's Meals**
   - Cache in memory for 5 minutes
   - Invalidate on new meal log

2. **Async Firestore Query**
   - Already using async/await
   - No blocking operations

3. **Parallel Validation**
   - Calorie, macro, and portion checks are independent
   - Could parallelize (marginal gain, already fast)

4. **Smarter Prompting**
   - Include validation rules in generation prompt
   - Reduce validation failures on first try

---

## Monitoring & Metrics

### Key Metrics to Track

1. **Meal Plan Validation Pass Rate**
   - % of meal plans passing on first attempt
   - Target: >80%

2. **Average Retry Count**
   - How often do we need to regenerate?
   - Target: <0.3 (most pass first time)

3. **Validation Failure Reasons**
   - Which check fails most? (Calorie, Macro, Portion)
   - Use for prompt engineering

4. **Parsing Failure Rate**
   - How often does parser fail to extract data?
   - Target: <5%

5. **Today's Logs Fetch Success Rate**
   - Are users logging meals regularly?
   - % of requests with non-zero consumed calories

---

## Implementation Checklist

### Backend

- [ ] Create `backend/app/routes/meals.py` with `/today` endpoint
- [ ] Add `get_meals_for_today()` to `firestore_service.py`
- [ ] Update `UserContext` model with `user_id` field
- [ ] Create `backend/app/services/meal_plan_parser.py`
- [ ] Create `backend/app/services/meal_plan_validator.py`
- [ ] Modify `retrieve_meal_plan_context()` to inject today's summary
- [ ] Add meal plan validation nodes to `intent_router.py`
- [ ] Update `RouterState` with meal plan fields
- [ ] Update graph builder with meal plan validation flow
- [ ] Update `route_and_respond()` to return meal plan data
- [ ] Add `MealPlanValidation` model to `chat.py`
- [ ] Update `ChatMessageResponse` with meal plan fields
- [ ] Add validation settings to `settings.py`
- [ ] Register meals router in `main.py`

### Testing

- [ ] Unit tests for `MealPlanParser`
- [ ] Unit tests for `MealPlanValidator`
- [ ] Integration test: Full meal plan generation flow
- [ ] Test: Today's logs API with mock Firestore data
- [ ] Test: Validation failure triggers retry
- [ ] Test: Max retries stops regeneration
- [ ] Test: User with no meals logged today
- [ ] Test: User exceeded daily target

### Frontend

- [ ] Update `chat.api.ts` to include `user_id` in user_context
- [ ] Display meal plan validation results in UI
- [ ] Show retry count badge if > 0
- [ ] Handle meal_plan_validation errors gracefully

---

## Future Enhancements (Phase 6+)

### 1. Smarter Context Injection

- **Time-aware meal suggestions**: If it's 6 PM, suggest dinner only
- **Weather-based**: Hot day → lighter meals, cold day → warmer foods
- **Previous meal plan learning**: Don't repeat yesterday's dishes

### 2. Advanced Validation

- **Micronutrient checks**: Ensure adequate vitamins, minerals
- **Hydration tracking**: Include water intake recommendations
- **Allergen detection**: Check dishes against user allergies
- **Grocery availability**: Prefer in-season Pakistani ingredients

### 3. User Feedback Loop

- **Rate meal plans**: "Was this helpful?" thumbs up/down
- **Track completion**: Did user follow the meal plan?
- **Preference learning**: Adjust future plans based on ratings

### 4. Meal Plan Storage

- **Save to Firestore**: Store generated plans in `meal_plans` collection
- **History view**: "Show me last week's meal plans"
- **Re-use plans**: "Use Monday's meal plan again"

### 5. Shopping List Generation

- **Auto-generate**: Extract ingredients from meal plan
- **Categorize**: Group by aisle (produce, dairy, grains)
- **Cost estimation**: Approximate grocery budget

---

## Open Questions & Decisions Needed

1. **Collection Naming**
   - Frontend: `meals` collection
   - Backend: `food_logs` in settings
   - **Decision:** Standardize on which?

2. **Daily Calorie Target Source**
   - Is it stored in user profile (Firestore `users` collection)?
   - Or only passed in request?
   - **Decision:** Where to fetch from?

3. **Meal Plan Use Cases**
   - Full day plan vs. single meal suggestion
   - Today's plan vs. tomorrow's plan
   - **Decision:** How to differentiate in prompt/context?

4. **Parsing Robustness**
   - LLM output format varies
   - **Decision:** Enforce strict JSON output or flexible text parsing?

5. **Validation Strictness**
   - ±10% calories is lenient
   - **Decision:** Stricter thresholds (±5%) or keep as-is?

6. **Max Retries**
   - Currently 3 retries (4 attempts)
   - **Decision:** Is this enough or too many?

---

## Summary

This plan implements the complete **Meal Plan Generation & Validation Pipeline** as shown in the flowchart:

1. **Context Injection** - Fetch today's logs, calculate remaining calories
2. **RAG Retrieval** - Search Pakistani dishes optimized for meal planning
3. **LLM Generation** - Create meal plan with nutrition tables
4. **Python Validation** - Rule-based checks (Calorie ±10%, Macro balance, Portion relation)
5. **Regeneration Loop** - Retry up to 3 times if validation fails

**Key Differences from Nutritional Advice:**
- Uses **Python validation** (not LLM)
- **Deterministic** checks (exact calculations)
- **Faster** validation (no extra Gemini call)
- **Context-aware** (includes today's consumption)

**Implementation Priority:**
1. Phase 1 (Today's Logs API) - Required for context
2. Phase 2 (Context Injector) - Critical for quality
3. Phase 3 (Parser) - Needed for validation
4. Phase 4 (Validator) - Core validation logic
5. Phase 5 (LangGraph) - Tie it all together

Once implemented, meal plans will be validated for calorie accuracy, nutritional balance, and portion sizes before being delivered to users, ensuring high-quality dietary recommendations aligned with Pakistani health standards.

---

**Version:** 1.0 (Draft)
**Status:** Planning Phase
**Next Steps:** Review plan, make decisions on open questions, begin Phase 1 implementation
