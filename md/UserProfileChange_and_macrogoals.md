# SehatGuru — Session Development Notes

## Overview

This document covers all features built and UI improvements made in this development session.

---

## 1. Macronutrient Goals

### What was built
Personalized daily macro goals (carbs, protein, fat in grams) are now calculated per user and displayed on the dashboard alongside consumed amounts.

### Backend changes

#### `backend/app/utils/calorie_calculator.py`
- Added `calculate_macro_goals(daily_calorie_goal, health_goals)` function
- Splits calories using health-goal-aware macro ratios:
  - **Lose / maintain weight:** 45% carbs · 30% protein · 25% fat
  - **Gain / build muscle:** 50% carbs · 25% protein · 25% fat
- Grams = `(calories × pct) / kcal_per_gram` (carbs & protein = 4 kcal/g, fat = 9 kcal/g)
- `calculate_daily_calories()` now includes macro goals in its return value

#### `backend/app/models/user.py`
- `UserProfileResponse` extended with 3 optional fields: `daily_carbs_goal`, `daily_protein_goal`, `daily_fat_goal`

#### `backend/app/services/user_service.py`
- `save_user_profile`, `get_user_profile`, `update_user_profile` all read/write macro goal fields to Firestore

### Frontend changes

#### `app/types/auth.types.ts`
- `User` interface extended: `daily_carbs_goal?`, `daily_protein_goal?`, `daily_fat_goal?`

#### `app/context/AuthContext.tsx`
- All 4 profile-fetch locations (`login`, `googleLogin`, `checkAuthState`, `refreshOnboardingStatus`) now read and assign macro goal fields from the API response
- New `refreshUserGoals()` function added — re-fetches `/api/user/profile` and updates user state + AsyncStorage, callable from any screen

#### `app/app/(tabs)/index.tsx` (Dashboard)
- Macro goals pulled from `user` object with fallbacks: 250g carbs / 120g protein / 65g fat
- Each macro box shows **consumed / goal** (e.g. `45g of 250g`)
- Thin color progress bar per macro (amber / blue / purple) fills proportionally

---

## 2. Dashboard UI Redesign

**File:** `app/app/(tabs)/index.tsx`

### Changes
- **Header:** Personalised greeting (`Hi, Arsal 👋`) + compact date chip with chevron
- **Calorie Summary Card:**
  - Ring display showing kcal remaining
  - Side-by-side stat rows: Eaten / Burned / Goal with colored icon badges
  - Full-width green progress bar + percentage label + "Analytics" chip
- **Macro Grid (3-column):**
  - Each card: icon badge, label, consumed grams (bold), `of Xg` goal, color progress bar, % label
- **Meal Sections:**
  - Breakfast (amber) · Lunch (green) · Dinner (indigo) · Snack (pink) — each with matching icon badge and color
  - Calorie total shown inline per meal type
  - `+` button inherits the meal type color
  - Meal items in clean rows: dot · food name · kcal · trash icon

---

## 3. Add Meal UI Redesign

### `app/app/(tabs)/camera.tsx`
- Heading + subtitle
- Meal-type context pill — colored per meal type (e.g. 🌙 Dinner in indigo), shows which meal you're adding to
- **Camera CTA** — large card with green border + glow, camera icon in green tile, arrow button
- **OR divider**
- **Manual Search card** — indigo icon badge
- **Camera tips card** — amber-tinted with bullet tips
- Error banner with icon

### `app/app/manual.tsx` (Manual Food Search)
- Back button + header with meal-type pill (colored)
- Styled search bar — bordered card with search icon + clear (×) button
- **Empty states:** loading spinner, "Search for a food" prompt, "No results" — all with icons
- **Food result cards:**
  - Food name + colored macro badges (C · P · F in grams)
  - Large calorie number on the right

---

## 4. Edit Profile Feature

Allows users to update their health profile after onboarding. All calorie and macro goals are automatically recalculated on save.

### New screen: `app/app/edit-profile.tsx`
- Loads current values from `GET /api/user/profile` on mount
- Editable fields:
  - Full name, height (cm/ft), weight (kg/lbs), age, gender
  - Activity level — 5 options as selectable cards with icons
  - Health goals — 6 options as multi-select cards in a 2-column grid
- Validation on all required fields before saving
- Calls `PATCH /api/user/profile` → backend recalculates calorie + macro goals
- Calls `refreshUserGoals()` from AuthContext after save — dashboard updates instantly
- Loading spinner during save, success alert with back navigation on completion

### Updated: `app/app/(tabs)/profile.tsx`
- Premium redesign:
  - Initials avatar with green ring
  - **Goals strip** — 4 pills showing daily Calories / Carbs / Protein / Fat goals
  - Fallback values used for users without stored macro goals (250g / 120g / 65g)
  - **"Edit Profile"** row navigates to the new edit-profile screen
  - Logout and Delete Account grouped separately under "DANGER ZONE"

### Auth guard fix: `app/app/_layout.tsx`
- `'edit-profile'` added to the `allowedScreens` list — previously the guard was redirecting users back to the dashboard instead of showing the edit screen

### No backend changes needed
`PATCH /api/user/profile` already recalculates BMR, TDEE, calorie goal, and macro goals via `calculate_daily_calories()` on every update.

---

## Fallback Values Reference

| Field | Fallback |
|---|---|
| `daily_calorie_goal` | 2000 kcal |
| `daily_carbs_goal` | 250g |
| `daily_protein_goal` | 120g |
| `daily_fat_goal` | 65g |

Fallbacks apply to users who completed onboarding before macro goals were introduced. Real personalized values are stored after the first profile save/update.

---

## File Summary

| File | Change |
|---|---|
| `backend/app/utils/calorie_calculator.py` | Added `calculate_macro_goals()` |
| `backend/app/models/user.py` | Added macro goal fields to `UserProfileResponse` |
| `backend/app/services/user_service.py` | Macro goals saved/returned in all profile operations |
| `app/types/auth.types.ts` | Added macro goal + `refreshUserGoals` to interfaces |
| `app/context/AuthContext.tsx` | Reads macro goals in all auth flows; added `refreshUserGoals()` |
| `app/app/(tabs)/index.tsx` | Full dashboard redesign + macro goal display |
| `app/app/(tabs)/camera.tsx` | Premium Add Meal page redesign |
| `app/app/(tabs)/profile.tsx` | Premium Profile page redesign + Edit Profile button |
| `app/app/(tabs)/_layout.tsx` | Tab bar styling |
| `app/app/manual.tsx` | Premium manual food search redesign |
| `app/app/edit-profile.tsx` | **New** — Edit Profile screen |
| `app/app/_layout.tsx` | Added `edit-profile` to auth guard allowlist |
