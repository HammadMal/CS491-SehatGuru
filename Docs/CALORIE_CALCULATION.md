# Personalized Daily Calorie Calculation — SehatGuru

## Overview

SehatGuru calculates a **personalized daily calorie goal** for each user based on their body metrics, activity level, and health goals. The system uses the **Mifflin-St Jeor equation (1990)**, which is the most accurate and widely recommended formula for estimating resting energy expenditure in modern clinical nutrition.

> **Academic Citation:** Resting energy expenditure is estimated using the Mifflin–St Jeor equation (Mifflin et al., 1990). Total Daily Energy Expenditure (TDEE) is computed using standardized activity multipliers. Caloric targets are adjusted according to evidence-based energy balance principles.

---

## How It Works — Step by Step

The calculation follows a 3-stage pipeline:

```
User Profile Data → BMR → TDEE → Goal-Adjusted Calorie Target
```

### Stage 1: Basal Metabolic Rate (BMR)

BMR represents the number of calories your body burns at complete rest — just to keep you alive (breathing, heartbeat, organ function, cell repair).

**Mifflin-St Jeor Equation:**

| Gender | Formula |
|--------|---------|
| Male   | BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5 |
| Female | BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161 |

**Key insight:** BMR scales primarily with body weight. A 120kg person has a significantly higher BMR than a 40kg person because there is more body mass requiring energy.

### Stage 2: Total Daily Energy Expenditure (TDEE)

TDEE accounts for physical activity on top of BMR:

```
TDEE = BMR × Activity Multiplier
```

| Activity Level | Multiplier | Description |
|---------------|-----------|-------------|
| Sedentary | 1.2 | Desk job, little/no exercise |
| Lightly Active | 1.375 | Light exercise 1-3 days/week |
| Moderately Active | 1.55 | Moderate exercise 3-5 days/week |
| Very Active | 1.725 | Hard exercise 6-7 days/week |
| Extra Active | 1.9 | Very hard exercise, physical job |

### Stage 3: Goal-Based Adjustment

The final calorie target is adjusted based on the user's health goal using **percentage-based adjustments** with safety caps:

| Goal | Adjustment | Rationale |
|------|-----------|-----------|
| Lose Weight | -min(500, 20% of TDEE) | Creates a calorie deficit for fat loss |
| Gain Weight / Build Muscle | +min(400, 15% of TDEE) | Creates a surplus for muscle growth |
| Maintain Weight | No change | Eat at maintenance |
| Improve Health | No change | Focus on food quality, not quantity |

**Why percentage-based?** A fixed 500-calorie deficit is 35% of TDEE for a small person (dangerous), but only 14% for a large person (mild). Percentage scaling is more physiologically consistent and safer across all body sizes.

---

## Worked Examples

### Example 1: John Doe — Overweight, Wants to Lose Weight

| Field | Value |
|-------|-------|
| Age | 22 |
| Gender | Male |
| Weight | 120 kg |
| Height | 6 ft (182.88 cm) |
| Activity | Moderately Active |
| Goal | Lose Weight |

```
BMR  = (10 × 120) + (6.25 × 182.88) - (5 × 22) + 5
     = 1200 + 1143 - 110 + 5
     = 2,238 kcal/day

TDEE = 2,238 × 1.55
     = 3,469 kcal/day

Adjustment = -min(500, 0.20 × 3469)
           = -min(500, 694)
           = -500 kcal (capped at maximum)

Daily Calorie Goal = 3,469 - 500 = 2,969 kcal/day
```

### Example 2: Arsal Jangda — Underweight, Wants to Gain Muscle

| Field | Value |
|-------|-------|
| Age | 22 |
| Gender | Male |
| Weight | 40 kg |
| Height | 6 ft (182.88 cm) |
| Activity | Lightly Active |
| Goal | Build Muscle |

```
BMR  = (10 × 40) + (6.25 × 182.88) - (5 × 22) + 5
     = 400 + 1143 - 110 + 5
     = 1,438 kcal/day

TDEE = 1,438 × 1.375
     = 1,977 kcal/day

Adjustment = +min(400, 0.15 × 1977)
           = +min(400, 297)
           = +297 kcal (percentage-based, below cap)

Daily Calorie Goal = 1,977 + 297 = 2,274 kcal/day
```

### Why Does John Doe (Lose Weight) Have MORE Calories Than Arsal (Gain Muscle)?

This is **scientifically correct**. The calorie goal is personalized to the individual — not just the goal.

- John's body is a **3,469 kcal/day engine** (120kg of mass to maintain). Even after a 500-cal cut, he still needs 2,969 kcal.
- Arsal's body is a **1,977 kcal/day engine** (40kg of mass). Even with a 297-cal surplus, he only needs 2,274 kcal.

**The goal adjusts relative to each person's baseline, not to an absolute number.** A real dietitian would prescribe the same — a 120kg patient on a weight-loss plan eats more total calories than a 40kg patient on a bulking plan. Body size is the dominant factor.

**Proof it works for the same person:** If John wanted to gain muscle instead, his goal would be ~3,869 kcal (higher than his lose-weight goal of 2,969). If Arsal wanted to lose weight, his goal would be ~1,581 kcal (lower than his gain-muscle goal of 2,274). The goal direction is always correct per individual.

---

## Architecture

### Backend

```
backend/
├── app/
│   ├── utils/
│   │   └── calorie_calculator.py      ← Core calculation logic
│   ├── models/
│   │   └── user.py                     ← User model with calorie fields
│   └── services/
│       └── user_service.py             ← Triggers calculation on save/update
└── tests/
    └── test_calorie_calculator.py      ← Unit tests
```

**`calorie_calculator.py`** — Pure utility module with no side effects:
- `calculate_bmr()` — Mifflin-St Jeor BMR
- `calculate_tdee()` — TDEE with activity multipliers
- `adjust_for_goals()` — Percentage-based goal adjustments
- `calculate_daily_calories()` — Full pipeline returning all metadata
- `convert_to_metric()` — Unit conversion (lbs→kg, ft→cm)
- `get_calorie_explanation()` — Human-readable explanation

**`user.py`** — Added fields to `UserProfileResponse`:
- `daily_calorie_goal` — Final calorie target (integer)
- `bmr` — Basal Metabolic Rate
- `tdee` — Total Daily Energy Expenditure
- `goal_adjustment` — Calorie adjustment applied
- `calculation_method` — Algorithm ID (`"mifflin-st-jeor-1990"`)
- `calorie_last_calculated_at` — Timestamp for audit trail

**`user_service.py`** — Auto-calculates on:
- Profile creation (onboarding completion)
- Profile update (if weight, height, age, activity, or goals change)

### Frontend

```
app/
├── types/
│   └── auth.types.ts         ← Added daily_calorie_goal to User type
├── services/
│   └── auth.api.ts           ← Added daily_calorie_goal to UserResponse
├── context/
│   └── AuthContext.tsx        ← Fetches calorie goal from /api/user/profile
└── app/(tabs)/
    └── index.tsx              ← Dashboard uses dynamic calorie goal
```

**Data Flow:**
1. User completes onboarding → `POST /api/user/profile`
2. Backend calculates BMR → TDEE → Goal-adjusted calories
3. Result stored in Firestore under user profile document
4. Frontend fetches from `GET /api/user/profile` after login
5. Dashboard displays: `user?.daily_calorie_goal || 2000` (fallback)

### Why the Frontend Fetches from `/api/user/profile`

The `/api/auth/me` endpoint only returns Firebase Auth data (uid, email, name). The calorie goal lives in Firestore, accessed via `/api/user/profile`. The `AuthContext.tsx` fetches the profile separately after login to get the calorie goal.

---

## Data Stored Per User (Firestore)

```json
{
  "daily_calorie_goal": 2969,
  "bmr": 2238.0,
  "tdee": 3468.9,
  "goal_adjustment": -500,
  "calculation_method": "mifflin-st-jeor-1990",
  "calorie_last_calculated_at": "2025-02-15T04:30:00Z"
}
```

This metadata enables:
- **Explainability** — Show users how their goal was calculated
- **Audit trail** — Track when calculations were last updated
- **Future flexibility** — Switch algorithms without losing history

---

## Testing

### Unit Tests (`tests/test_calorie_calculator.py`)

| Test Class | Coverage |
|-----------|----------|
| `TestUnitConversions` | lbs→kg, ft→cm conversions |
| `TestBMRCalculation` | Male, female, different ages, "other" gender |
| `TestTDEECalculation` | All activity levels, invalid activity fallback |
| `TestGoalAdjustments` | Percentage capping, fixed capping, multiple goals |
| `TestFullCalculation` | End-to-end with imperial units, edge cases |
| `TestCalorieExplanation` | Human-readable output generation |

### Running Tests

```bash
cd backend
pip install pytest
python -m pytest tests/test_calorie_calculator.py -v
```

---

## References

- Mifflin, M. D., St Jeor, S. T., Hill, L. A., Scott, B. J., Daugherty, S. A., & Koh, Y. O. (1990). A new predictive equation for resting energy expenditure in healthy individuals. *The American Journal of Clinical Nutrition*, 51(2), 241–247.
