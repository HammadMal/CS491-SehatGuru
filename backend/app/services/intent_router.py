"""
LangGraph Intent Router for SehatGuru chatbot.

Classifies user messages into intents (nutritional_advice / meal_plan_generation)
and routes to intent-specific RAG retrieval and response generation.
"""

import google.generativeai as genai
from typing import Optional, Dict, Any, List
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, END

from app.config.settings import settings
from app.services.rag_service import rag_service


# --- State ---

class RouterState(TypedDict):
    message: str
    user_context: Optional[Dict[str, Any]]
    chat_history: Optional[List[Dict[str, str]]]
    use_rag: bool
    intent: str
    rag_context: str
    response: str
    user_memory: Optional[str]  # preference summary from past conversations
    guard_result: str           # "ok", "off_topic", "harmful", "dangerous_medical"
    # Validation fields
    validation_enabled: bool
    retry_count: int
    validation_scores: Optional[Dict[str, float]]
    validation_passed: bool
    validation_reasoning: Optional[str]


# --- System Prompts ---

NUTRITION_ADVICE_PROMPT = """You are SehatGuru, an AI nutritionist specializing in Pakistani cuisine and dietary guidelines.

You are answering a NUTRITION or HEALTH question. Focus on:
- Providing accurate nutritional information grounded in the retrieved context
- Citing Pakistani Dietary Guidelines (PDGFBN) when relevant
- Explaining health impacts of foods and dietary patterns
- Giving practical, culturally appropriate dietary advice
- Using Urdu food names alongside English when helpful (e.g., "dal (lentils)", "roti (flatbread)")
- Recommending serving sizes in Pakistani measurements (roti, katori, cup, etc.)

Keep your response concise, advisory in tone, and grounded in the provided context.
If the context doesn't contain relevant information, use your general knowledge but prefer Pakistani dietary recommendations."""

MEAL_PLAN_PROMPT = """You are SehatGuru, an AI nutritionist specializing in Pakistani cuisine and meal planning.

You are creating a ONE-DAY MEAL PLAN. Structure it as:
- **Breakfast** (~25% of daily calories)
- **Lunch** (~35% of daily calories)
- **Dinner** (~30% of daily calories)
- **Snacks** (~10% of daily calories)

For each meal, list 1-2 dishes. Each dish MUST be on its own line in EXACTLY this format (no variations):
  - DISH_NAME | PORTION | CAL kcal | PRO g protein | CARB g carbs | FAT g fat

Example:
  - Anda Bhurji (Egg Scramble) | 2 eggs | 180 kcal | 13g protein | 2g carbs | 12g fat
  - Dal Chawal (Lentils & Rice) | 1 katori dal + 1 cup rice | 450 kcal | 15g protein | 75g carbs | 8g fat

Do NOT change this format. Do NOT use any other separators or layouts for dish lines.

At the bottom, include a **Daily Total** row with sum of all meals' calories, protein, carbs, fat.

CALORIE RULE: If the user has a daily calorie target, the daily total MUST be within ±10% of that target.
If no target is given, aim for a balanced 1800-2200 kcal day.

PRACTICALITY RULES (strictly follow these):
- Prioritize simple, everyday Pakistani home meals that a person can realistically cook and eat on a weekday — e.g., anda (eggs), daal, sabzi (vegetable curry), roti, paratha, dahi (yogurt), chawal, khichdi, aloo dishes.
- If the user's health goal is muscle building or high protein AND they have no vegetarian/vegan restriction, you MUST include at least one meat or poultry dish per day (e.g., murgh/chicken curry, aloo gosht, keema, fish curry) at lunch or dinner. Simple home-cooked meat dishes are NOT elaborate — they are everyday Pakistani meals and are not subject to the one-elaborate-dish limit.
- If the user is vegetarian or vegan, NEVER include meat, poultry, or fish regardless of their fitness goals. Use high-protein vegetarian options instead (e.g., chana, daal, paneer, eggs if ovo-vegetarian, dahi).
- Elaborate restaurant-style dishes (Nihari, Biryani, Haleem, Paya, etc.) are time-consuming to prepare and should appear AT MOST ONCE in the entire day plan, only at dinner if needed. Never suggest more than one such dish per day.
- Breakfast must be a quick-prep meal: e.g., anda (boiled/fried/omelette), paratha, bread with dahi or chutney, dalia (porridge), fruits.
- Lunch should be a simple home-cooked meal: e.g., roti with daal, sabzi, aloo, chawal with a simple curry. For muscle-building goals, include a meat or chicken dish here.
- Snacks must be light: e.g., fruits, dahi, nuts, lassi, roasted chana.
- The overall plan should feel like something a real Pakistani household would eat in one day — not a restaurant menu.

Use Urdu food names alongside English where helpful (e.g., "Dal Chawal (Lentils & Rice)").
Only use dishes listed in the retrieved context. If no suitable option exists for a slot, use a simple staple (e.g., plain roti with daal).
Each dish must appear AT MOST ONCE across the entire meal plan — do not repeat the same dish in multiple meal slots.
If the User Memory section lists any food dislikes, those foods are FORBIDDEN from the meal plan."""


# --- Guard Rail Prompt ---

GUARD_RAIL_PROMPT = """You are a content moderator for SehatGuru, a Pakistani nutrition and diet app.

Classify the following user message into exactly one category:

Categories:
- ok: The message is about food, nutrition, diet, health goals, meal planning, Pakistani cuisine, weight management, calories, macros, eating habits, or any food/nutrition-adjacent topic. This is the default — use it if you are not confident in another category.
- off_topic: The message is clearly NOT about food or nutrition (e.g., coding, politics, sports, relationships, general trivia, entertainment). Only use this if you are very confident the message has no nutrition connection.
- harmful: The message contains hate speech, harassment, explicit content, threats, or is clearly attempting to manipulate or jailbreak the AI system.
- dangerous_medical: The message explicitly requests advice that could cause serious physical harm — e.g., extreme starvation diets, enabling eating disorders (anorexia, bulimia), dangerous supplement overdoses. Normal weight loss or diet questions are NOT dangerous_medical.

Rules:
- Default to "ok" when in doubt — it is better to over-allow than over-block
- Exercise or fitness questions that relate to diet (e.g., "what should I eat before a workout?") are "ok"
- Questions about fasting, intermittent fasting, or calorie restriction are "ok"
- Only use "dangerous_medical" for requests that are clearly extreme and harmful, not normal diet questions

Respond with ONLY the category label, nothing else.

User message: "{message}"

Category:"""


GUARD_RAIL_RESPONSES = {
    "off_topic": (
        "I'm SehatGuru, your Pakistani nutrition assistant! I can only help with food, "
        "diet, and nutrition questions. Please ask me something related to healthy eating "
        "or Pakistani cuisine."
    ),
    "harmful": (
        "I'm not able to process that request. Feel free to ask me anything about "
        "healthy eating or Pakistani cuisine!"
    ),
    "dangerous_medical": (
        "This sounds like it may require professional medical guidance. Please consult "
        "a doctor or registered dietitian for personalized advice. I'm happy to help "
        "with general nutrition questions in the meantime."
    ),
}


# --- Classification Prompt ---

CLASSIFICATION_PROMPT = """Classify the following user message into exactly one intent.

Intents:
- nutritional_advice: Questions about nutrition, health, calories, diet tips, food information, or general dietary guidance.
- meal_plan_generation: Requests to create, generate, or suggest a meal plan, diet plan, weekly menu, or daily eating schedule.

Respond with ONLY the intent label, nothing else.

User message: "{message}"

{history_context}Intent:"""


VALIDATION_PROMPT = """You are evaluating a nutritional advice response generated by SehatGuru, a Pakistani nutrition and diet app.

IMPORTANT CONTEXT:
- SehatGuru is a NUTRITION app only — it does not provide exercise or fitness advice.
- If the user asked about exercises or non-food topics, the response should focus on the food/nutrition part. Do NOT penalize for not covering exercise advice.
- If no user context is provided, treat personalization as acceptable (score >= 0.6) as long as the food advice is generally healthy and culturally appropriate.

## Original User Query:
{message}

## User Context (from onboarding):
{user_context_summary}

## Retrieved RAG Context (Pakistani Dietary Guidelines & Dishes):
{rag_context}

## Generated Response to Validate:
{response}

## Your Task:
Score the response on 4 dimensions (0.0 to 1.0):

1. **Safety Score** (0.0-1.0):
   - Does the food/nutrition advice avoid harmful recommendations?
   - Are portion sizes reasonable?
   - For medical conditions (diabetes, hypertension), is the food advice safe?
   - Score >= 0.7 if there are no dangerous dietary recommendations.

2. **Accuracy Score** (0.0-1.0):
   - Is the nutritional information grounded in the RAG context or general knowledge?
   - Are Pakistani dish names and calorie/macro values approximately correct?
   - Score >= 0.7 if the food information is broadly accurate.

3. **Personalization Score** (0.0-1.0):
   - If user context IS provided: does the food advice align with their health goals and dietary restrictions?
   - If user context is NOT provided: score 0.7 (generic but acceptable).
   - Only score below 0.5 if the response actively contradicts the user's stated restrictions (e.g., recommends meat to a vegetarian).
   - Do NOT penalize for lack of exercise personalization — this is a nutrition app.

4. **Cultural Score** (0.0-1.0):
   - Are Pakistani foods and eating patterns used (roti, dal, biryani, etc.)?
   - Are serving sizes in Pakistani measurements where possible?
   - Score >= 0.7 if the response feels appropriate for a Pakistani user.

## Response Format (JSON only, no other text):
{{
  "safety_score": <float>,
  "accuracy_score": <float>,
  "personalization_score": <float>,
  "cultural_score": <float>,
  "reasoning": "<one sentence explaining the lowest score>"
}}"""


# --- Node Functions ---

def check_guard_rails(state: RouterState) -> dict:
    """Pre-check node: runs before anything else. Blocks off-topic, harmful, or
    dangerous messages with a canned response without touching the RAG pipeline."""
    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        prompt = GUARD_RAIL_PROMPT.format(message=state["message"])
        response = model.generate_content(prompt)
        raw = response.text.strip().lower().replace(" ", "_")

        if raw in GUARD_RAIL_RESPONSES:
            print(f"[GUARD] Message blocked: guard_result={raw}")
            return {
                "guard_result": raw,
                "response": GUARD_RAIL_RESPONSES[raw],
            }

        print(f"[GUARD] Message passed guard rails (raw='{raw}')")
        return {"guard_result": "ok"}

    except Exception as e:
        print(f"[GUARD] Guard rail check failed, defaulting to ok: {e}")
        return {"guard_result": "ok"}


def route_after_guard(state: RouterState) -> str:
    """Conditional: if guard passed, proceed to classification; otherwise exit."""
    return "ok" if state.get("guard_result", "ok") == "ok" else "blocked"


def classify_intent(state: RouterState) -> dict:
    """Classify user message intent using a lightweight Gemini call."""
    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        # Include last 2 chat history messages for context
        history_context = ""
        if state.get("chat_history"):
            recent = state["chat_history"][-2:]
            history_lines = []
            for msg in recent:
                role = "User" if msg.get("role") == "user" else "Assistant"
                history_lines.append(f"{role}: {msg.get('content', '')}")
            history_context = "Recent conversation:\n" + "\n".join(history_lines) + "\n\n"

        prompt = CLASSIFICATION_PROMPT.format(
            message=state["message"],
            history_context=history_context,
        )

        response = model.generate_content(prompt)
        raw = response.text.strip().lower().replace(" ", "_")

        if raw in ("nutritional_advice", "meal_plan_generation"):
            return {"intent": raw}

        # Default fallback
        return {"intent": "nutritional_advice"}

    except Exception as e:
        print(f"Intent classification failed, defaulting to nutritional_advice: {e}")
        return {"intent": "nutritional_advice"}


async def retrieve_nutrition_context(state: RouterState) -> dict:
    """Retrieve RAG context optimized for nutritional advice (heavy on guidelines)."""
    try:
        user_ctx = state.get("user_context")
        results = await rag_service.hybrid_search_async(
            query=state["message"],
            user_context=user_ctx,
            guidelines_top_k=5,
            dishes_top_k=3,
        )

        context_parts = []

        if results.get("guidelines"):
            context_parts.append("## Relevant Dietary Guidelines from Pakistani Health Authority:\n")
            for g in results["guidelines"]:
                context_parts.append(f"- {g['content']}\n")

        if results.get("dishes"):
            context_parts.append("\n## Relevant Pakistani Dishes:\n")
            for d in results["dishes"]:
                context_parts.append(
                    f"- {d['name']}: {d['calories']:.0f} kcal, "
                    f"{d['protein_g']:.1f}g protein, "
                    f"{d['carbs_g']:.1f}g carbs, "
                    f"{d['fat_g']:.1f}g fat\n"
                )

        return {"rag_context": "".join(context_parts)}

    except Exception as e:
        print(f"Nutrition context retrieval failed: {e}")
        return {"rag_context": ""}


async def retrieve_meal_plan_context(state: RouterState) -> dict:
    """Retrieve RAG context for meal plan generation using per-meal-slot queries."""
    import asyncio
    try:
        user_ctx = state.get("user_context")
        base_query = state["message"]

        # Append user memory to main meal slot queries so ChromaDB retrieves
        # dishes aligned with the user's stated preferences and favourites.
        # Breakfast and snacks are left unaffected (karahi at breakfast makes no sense).
        user_memory = state.get("user_memory", "")
        preference_suffix = f" user preferences: {user_memory[:300]}" if user_memory else ""

        # Use protein-rich queries when health goal is muscle building, but not if vegetarian/vegan
        health_goals = (user_ctx or {}).get("health_goals", [])
        if isinstance(health_goals, str):
            health_goals = [health_goals]
        dietary_restrictions = (user_ctx or {}).get("dietary_restrictions", [])
        if isinstance(dietary_restrictions, str):
            dietary_restrictions = [dietary_restrictions]
        is_muscle_goal = any("muscle" in g.lower() or "protein" in g.lower() for g in health_goals)
        is_vegetarian = any("vegetarian" in r.lower() or "vegan" in r.lower() for r in dietary_restrictions)
        use_meat_queries = is_muscle_goal and not is_vegetarian

        lunch_query = (
            f"chicken murgh meat gosht keema high protein lunch curry roti {base_query}{preference_suffix}"
            if use_meat_queries else
            f"simple everyday home cooked lunch daal sabzi roti chawal {base_query}{preference_suffix}"
        )
        dinner_query = (
            f"chicken murgh meat gosht fish high protein dinner curry {base_query}{preference_suffix}"
            if use_meat_queries else
            f"simple home dinner curry roti daal sabzi {base_query}{preference_suffix}"
        )

        # Four concurrent queries — one per meal slot for appropriate dish variety
        breakfast_r, lunch_r, dinner_r, snacks_r = await asyncio.gather(
            rag_service.hybrid_search_async(
                query=f"quick easy breakfast morning home dishes eggs paratha dahi {base_query}",
                user_context=user_ctx, guidelines_top_k=0, dishes_top_k=3,
            ),
            rag_service.hybrid_search_async(
                query=lunch_query,
                user_context=user_ctx, guidelines_top_k=0, dishes_top_k=4,
            ),
            rag_service.hybrid_search_async(
                query=dinner_query,
                user_context=user_ctx, guidelines_top_k=0, dishes_top_k=4,
            ),
            rag_service.hybrid_search_async(
                query=f"light snacks fruits dahi lassi roasted chana {base_query}",
                user_context=user_ctx, guidelines_top_k=1, dishes_top_k=2,
            ),
        )

        context_parts = []
        seen_dishes = set()  # track names across slots to prevent duplicates

        for slot, results in [
            ("Breakfast Options", breakfast_r),
            ("Lunch Options", lunch_r),
            ("Dinner Options", dinner_r),
            ("Snack Options", snacks_r),
        ]:
            dishes = results.get("dishes", [])
            unique_dishes = [
                d for d in dishes
                if d["name"].lower().strip() not in seen_dishes
            ]
            seen_dishes.update(d["name"].lower().strip() for d in unique_dishes)

            if unique_dishes:
                context_parts.append(f"\n## {slot}:\n")
                for d in unique_dishes:
                    context_parts.append(
                        f"- **{d['name']}**: {d['calories']:.0f} kcal | "
                        f"P: {d['protein_g']:.1f}g | "
                        f"C: {d['carbs_g']:.1f}g | "
                        f"F: {d['fat_g']:.1f}g\n"
                    )

        guidelines = snacks_r.get("guidelines", [])
        if guidelines:
            context_parts.append("\n## Key Dietary Guidelines:\n")
            for g in guidelines:
                context_parts.append(f"- {g['content']}\n")

        return {"rag_context": "".join(context_parts)}

    except Exception as e:
        print(f"Meal plan context retrieval failed: {e}")
        return {"rag_context": ""}


def generate_response(state: RouterState) -> dict:
    """Generate final response using intent-specific system prompt."""
    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        # Pick system prompt based on intent
        if state["intent"] == "meal_plan_generation":
            system_prompt = MEAL_PLAN_PROMPT
        else:
            system_prompt = NUTRITION_ADVICE_PROMPT

        prompt_parts = [system_prompt]

        # Add user context
        user_ctx = state.get("user_context")

        # DEBUG: log what user context was received
        print(f"[DEBUG] user_context received: {user_ctx}")

        if user_ctx:
            user_info_parts = []
            if user_ctx.get("health_goals"):
                goals = user_ctx["health_goals"]
                if isinstance(goals, list):
                    goals = ", ".join(goals)
                user_info_parts.append(f"Health Goals: {goals}")

            if user_ctx.get("dietary_restrictions"):
                restrictions = user_ctx["dietary_restrictions"]
                if isinstance(restrictions, list):
                    restrictions = ", ".join(restrictions)
                user_info_parts.append(f"Dietary Restrictions: {restrictions}")

            if user_ctx.get("daily_calorie_target"):
                user_info_parts.append(
                    f"Daily Calorie Target: {user_ctx['daily_calorie_target']} kcal"
                )

            if user_ctx.get("age"):
                user_info_parts.append(f"Age: {user_ctx['age']}")

            if user_ctx.get("gender"):
                user_info_parts.append(f"Gender: {user_ctx['gender']}")

            if user_ctx.get("weight_kg"):
                user_info_parts.append(f"Weight: {user_ctx['weight_kg']} kg")

            if user_ctx.get("height_cm"):
                user_info_parts.append(f"Height: {user_ctx['height_cm']} cm")

            if user_ctx.get("activity_level"):
                user_info_parts.append(f"Activity Level: {user_ctx['activity_level']}")

            if user_info_parts:
                print(f"[DEBUG] user profile being sent to LLM: {user_info_parts}")
                prompt_parts.append(f"\n## User Profile:\n" + "\n".join(user_info_parts))
            else:
                print("[DEBUG] user_context was present but all fields were empty/missing")
        else:
            print("[DEBUG] no user_context — LLM will respond without personalization")

        # Inject cross-session user memory (preference summary from past conversations)
        if state.get("user_memory"):
            print(f"[MEMORY] Injecting user memory into prompt: {state['user_memory'][:120]}{'...' if len(state['user_memory']) > 120 else ''}")
            prompt_parts.append(
                f"\n## User Memory (from past conversations):\n{state['user_memory']}\n"
                "(These are facts the user has stated before — use them to personalize advice.)"
            )
            # For meal plans, add an explicit hard-constraint block so the LLM
            # cannot ignore food dislikes even if retrieved dishes include them
            if state["intent"] == "meal_plan_generation":
                prompt_parts.append(
                    f"\n## Hard Constraints for Meal Plan (NON-NEGOTIABLE):\n"
                    f"{state['user_memory']}\n"
                    "Do NOT include any food the user has expressed dislike for, under any circumstances. "
                    "This overrides all other instructions."
                )
        else:
            print("[MEMORY] No user memory available for this request")

        # Add RAG context
        if state.get("rag_context"):
            prompt_parts.append(f"\n## Retrieved Context:\n{state['rag_context']}")

        # Add chat history
        chat_history = state.get("chat_history")
        if chat_history:
            prompt_parts.append("\n## Conversation History:")
            for msg in chat_history[-15:]:
                role = "User" if msg.get("role") == "user" else "SehatGuru"
                prompt_parts.append(f"{role}: {msg.get('content', '')}")

        # Add current message
        prompt_parts.append(f"\n## User Question:\n{state['message']}")

        prompt_parts.append(
            "\n## Instructions:\n"
            "Answer the user's question using the retrieved context above. "
            "Be specific with nutritional values when available."
        )

        full_prompt = "\n".join(prompt_parts)
        response = model.generate_content(full_prompt)

        if response.text:
            return {"response": response.text.strip()}
        else:
            return {"response": "I apologize, but I couldn't generate a response. Please try again."}

    except Exception as e:
        print(f"Response generation failed: {e}")
        return {"response": f"I apologize, but I encountered an error generating a response. Please try again."}


def validate_response(state: RouterState) -> dict:
    """Validate generated response using LLM self-check."""
    # ONLY validate nutritional_advice intent, skip for meal_plan_generation
    if state.get("intent") != "nutritional_advice":
        return {
            "validation_passed": True,
            "validation_scores": None,
        }

    if not state.get("validation_enabled", True):
        # Validation disabled, auto-pass
        return {
            "validation_passed": True,
            "validation_scores": {"safety": 1.0, "accuracy": 1.0, "personalization": 1.0, "cultural": 1.0},
        }

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        # Build user context summary
        user_ctx = state.get("user_context", {})
        ctx_summary = []
        if user_ctx.get("health_goals"):
            ctx_summary.append(f"Health Goals: {', '.join(user_ctx['health_goals'])}")
        if user_ctx.get("dietary_restrictions"):
            ctx_summary.append(f"Dietary Restrictions: {', '.join(user_ctx['dietary_restrictions'])}")
        if user_ctx.get("daily_calorie_target"):
            ctx_summary.append(f"Calorie Target: {user_ctx['daily_calorie_target']} kcal")
        if user_ctx.get("age"):
            ctx_summary.append(f"Age: {user_ctx['age']}")
        if user_ctx.get("gender"):
            ctx_summary.append(f"Gender: {user_ctx['gender']}")
        user_context_summary = "\n".join(ctx_summary) if ctx_summary else "No user context provided"

        # Build validation prompt
        prompt = VALIDATION_PROMPT.format(
            message=state["message"],
            user_context_summary=user_context_summary,
            rag_context=state.get("rag_context", "")[:2000],  # Limit context size
            response=state["response"],
        )

        # Call Gemini for validation
        validation_response = model.generate_content(prompt)
        response_text = validation_response.text.strip()

        # Parse JSON response
        import json
        # Extract JSON from response (handle markdown code blocks)
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        validation_data = json.loads(response_text)

        scores = {
            "safety": float(validation_data.get("safety_score", 0.0)),
            "accuracy": float(validation_data.get("accuracy_score", 0.0)),
            "personalization": float(validation_data.get("personalization_score", 0.0)),
            "cultural": float(validation_data.get("cultural_score", 0.0)),
        }

        reasoning = validation_data.get("reasoning", "")

        # Check thresholds
        passed = (
            scores["safety"] >= settings.VALIDATION_THRESHOLD_SAFETY and
            scores["accuracy"] >= settings.VALIDATION_THRESHOLD_ACCURACY and
            scores["personalization"] >= settings.VALIDATION_THRESHOLD_PERSONALIZATION and
            scores["cultural"] >= settings.VALIDATION_THRESHOLD_CULTURAL
        )

        return {
            "validation_scores": scores,
            "validation_passed": passed,
            "validation_reasoning": reasoning,
        }

    except Exception as e:
        print(f"Validation failed with error, auto-passing: {e}")
        # On validation error, auto-pass to avoid blocking responses
        return {
            "validation_passed": True,
            "validation_scores": {"safety": 1.0, "accuracy": 1.0, "personalization": 1.0, "cultural": 1.0},
            "validation_reasoning": f"Validation error: {str(e)}",
        }


def check_approval(state: RouterState) -> str:
    """Decide whether to approve response or regenerate."""
    if state.get("validation_passed", False):
        return "approved"

    # Check retry limit
    retry_count = state.get("retry_count", 0)
    if retry_count >= settings.VALIDATION_MAX_RETRIES:
        print(f"Max retries ({settings.VALIDATION_MAX_RETRIES}) reached, returning response with low confidence")
        return "max_retries_reached"

    return "retry"


def increment_retry(state: RouterState) -> dict:
    """Increment retry counter before regenerating response."""
    current_count = state.get("retry_count", 0)
    print(f"Validation failed (scores: {state.get('validation_scores')}), regenerating (attempt {current_count + 2}/{settings.VALIDATION_MAX_RETRIES + 1})")
    return {"retry_count": current_count + 1}


# --- Routing ---

def route_by_intent(state: RouterState) -> str:
    """Route to the correct retrieval node based on classified intent."""
    if state["intent"] == "meal_plan_generation":
        return "retrieve_meal_plan_context"
    return "retrieve_nutrition_context"


# --- Graph Construction ---

def build_intent_router() -> StateGraph:
    """Build and compile the LangGraph intent router."""
    graph = StateGraph(RouterState)

    # Add nodes
    graph.add_node("check_guard_rails", check_guard_rails)
    graph.add_node("classify_intent", classify_intent)
    graph.add_node("retrieve_nutrition_context", retrieve_nutrition_context)
    graph.add_node("retrieve_meal_plan_context", retrieve_meal_plan_context)
    graph.add_node("generate_response", generate_response)
    graph.add_node("validate_response", validate_response)
    graph.add_node("increment_retry", increment_retry)

    # Entry point: guard rails first
    graph.set_entry_point("check_guard_rails")

    # Guard rail gate: ok → classify_intent, blocked → END (canned response already set)
    graph.add_conditional_edges(
        "check_guard_rails",
        route_after_guard,
        {
            "ok": "classify_intent",
            "blocked": END,
        },
    )

    # Conditional edge: classify_intent -> retrieval node
    graph.add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {
            "retrieve_nutrition_context": "retrieve_nutrition_context",
            "retrieve_meal_plan_context": "retrieve_meal_plan_context",
        },
    )

    # Both retrieval nodes -> generate_response
    graph.add_edge("retrieve_nutrition_context", "generate_response")
    graph.add_edge("retrieve_meal_plan_context", "generate_response")

    # NEW VALIDATION FLOW
    graph.add_edge("generate_response", "validate_response")
    graph.add_conditional_edges(
        "validate_response",
        check_approval,
        {
            "approved": END,
            "retry": "increment_retry",
            "max_retries_reached": END,
        }
    )
    graph.add_edge("increment_retry", "generate_response")  # Loop back

    return graph.compile()


# Compile once at module load
intent_router = build_intent_router()


# --- Public API ---

async def route_and_respond(
    message: str,
    user_context: Optional[Dict[str, Any]] = None,
    chat_history: Optional[List[Dict[str, str]]] = None,
    use_rag: bool = True,
    use_validation: bool = True,
    user_memory: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Route a user message through the intent router and return a response.

    Args:
        message: User's message/question
        user_context: Optional user profile (health goals, restrictions, etc.)
        chat_history: Optional conversation history
        use_rag: Whether to use RAG context
        use_validation: Whether to enable response validation (default True)

    Returns:
        Dict with keys: response, intent, rag_used, validation_scores, validation_passed, retry_count
    """
    initial_state: RouterState = {
        "message": message,
        "user_context": user_context,
        "chat_history": chat_history,
        "use_rag": use_rag,
        "intent": "",
        "rag_context": "",
        "response": "",
        "user_memory": user_memory,
        "guard_result": "ok",
        # VALIDATION FIELDS
        "validation_enabled": use_validation and settings.ENABLE_RESPONSE_VALIDATION,
        "retry_count": 0,
        "validation_scores": None,
        "validation_passed": False,
        "validation_reasoning": None,
    }

    result = await intent_router.ainvoke(initial_state, {"recursion_limit": 20})

    return {
        "response": result["response"],
        "intent": result.get("intent", ""),
        "rag_used": use_rag,
        "guard_result": result.get("guard_result", "ok"),
        "validation_scores": result.get("validation_scores"),
        "validation_passed": result.get("validation_passed", True),
        "retry_count": result.get("retry_count", 0),
    }
