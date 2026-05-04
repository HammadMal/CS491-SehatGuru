# Meal Plan Cards Feature — Design Spec

**Date:** 2026-03-15
**Branch:** feature/MEM0

---

## Overview

When the SehatGuru chatbot generates a meal plan (`intent = meal_plan_generation`), the response is currently returned as a markdown text blob. This feature replaces that with swipeable visual cards — one card per dish — displayed inline in the chat below a short narrative summary. Each card shows a Pexels food image, dish name, meal type, calories, and macros, and lets the user add the meal directly to their daily log.

---

## Goals

- Display meal plan meals as swipeable title cards in the chat, below the narrative text bubble
- Fetch food images from the Pexels API using the dish name
- Allow one-tap logging of any meal from a card into the daily meal log
- Auto-assign meal type (Breakfast/Lunch/Dinner/Snack) from the structured plan
- Graceful fallback: if structured data is unavailable, show plain text as before

---

## Architecture

### Approach: Single structured JSON prompt with Gemini JSON mode

When `intent == meal_plan_generation`, the backend switches to a dedicated structured generation call using Gemini's `response_mime_type="application/json"` in `GenerationConfig`. This forces valid JSON output in a single LLM call. The JSON contains a short `narrative` (shown in the chat bubble) and a `meals` array (rendered as cards). No second LLM call is needed.

---

## Backend Changes

### 1. `backend/app/models/chat.py`

Add two new Pydantic models and extend `ChatMessageResponse`:

```python
class MealPlanItem(BaseModel):
    name: str
    meal_type: str        # "Breakfast" | "Lunch" | "Dinner" | "Snack"
    calories: float
    protein: float
    carbs: float
    fat: float
    grams: float

# Extend existing ChatMessageResponse:
meal_plan: Optional[List[MealPlanItem]] = Field(
    None,
    description="Structured meal items when intent is meal_plan_generation"
)
```

### 2. `backend/app/services/intent_router.py`

#### 2a. `RouterState` TypedDict — add one field

```python
class RouterState(TypedDict):
    ...existing fields...
    meal_plan: Optional[List[dict]]   # ADD THIS: populated only for meal_plan_generation
```

Initial value in `route_and_respond()`: `"meal_plan": None`

#### 2b. Updated `MEAL_PLAN_PROMPT`

Replace the existing `MEAL_PLAN_PROMPT` with one that instructs the model to return JSON. Remove all markdown formatting instructions. The new prompt instructs the LLM to output:

```
{
  "narrative": "<2-3 sentence summary of the plan, e.g. 'Here is your personalised one-day meal plan targeting X kcal...'>",
  "meals": [
    {
      "name": "<dish name in English with Urdu in parentheses if helpful>",
      "meal_type": "<Breakfast|Lunch|Dinner|Snack>",
      "calories": <number>,
      "protein": <grams as number>,
      "carbs": <grams as number>,
      "fat": <grams as number>,
      "grams": <serving size in grams as number>
    }
  ]
}
```

The prompt retains all existing constraints:
- Calorie distribution rules (25/35/30/10%)
- ±10% calorie target rule
- No dish repetition
- Respect food dislikes from user memory
- Pakistani dishes only from retrieved context

#### 2c. Refactor `generate_response` for shared prompt building

The existing `generate_response` node (lines 360–471 of `intent_router.py`) contains ~90 lines of prompt-building logic (user profile, memory, RAG context, chat history). Rather than duplicating this in a new function, **extract it into a private helper `_build_prompt_parts(state) -> list[str]`** that both paths share.

Then update `generate_response` to branch on intent:

```python
def _build_prompt_parts(state: RouterState) -> list[str]:
    """Shared prompt assembly: system prompt placeholder excluded (caller adds it)."""
    # ... move lines 371–461 of current generate_response here, minus system prompt line

def generate_response(state: RouterState) -> dict:
    if state["intent"] == "meal_plan_generation":
        return _generate_meal_plan_structured(state)
    # existing nutritional_advice path: build parts, call model.generate_content(...)

def _generate_meal_plan_structured(state: RouterState) -> dict:
    """Structured JSON generation for meal plans using Gemini JSON mode."""
    prompt_parts = [MEAL_PLAN_PROMPT] + _build_prompt_parts(state)
    full_prompt = "\n".join(prompt_parts)

    model = genai.GenerativeModel(
        settings.GEMINI_MODEL,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json"
        )
    )
    try:
        response = model.generate_content(full_prompt)
        parsed = json.loads(response.text)
        return {
            "response": parsed["narrative"],
            "meal_plan": parsed["meals"],
        }
    except Exception:
        # Fallback: return raw text, no cards
        return {
            "response": getattr(response, "text", "Sorry, I couldn't generate a meal plan."),
            "meal_plan": None,
        }
```

#### 2d. Validation bypass for meal plan intent

The existing `validate_response` node (line 477) already contains:
```python
if state.get("intent") != "nutritional_advice":
    return {"validation_passed": True, "validation_scores": None}
```
This means meal plan responses already **skip validation and never retry**. The `narrative` string (short summary) will not be validated. No change required to the validation logic.

#### 2e. `route_and_respond()` — two changes

**Add `"meal_plan": None` to `initial_state`** (required — TypedDict key must be present at initialisation or LangGraph will raise `KeyError` on state merges):

```python
initial_state: RouterState = {
    ...existing keys...
    "meal_plan": None,   # ADD THIS
}
```

**Add `meal_plan` to the return dict:**

```python
return {
    "response": result["response"],
    "intent": result.get("intent", ""),
    "rag_used": use_rag,
    "guard_result": result.get("guard_result", "ok"),
    "validation_scores": result.get("validation_scores"),
    "validation_passed": result.get("validation_passed", True),
    "retry_count": result.get("retry_count", 0),
    "meal_plan": result.get("meal_plan"),   # ADD THIS
}
```

### 3. `backend/app/routes/chat.py`

Pass `meal_plan` from route result into `ChatMessageResponse` (in the `with-history` endpoint):

```python
return ChatMessageResponse(
    ...existing fields...
    meal_plan=result.get("meal_plan"),
)
```

---

## Frontend Changes

### 1. `app/types/meal.types.ts`

Add `"chatbot"` to the `source` union:

```ts
source: "camera" | "manual" | "chatbot";
```

### 2. `app/types/chat.types.ts`

Add `MealPlanItem`, extend `Message` and `ChatResponse`:

```ts
export interface MealPlanItem {
  name: string;
  meal_type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams: number;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  meal_plan?: MealPlanItem[];   // only present on meal plan bot messages
}

export interface ChatResponse {
  response: string;
  rag_used?: boolean;
  intent?: string;              // already returned by backend — add to frontend type
  meal_plan?: MealPlanItem[];
}
```

### 3. `app/config.ts`

Add Pexels API key. Since `config.ts` is bundled into the JS bundle, use Expo's `Constants.expoConfig.extra` pattern to read from `.env` at build time:

```ts
import Constants from 'expo-constants';
export const PEXELS_API_KEY: string = Constants.expoConfig?.extra?.pexelsApiKey ?? '';
```

**Important:** This pattern requires `app.config.js` (not `app.json`) because only `app.config.js` can call `process.env` at build time. Rename or replace `app.json` with `app.config.js`:

```js
// app.config.js
export default {
  expo: {
    ...existingConfig,
    extra: {
      pexelsApiKey: process.env.PEXELS_API_KEY ?? '',
    },
  },
};
```

In `.env` (already gitignored): `PEXELS_API_KEY=your_key_here`

### 4. `app/services/pexels.api.ts` (new file)

```ts
import { PEXELS_API_KEY } from '../config';

const imageCache = new Map<string, string>();

export async function searchFoodImage(dishName: string): Promise<string | null> {
  if (imageCache.has(dishName)) return imageCache.get(dishName)!;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(dishName + ' food')}&per_page=1`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    const data = await res.json();
    const url = data?.photos?.[0]?.src?.medium ?? null;
    if (url) imageCache.set(dishName, url);
    return url;
  } catch {
    return null;
  }
}
```

Returns `null` on any error. Cards show a solid-colour placeholder instead of crashing.

### 5. `app/components/MealPlanCards.tsx` (new file)

**`MealPlanCards`** (`props: { items: MealPlanItem[] }`):
- Horizontal `FlatList` with `pagingEnabled={true}` — no extra dependencies
- Dot indicator below showing current page (driven by `onViewableItemsChanged`)

**`MealCard`** (internal to same file):

- **Image**: fetches via `searchFoodImage(item.name)` on mount; shows `ActivityIndicator` while loading, a solid `#F0F0F0` placeholder on `null`
- **Meal type pill**: colour matches dashboard `MEAL_META` (Breakfast=`#f59e0b`, Lunch=`#22c55e`, Dinner=`#6366f1`, Snack=`#ec4899`)
- **Dish name**: large bold text
- **Calories**: prominent number
- **Macros row**: `P: Xg · C: Xg · F: Xg`
- **"Add to Log" button**:
  - On press: constructs a full `Meal` object. Use `import * as Crypto from 'expo-crypto'` (same pattern as `chatbot.tsx`) for UUID generation. `useAuth()` provides `user.id`:
    ```ts
    import * as Crypto from 'expo-crypto';
    // ...
    const meal: Meal = {
      id: Crypto.randomUUID(),
      userId: user!.id,           // from useAuth() hook inside the component
      foodName: item.name,
      mealType: item.meal_type,
      grams: item.grams,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      source: 'chatbot',
      createdAt: new Date().toISOString(),
    };
    ```
  - Calls `saveMealToFirestore(meal)` then `useMealStore.getState().addMeal(meal)`
  - Button state toggles to "Added ✓" (green, disabled) after success — no Alert popup
  - On Firestore error: shows "Failed — Retry" text, button re-enables

### 6. `app/components/ChatMessage.tsx`

When `message.meal_plan` has one or more items, render `<MealPlanCards items={message.meal_plan} />` below the bot text bubble. No change to how the text bubble itself renders.

### 7. `app/app/(tabs)/chatbot.tsx`

After API call returns, attach `response.meal_plan` to the bot `Message` object:

```ts
const botMessage: Message = {
  id: Crypto.randomUUID(),
  content: response.response,
  sender: 'bot',
  timestamp: new Date(),
  meal_plan: response.meal_plan,   // ADD THIS
};
```

### 8. `app/store/useChatStore.ts`

No changes required. The store holds `Message[]` and `Message` already accepts optional fields. There is no persistence middleware in this store (pure in-memory Zustand), so no serialisation concerns.

---

## Data Flow

```
User asks for meal plan
        │
        ▼
Backend: intent = meal_plan_generation
        │
        ▼
generate_meal_plan_structured()
  → Gemini (JSON mode: response_mime_type="application/json")
  → json.loads(response.text)
  → { narrative, meals: [{name, meal_type, calories, ...}] }
        │
        ▼
ChatMessageResponse { response: narrative, meal_plan: [...] }
        │
        ▼
Frontend: Message { content: narrative, meal_plan: [...] }
        │
        ▼
ChatMessage renders:
  ┌─ Bot text bubble (narrative) ──────────────┐
  └────────────────────────────────────────────┘
  ┌─ MealPlanCards (horizontal FlatList) ──────┐
  │  [← Card 1 │ Card 2 │ Card 3 │ Card 4 →]  │
  │  [Breakfast]  Aloo Paratha                 │
  │  480 kcal  P:12g C:68g F:18g              │
  │  [Add to Log]                              │
  └────────────────────────────────────────────┘
        │ (user taps Add to Log)
        ▼
construct Meal { id: uuid, userId, source: "chatbot", ... }
saveMealToFirestore(meal) + useMealStore.addMeal(meal)
```

---

## Error Handling & Edge Cases

| Scenario | Behaviour |
|---|---|
| Gemini JSON parse fails | `meal_plan: null`, chat shows raw text response as plain text bubble |
| Pexels returns null / key missing | Card shows `#F0F0F0` solid colour placeholder, no crash |
| Firestore write fails on Add to Log | Button shows "Failed — Retry", re-enables; no meal added to store |
| Meal plan returns 0 meals in array | `meal_plan` treated as falsy, no cards rendered, plain text bubble only |
| User adds meal, then scrolls back | "Added ✓" state persists for the session (component state, not store) |
| User not authenticated (edge case) | `useAuth().user` is null; button disabled or shows error |

---

## Files Changed

| File | Change |
|---|---|
| `backend/app/models/chat.py` | Add `MealPlanItem`; extend `ChatMessageResponse` with `meal_plan` |
| `backend/app/services/intent_router.py` | Add `meal_plan` to `RouterState`; add `generate_meal_plan_structured()`; update `generate_response` to branch on intent; update `MEAL_PLAN_PROMPT`; add `meal_plan` to `route_and_respond()` return |
| `backend/app/routes/chat.py` | Pass `meal_plan` field into `ChatMessageResponse` |
| `app/types/meal.types.ts` | Add `"chatbot"` to `Meal.source` union |
| `app/types/chat.types.ts` | Add `MealPlanItem`; extend `Message` and `ChatResponse` |
| `app/config.ts` | Add `PEXELS_API_KEY` via `Constants.expoConfig.extra` |
| `app/app.config.js` | New (replaces `app.json`) — add `extra.pexelsApiKey: process.env.PEXELS_API_KEY` |
| `app/services/pexels.api.ts` | New — Pexels food image search with in-memory cache |
| `app/components/MealPlanCards.tsx` | New — swipeable cards component with Add to Log |
| `app/components/ChatMessage.tsx` | Render `MealPlanCards` below bot bubble when `meal_plan` present |
| `app/app/(tabs)/chatbot.tsx` | Attach `meal_plan` to bot `Message` object after API response |
| `app/store/useChatStore.ts` | No changes needed (no persistence middleware, `Message` type change is backward-compatible) |
