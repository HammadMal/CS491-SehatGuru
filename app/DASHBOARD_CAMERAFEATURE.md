````md


LATEST UPDATE 12TH DECEMBER 2025------------------------------------------------------------------

# 📸 Camera-Based Meal Logging & AddMealModal

## SehatGuru – Nutrition Logging System

This document describes the **final, production-ready implementation** of SehatGuru’s **camera-based meal logging flow**, centered around the reusable `AddMealModal` component and its orchestration from `CameraScreen`.

The system is designed to:

- Eliminate UI dead states (white screens)
- Provide immediate user feedback during AI processing
- Gracefully handle food-detection failures
- Support both **camera-based** and **manual** meal logging
- Maintain clean, predictable state lifecycles

---

## 📦 Components

### 1. CameraScreen
**Path:** `app/(tabs)/camera.tsx`

Handles:
- Camera permissions and image capture
- Uploading images to the food-detection API
- Managing loading, detection, and error state
- Controlling modal visibility
- Navigation to manual logging

---

### 2. AddMealModal
**Path:** `components/AddMealModal.tsx`

A **reusable bottom-sheet modal** used for:
- Showing AI analysis progress
- Displaying detected food and nutrients
- Handling failure recovery
- Confirming and logging meals

> ⚠️ `AddMealModal` is UI-only.  
> It does **not** handle navigation, API calls, or global state.

---

## ❌ Problems Solved

### Initial Issues
- White screen after camera logging
- Crash during manual logging (`onDone` undefined)
- No feedback while AI model processed images
- No recovery path when food detection failed

---

## ✅ Design Principles

### 1. Immediate UI Feedback
The modal opens **immediately after image capture**, before the API response returns:

```ts
setModalVisible(true);
await detectFood(imageUri);
````

This prevents perceived freezes during AI processing.

---

### 2. Explicit Modal State Machine

`AddMealModal` renders exactly **one of three states**:

#### ⏳ Loading State

Triggered when:

```ts
loading === true
```

Displays:

* Scan icon
* “Analyzing food” message
* Nutrient identification status

---

#### ❌ Error State

Triggered when:

```ts
!loading && !foodName
```

Displays:

* Clear error explanation
* **Retake Photo** action
* **Add Manually** fallback

This prevents user dead ends.

---

#### ✅ Success State

Triggered when:

```ts
!loading && foodName
```

Displays:

* Image preview
* Meal type selector
* Quantity (grams) input
* Dynamically scaled nutrients
* Action buttons:

  * Retake
  * Add Manually
  * Done

---

### 3. Single Source of Truth for Cleanup

All modal exits funnel through one function in `CameraScreen`:

```ts
const handleModalClose = () => {
  setModalVisible(false);
  setImage(null);
  setDetection(null);
  setNutrients(null);
  setError(null);
};
```

Guarantees:

* No stale state
* No leftover images
* No white screens

---

### 4. Defensive Callback Handling

`AddMealModal` does **not assume callbacks exist**:

```ts
if (onDone) {
  onDone(payload);
} else {
  onClose();
}
```

This allows:

* Camera flow → meal persistence
* Manual flow → safe modal close
* Zero runtime crashes

---

### 5. Separation of Concerns

`AddMealModal`:

* ❌ Does not navigate
* ❌ Does not manage camera or API state
* ✅ Emits user intent via callbacks

Navigation and cleanup are owned by the parent screen.

---

## 🔄 Camera-Based Flow

### User Journey

1. User taps **Add Meal with Camera**
2. Camera opens (Expo ImagePicker)
3. Image captured
4. Modal opens immediately (loading state)
5. Image uploaded to `/api/food/detect`
6. Backend returns food name and nutrients
7. Modal transitions to success or error state
8. User selects:

   * Done
   * Retake
   * Add Manually

---

### Camera → Modal Wiring

```tsx
<AddMealModal
  visible={modalVisible}
  loading={loading}
  onClose={handleModalClose}
  onRetake={handleRetake}
  onManual={handleManual}
  onDone={handleDone}
  foodName={detection?.food_name}
  nutrients={nutrients}
  image={image}
  isManual={false}
/>
```

---

## ✍️ Manual Logging Flow

* Manual flow does **not** pass `onDone`
* Modal still renders correctly
* Pressing **Done** simply closes the modal
* Navigation is handled externally

This behavior is **intentional and supported**.

---

## 🧩 AddMealModal Props

| Prop        | Required | Description                   |
| ----------- | -------- | ----------------------------- |
| `visible`   | ✅        | Controls modal visibility     |
| `onClose`   | ✅        | Safely closes modal           |
| `onRetake`  | ❌        | Camera-only action            |
| `onManual`  | ❌        | Camera-only navigation        |
| `onDone`    | ❌        | Optional persistence callback |
| `foodName`  | ❌        | Detected food name            |
| `nutrients` | ❌        | Base nutrients (per 100g)     |
| `image`     | ❌        | Camera preview                |
| `loading`   | ❌        | AI processing state           |
| `isManual`  | ❌        | Toggles camera-specific UI    |

---

## 🔁 Modal State Reset

Internal state resets on open to prevent stale UI:

```ts
useEffect(() => {
  if (visible) {
    setGrams(100);
    setMealType("Dinner");
    setShowDropdown(false);
  }
}, [visible]);
```

---

## 🟢 Final Done Button Logic

```tsx
if (onDone) {
  onDone({
    foodName,
    grams,
    mealType,
    nutrients: scaledNutrients,
  });
} else {
  onClose();
}
```

### Why This Matters

* Prevents crashes
* Enables reuse
* Future-proofs the component

---

## ✅ Outcomes

### Fixed

* White screen bugs
* Manual logging crashes
* Unclear AI processing delay
* No recovery on detection failure

### Architectural Benefits

* Reusable modal
* Predictable state lifecycle
* Clean separation of concerns
* Production-ready UX

---

## 📌 Summary

The final camera-based meal logging system in SehatGuru is:

* Robust
* Crash-proof
* User-centered
* AI-failure tolerant
* Production-ready

This pattern should be reused for all future bottom-sheet modals in the app.

---

## 🔮 Future Enhancements

* Persist meals to backend
* Optimistic dashboard updates
* Editable food names
* Confidence-based warnings
* Offline-safe logging

```




13TH DECEMBER 2025

# 🍽️ Meal Logging & Dashboard Update System — Documentation

## Overview

SehatGuru supports **two meal logging flows**:

- Camera-based food detection  
- Manual meal search and logging  

Both flows now share a **single, consistent data pipeline**, ensuring that meals logged from either source are:

- Persisted in application state  
- Displayed on the dashboard immediately  
- Counted toward daily calories and macronutrients  
- Grouped under the correct meal type (**Breakfast, Lunch, Dinner, Snack**)  

---

## Data Model

All logged meals conform to the unified `Meal` type:

```ts
export interface Meal {
  id: string;
  userId: string;
  foodName: string;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "camera" | "manual";
  createdAt: string;
}
````

This guarantees compatibility across the entire application.

---

## State Management Strategy

### Global Store

Meals are stored in a global Zustand store:

```ts
useMealStore
```

This store acts as the **single source of truth** for:

* Logged meals
* Dashboard calorie totals
* Per-meal grouping
* Macronutrient aggregation

Because the dashboard derives all values from this store, **any new meal automatically triggers a re-render**.

---

## AddMealModal — Central Control Point

`AddMealModal` is a reusable component used in **both camera and manual flows**.

### Responsibilities

* Collect user input (grams, meal type)
* Scale nutrients based on quantity
* Emit a normalized meal payload via `onDone`
* Remain UI-only (no navigation or persistence logic)

### Final `onDone` Payload

```ts
{
  foodName,
  grams,
  mealType,
  nutrients: {
    calories,
    protein,
    carbs,
    fat
  }
}
```

---

## Camera Logging Flow

### Steps

1. User takes a photo
2. Image is sent to `/api/food/detect`
3. Food name and nutrients are returned
4. `AddMealModal` opens immediately
5. User presses **Done**

### On Done

```ts
addMeal({
  id,
  userId,
  foodName,
  mealType,
  grams,
  calories,
  protein,
  carbs,
  fat,
  source: "camera",
  createdAt,
});
```

### Result

* Meal is added to the global store
* Dashboard updates instantly
* Calories and macros adjust automatically
* Meal appears under the selected meal type

---

## Manual Logging Flow

### Steps

1. User searches food from CSV-backed database
2. Selects a food item
3. `AddMealModal` opens
4. User presses **Done**

### On Done

```ts
addMeal({
  id,
  userId,
  foodName,
  mealType,
  grams,
  calories,
  protein,
  carbs,
  fat,
  source: "manual",
  createdAt,
});
```

### Result

* Same behavior as camera logging
* No special casing required
* No manual UI refresh needed

---

## Dashboard Behavior

### Data Source

The dashboard (`index.tsx`) does **not** store local state.

All values are derived from:

```ts
const { meals } = useMealStore();
```

### Calculations

* **Calories eaten**: rounded to whole numbers
* **Remaining calories**: `goal - eaten`
* **Macros**: rounded to **1 decimal place**
* **Meal grouping**: by `mealType`

```ts
meals.reduce(...)
```

---

## Units

* Calories are treated as **Calories (kcal)** internally
* UI displays the label **“calories”** for clarity
* No unit conversion is performed

---

## Confirmed Outcomes

✔ Meals logged via camera or manual search appear on the dashboard
✔ Calories update immediately
✔ Remaining calories adjust correctly
✔ Macros (protein, carbs, fat) recalculate instantly
✔ Meals appear under the correct meal type
✔ No silent failures
✔ No navigation hacks
✔ No duplicated logic

---

## Architectural Benefits

* Single meal data model
* Centralized state management
* Reusable modal component
* Predictable UI updates
* Production-ready logging pipeline

---

## Summary

Meals logged through either the **camera-based detection system** or **manual search** are immediately persisted in global state. The dashboard updates in real time, recalculating calories, remaining intake, and macronutrients while grouping meals under their selected meal type.

```

---

```
