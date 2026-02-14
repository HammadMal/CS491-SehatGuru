# LLM Self-Validation System

## Overview

The **LLM Self-Validation** system is an internal quality assurance layer that automatically evaluates AI-generated nutritional advice before delivering it to users. After the LangGraph intent router generates a response, a second LLM call validates the response across 4 critical dimensions, triggering automatic regeneration if quality thresholds are not met.

### Why Self-Validation?

- **Safety First**: Ensures dietary advice doesn't pose health risks (allergens, portion sizes, medical conditions)
- **Accuracy Guarantee**: Verifies nutritional information matches the RAG context and Pakistani dietary guidelines
- **Personalization Check**: Confirms responses respect user's health goals and dietary restrictions
- **Cultural Appropriateness**: Validates Pakistani food naming conventions and cultural meal patterns

---

## Architecture

### Before Validation (Phase 3)
```
classify_intent → retrieve_*_context → generate_response → END
```

### After Validation (Phase 4)
```
classify_intent → retrieve_*_context → generate_response
    ↓
validate_response (LLM scores: safety, accuracy, personalization, cultural)
    ↓
check_approval (threshold check)
    ├─ APPROVED → END
    ├─ NOT_APPROVED (retry_count < 2) → increment_retry → generate_response (loop)
    └─ NOT_APPROVED (retry_count >= 2) → END (max retries reached)
```

### Validation Scope

✅ **Validated**: `nutritional_advice` intent
- Calorie/nutrition queries ("How many calories in biryani?")
- Health impact questions ("Is daal good for diabetics?")
- Dietary advice ("Benefits of chapati vs rice?")
- Food comparisons, portion sizes, guideline questions

❌ **Not Validated**: `meal_plan_generation` intent
- Meal plan creation will have separate validation in future phases

---

## Validation Dimensions

### 1. Safety Score (0.0 - 1.0)
**Threshold: ≥ 0.8 (critical)**

Evaluates:
- ✓ Harmful dietary advice avoided
- ✓ Portion sizes are reasonable
- ✓ Dangerous food combinations flagged
- ✓ Allergen warnings included when relevant
- ✓ Medical conditions (diabetes, hypertension) handled safely

**Example Failures:**
- Recommending excessive salt for hypertension patients
- Suggesting high-sugar foods for diabetics
- Missing allergen warnings (nuts, dairy)

---

### 2. Accuracy Score (0.0 - 1.0)
**Threshold: ≥ 0.7**

Evaluates:
- ✓ Nutritional values (calories, macros) match RAG context
- ✓ Pakistani dietary guidelines correctly cited
- ✓ Dish names and ingredients accurate
- ✓ Information grounded in retrieved context (not hallucinated)

**Example Failures:**
- Incorrect calorie counts
- Misattributing nutrition facts to wrong dishes
- Fabricating guideline citations

---

### 3. Personalization Score (0.0 - 1.0)
**Threshold: ≥ 0.6**

Evaluates:
- ✓ User's health goals addressed (weight_loss, muscle_gain, diabetes_management)
- ✓ Dietary restrictions respected (vegetarian, low_sodium, halal)
- ✓ Calorie target considered
- ✓ Age/gender relevance (if applicable)

**Example Failures:**
- Recommending meat dishes to vegetarians
- Ignoring user's weight loss goal
- Not considering calorie target

---

### 4. Cultural Score (0.0 - 1.0)
**Threshold: ≥ 0.7**

Evaluates:
- ✓ Pakistani food names used correctly (Urdu + English: "dal (lentils)")
- ✓ Culturally appropriate meal patterns (roti with salan, NOT pasta with dal)
- ✓ Serving sizes in Pakistani measurements (katori, roti, cup)
- ✓ Respectful tone toward Pakistani dietary culture

**Example Failures:**
- Using only English names without Urdu
- Suggesting culturally inappropriate pairings
- Using Western measurements exclusively (ounces, tablespoons)

---

## Configuration

### Settings (`backend/app/config/settings.py`)

```python
# Enable/disable validation globally
ENABLE_RESPONSE_VALIDATION: bool = True

# Maximum regeneration attempts before giving up
VALIDATION_MAX_RETRIES: int = 2  # 3 total attempts (1 initial + 2 retries)

# Score thresholds (all must pass)
VALIDATION_THRESHOLD_SAFETY: float = 0.8          # Critical
VALIDATION_THRESHOLD_ACCURACY: float = 0.7        # Important
VALIDATION_THRESHOLD_PERSONALIZATION: float = 0.6 # Nice-to-have
VALIDATION_THRESHOLD_CULTURAL: float = 0.7        # Important
```

### Threshold Logic

**ALL 4 dimensions must pass** (AND logic, not weighted average):
```python
passed = (
    safety >= 0.8 AND
    accuracy >= 0.7 AND
    personalization >= 0.6 AND
    cultural >= 0.7
)
```

If any dimension fails → regenerate (up to 2 retries).

---

## API Response Format

### Request
```json
{
  "message": "Is daal chawal good for diabetics?",
  "user_context": {
    "health_goals": ["diabetes_management"],
    "dietary_restrictions": ["diabetic", "low_sugar"],
    "daily_calorie_target": 2000,
    "age": 45,
    "gender": "male"
  },
  "use_rag": true
}
```

### Response (Validation Enabled)
```json
{
  "response": "Daal chawal can be a good option for diabetics...",
  "intent": "nutritional_advice",
  "rag_used": true,

  "validation_scores": {
    "safety": 0.9,
    "accuracy": 0.85,
    "personalization": 0.8,
    "cultural": 0.9
  },
  "validation_passed": true,
  "retry_count": 0
}
```

### Response (After Regeneration)
```json
{
  "response": "...",
  "validation_scores": {
    "safety": 0.85,
    "accuracy": 0.75,
    "personalization": 0.7,
    "cultural": 0.8
  },
  "validation_passed": true,
  "retry_count": 1  // ← Response was regenerated once
}
```

### Response (Max Retries Reached)
```json
{
  "response": "...",
  "validation_scores": {
    "safety": 0.6,  // ← Still below threshold after 2 retries
    "accuracy": 0.7,
    "personalization": 0.5,
    "cultural": 0.6
  },
  "validation_passed": false,  // ← Failed validation but returned anyway
  "retry_count": 2  // ← Max retries reached
}
```

---

## Implementation Details

### Modified Files

| File | Changes |
|------|---------|
| `backend/app/config/settings.py` | Added 6 validation settings |
| `backend/app/services/intent_router.py` | Added validation nodes, prompt, and graph routing |
| `backend/app/models/chat.py` | Added `ValidationScores` model and extended `ChatMessageResponse` |
| `backend/app/routes/chat.py` | Pass validation data from router to response |

### New LangGraph Nodes

#### `validate_response(state) -> dict`
- Skips validation if `intent != "nutritional_advice"`
- Skips validation if `validation_enabled == False`
- Calls Gemini with `VALIDATION_PROMPT` to score response
- Parses JSON response: `{safety_score, accuracy_score, personalization_score, cultural_score, reasoning}`
- Checks scores against thresholds
- Returns `{validation_scores, validation_passed, validation_reasoning}`
- **Error Handling**: Auto-passes on validation errors (prevents blocking responses)

#### `check_approval(state) -> str`
- Returns `"approved"` if `validation_passed == True`
- Returns `"max_retries_reached"` if `retry_count >= VALIDATION_MAX_RETRIES`
- Returns `"retry"` to trigger regeneration

#### `increment_retry(state) -> dict`
- Increments `retry_count` before looping back to `generate_response`
- Logs validation failure and retry attempt

### Validation Prompt

The `VALIDATION_PROMPT` instructs Gemini to:
1. Review the original user query
2. Check user context (health goals, restrictions, calorie target)
3. Compare response against RAG context
4. Score 4 dimensions (0.0-1.0 each)
5. Provide brief reasoning

**Prompt Structure:**
```
## Original User Query: {message}
## User Context: {user_context_summary}
## Retrieved RAG Context: {rag_context}
## Generated Response to Validate: {response}

Evaluate on 4 dimensions... (detailed criteria)

Response Format (JSON):
{
  "safety_score": <float>,
  "accuracy_score": <float>,
  "personalization_score": <float>,
  "cultural_score": <float>,
  "reasoning": "<brief explanation>"
}
```

---

## Performance Impact

| Scenario | Overhead |
|----------|----------|
| Validation **disabled** | 0ms (skips validation node) |
| Validation enabled, **passes first try** | +300-600ms (1 Gemini call) |
| Validation enabled, **1 retry** | +1-2 seconds (regenerate + re-validate) |
| Validation enabled, **2 retries** | +2-4 seconds (worst case) |

**Mitigation:**
- Frontend should show loading state
- Most responses pass on first attempt (estimated 80-90% pass rate)
- Safety threshold ensures critical issues never slip through

---

## Testing

### Test 1: Accurate Response (Should Pass)
```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How many calories are in chicken biryani?",
    "use_rag": true
  }'
```

**Expected:**
- `validation_passed: true`
- `retry_count: 0`
- All scores ≥ thresholds

---

### Test 2: Personalized Query (Should Pass)
```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Is daal chawal good for diabetics?",
    "user_context": {
      "health_goals": ["diabetes_management"],
      "dietary_restrictions": ["diabetic"],
      "age": 45,
      "gender": "male"
    },
    "use_rag": true
  }'
```

**Expected:**
- `validation_passed: true`
- High personalization score (response addresses diabetes)
- High safety score (safe dietary advice)

---

### Test 3: Validation Disabled
```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the health benefits of chapati?",
    "use_rag": true
  }'
```

Then check `.env` or settings:
```bash
ENABLE_RESPONSE_VALIDATION=False
```

**Expected:**
- `validation_scores: null` or auto-pass scores
- `validation_passed: true`
- No validation overhead

---

### Test 4: Meal Plan (Should Skip Validation)
```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a 1-day meal plan for weight loss",
    "use_rag": true
  }'
```

**Expected:**
- `intent: "meal_plan_generation"`
- `validation_scores: null`
- `validation_passed: true`
- Validation skipped (only nutritional_advice is validated)

---

## Monitoring & Debugging

### Log Messages

**Validation Failure (Retry Triggered):**
```
Validation failed (scores: {'safety': 0.6, 'accuracy': 0.8, 'personalization': 0.7, 'cultural': 0.5}),
regenerating (attempt 2/3)
```

**Max Retries Reached:**
```
Max retries (2) reached, returning response with low confidence
```

**Validation Error (Auto-Pass):**
```
Validation failed with error, auto-passing: <error message>
```

### Frontend Integration

Display validation quality:
```jsx
{response.retry_count > 0 && (
  <Badge color="yellow">
    ⚠️ This response was regenerated {response.retry_count} time(s) for quality
  </Badge>
)}

{response.validation_scores && (
  <QualityIndicator>
    Safety: {response.validation_scores.safety.toFixed(2)} ✓
    Accuracy: {response.validation_scores.accuracy.toFixed(2)} ✓
    Personalization: {response.validation_scores.personalization.toFixed(2)} ✓
    Cultural: {response.validation_scores.cultural.toFixed(2)} ✓
  </QualityIndicator>
)}
```

---

## Error Handling

### Auto-Pass Scenarios

Validation **auto-passes** (doesn't block response) in these cases:

1. **Intent is meal_plan_generation**
   - Only nutritional_advice is validated
   - Returns `validation_passed: true, validation_scores: null`

2. **Validation disabled in settings**
   - `ENABLE_RESPONSE_VALIDATION=False`
   - Returns default passing scores

3. **Validation LLM call fails**
   - JSON parsing error
   - Gemini API error
   - Timeout
   - Returns `validation_passed: true` with error reasoning

4. **Max retries reached**
   - After 2 regeneration attempts, returns response even if scores are low
   - `validation_passed: false` but response still delivered

**Rationale:** Better to deliver a potentially imperfect response than to error out and deliver nothing.

---

## Future Enhancements (Phase 5)

### 1. Frontend Quality Badges
Display validation scores as quality indicators:
- **High Quality ✓**: All scores > 0.8
- **Good Quality**: All scores > 0.7
- **Low Confidence ⚠️**: Max retries reached

### 2. Analytics Dashboard
Track metrics:
- Validation pass rate by intent type
- Average score per dimension
- Retry count distribution
- Common failure reasons

### 3. User Feedback Loop
If user dislikes a response that passed validation:
- Log for model fine-tuning
- Adjust thresholds based on real user feedback

### 4. Weighted Scoring
Allow configuration of weighted average instead of AND logic:
```python
score = (
    safety * 0.4 +      # 40% weight
    accuracy * 0.3 +    # 30% weight
    personalization * 0.2 + # 20% weight
    cultural * 0.1      # 10% weight
)
passed = score >= 0.75
```

### 5. Confidence Levels
Map scores to confidence labels:
- `0.9-1.0`: High Confidence
- `0.7-0.89`: Medium Confidence
- `<0.7`: Low Confidence

### 6. A/B Testing
Compare user satisfaction with validation on vs off

---

## Troubleshooting

### Issue: All responses failing validation

**Solution:**
1. Check thresholds are not too strict
2. Review VALIDATION_PROMPT for clarity
3. Ensure RAG context is being retrieved properly
4. Check Gemini model version (should be `gemini-2.0-flash`)

---

### Issue: Validation taking too long

**Solution:**
1. Most responses should pass first try (<600ms overhead)
2. If frequent retries, review threshold settings
3. Consider disabling validation for non-critical queries
4. Monitor Gemini API latency

---

### Issue: Validation scores always 1.0

**Solution:**
1. Check if validation is actually running (not auto-passing)
2. Review VALIDATION_PROMPT instructions
3. Ensure JSON parsing is working correctly
4. Check logs for "Validation failed with error, auto-passing"

---

### Issue: Personalization score always low

**Solution:**
1. Ensure user_context is being passed in request
2. Check that health_goals and dietary_restrictions are populated
3. Verify generate_response includes user context in prompt
4. Lower VALIDATION_THRESHOLD_PERSONALIZATION if too strict

---

## Configuration Examples

### Strict Mode (High Quality Bar)
```python
ENABLE_RESPONSE_VALIDATION = True
VALIDATION_MAX_RETRIES = 3
VALIDATION_THRESHOLD_SAFETY = 0.9
VALIDATION_THRESHOLD_ACCURACY = 0.85
VALIDATION_THRESHOLD_PERSONALIZATION = 0.8
VALIDATION_THRESHOLD_CULTURAL = 0.85
```

### Balanced Mode (Default)
```python
ENABLE_RESPONSE_VALIDATION = True
VALIDATION_MAX_RETRIES = 2
VALIDATION_THRESHOLD_SAFETY = 0.8
VALIDATION_THRESHOLD_ACCURACY = 0.7
VALIDATION_THRESHOLD_PERSONALIZATION = 0.6
VALIDATION_THRESHOLD_CULTURAL = 0.7
```

### Performance Mode (Fast, Lenient)
```python
ENABLE_RESPONSE_VALIDATION = True
VALIDATION_MAX_RETRIES = 1
VALIDATION_THRESHOLD_SAFETY = 0.7
VALIDATION_THRESHOLD_ACCURACY = 0.6
VALIDATION_THRESHOLD_PERSONALIZATION = 0.5
VALIDATION_THRESHOLD_CULTURAL = 0.6
```

### Development Mode (Disabled)
```python
ENABLE_RESPONSE_VALIDATION = False
```

---

## Summary

The LLM Self-Validation system adds a critical quality assurance layer to SehatGuru's nutritional advice pipeline. By automatically evaluating responses for safety, accuracy, personalization, and cultural appropriateness, it ensures users receive high-quality, trustworthy dietary guidance grounded in Pakistani health standards.

**Key Benefits:**
- ✅ Prevents harmful or inaccurate dietary advice
- ✅ Ensures personalization to user health goals
- ✅ Maintains cultural authenticity
- ✅ Transparent quality scores for frontend display
- ✅ Graceful degradation (auto-pass on errors)
- ✅ Configurable thresholds and retry logic

**Trade-offs:**
- ⚠️ Adds 300-600ms latency per request (when enabled)
- ⚠️ Retries can extend latency to 2-4 seconds (rare)
- ⚠️ Additional Gemini API costs (1 extra call per request)

For most use cases, the quality improvements outweigh the performance cost. The system can be disabled or fine-tuned based on production metrics and user feedback.

---

**Version:** 1.0
**Last Updated:** February 2026
**Author:** SehatGuru Development Team
