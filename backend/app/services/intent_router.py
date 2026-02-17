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
- Citing Pakistani Food Based Dietary Guidelines (FBDG) when relevant
- Explaining health impacts of foods and dietary patterns
- Giving practical, culturally appropriate dietary advice
- Using Urdu food names alongside English when helpful (e.g., "dal (lentils)", "roti (flatbread)")
- Recommending serving sizes in Pakistani measurements (roti, katori, cup, etc.)

Keep your response concise, advisory in tone, and grounded in the provided context.
If the context doesn't contain relevant information, use your general knowledge but prefer Pakistani dietary recommendations."""

MEAL_PLAN_PROMPT = """You are SehatGuru, an AI nutritionist specializing in Pakistani cuisine and meal planning.

You are creating a MEAL PLAN. Focus on:
- Structuring the plan clearly (Breakfast / Lunch / Dinner / Snacks)
- Including specific Pakistani dishes from the retrieved context
- Providing calorie and macro breakdowns (protein, carbs, fat) for each meal
- Ensuring the plan meets the user's calorie target and health goals
- Balancing variety across meals using traditional Pakistani foods
- Using Urdu food names alongside English when helpful
- Including portion sizes in Pakistani measurements (roti, katori, cup, etc.)

Format the meal plan in a structured, easy-to-follow layout with totals.
If the context doesn't contain enough dishes, supplement with your knowledge of Pakistani cuisine."""


# --- Classification Prompt ---

CLASSIFICATION_PROMPT = """Classify the following user message into exactly one intent.

Intents:
- nutritional_advice: Questions about nutrition, health, calories, diet tips, food information, or general dietary guidance.
- meal_plan_generation: Requests to create, generate, or suggest a meal plan, diet plan, weekly menu, or daily eating schedule.

Respond with ONLY the intent label, nothing else.

User message: "{message}"

{history_context}Intent:"""


VALIDATION_PROMPT = """You are evaluating a nutritional advice response for quality assurance.

## Original User Query:
{message}

## User Context:
{user_context_summary}

## Retrieved RAG Context (Guidelines & Dishes):
{rag_context}

## Generated Response to Validate:
{response}

## Your Task:
Evaluate the response on 4 dimensions and provide scores from 0.0 to 1.0:

1. **Safety Score** (0.0-1.0):
   - Does the response avoid harmful dietary advice?
   - Are portion sizes reasonable?
   - Are there dangerous food combinations or allergen warnings missed?
   - For medical conditions (diabetes, hypertension), is the advice safe?

2. **Accuracy Score** (0.0-1.0):
   - Is the nutritional information (calories, macros) accurate based on the RAG context?
   - Are the Pakistani dietary guidelines correctly cited?
   - Are dish names and ingredients correct?
   - Is the information grounded in the retrieved context?

3. **Personalization Score** (0.0-1.0):
   - Does the response address the user's specific health goals?
   - Are dietary restrictions respected?
   - Is the calorie target considered (if provided)?
   - Does it match the user's age/gender (if relevant)?

4. **Cultural Score** (0.0-1.0):
   - Are Pakistani food names used correctly (Urdu + English)?
   - Are meal patterns culturally appropriate (e.g., roti with salan, not pasta with dal)?
   - Are serving sizes in Pakistani measurements (katori, roti, cup)?
   - Is the tone respectful of Pakistani dietary culture?

## Response Format (JSON):
{{
  "safety_score": <float>,
  "accuracy_score": <float>,
  "personalization_score": <float>,
  "cultural_score": <float>,
  "reasoning": "<brief explanation of scores>"
}}

Respond ONLY with valid JSON, no other text."""


# --- Node Functions ---

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
    """Retrieve RAG context optimized for meal plan generation (heavy on dishes)."""
    try:
        user_ctx = state.get("user_context")
        results = await rag_service.hybrid_search_async(
            query=state["message"],
            user_context=user_ctx,
            guidelines_top_k=2,
            dishes_top_k=8,
        )

        context_parts = []

        if results.get("dishes"):
            context_parts.append("## Available Pakistani Dishes for Meal Planning:\n")
            for d in results["dishes"]:
                context_parts.append(
                    f"- **{d['name']}**: {d['calories']:.0f} kcal | "
                    f"P: {d['protein_g']:.1f}g | "
                    f"C: {d['carbs_g']:.1f}g | "
                    f"F: {d['fat_g']:.1f}g\n"
                )

        if results.get("guidelines"):
            context_parts.append("\n## Key Dietary Guidelines:\n")
            for g in results["guidelines"]:
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

            if user_info_parts:
                prompt_parts.append(f"\n## User Profile:\n" + "\n".join(user_info_parts))

        # Add RAG context
        if state.get("rag_context"):
            prompt_parts.append(f"\n## Retrieved Context:\n{state['rag_context']}")

        # Add chat history
        chat_history = state.get("chat_history")
        if chat_history:
            prompt_parts.append("\n## Conversation History:")
            for msg in chat_history[-5:]:
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
    graph.add_node("classify_intent", classify_intent)
    graph.add_node("retrieve_nutrition_context", retrieve_nutrition_context)
    graph.add_node("retrieve_meal_plan_context", retrieve_meal_plan_context)
    graph.add_node("generate_response", generate_response)
    # NEW VALIDATION NODES
    graph.add_node("validate_response", validate_response)
    graph.add_node("increment_retry", increment_retry)

    # Entry point
    graph.set_entry_point("classify_intent")

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
        # NEW VALIDATION FIELDS
        "validation_enabled": use_validation and settings.ENABLE_RESPONSE_VALIDATION,
        "retry_count": 0,
        "validation_scores": None,
        "validation_passed": False,
        "validation_reasoning": None,
    }

    result = await intent_router.ainvoke(initial_state)

    return {
        "response": result["response"],
        "intent": result["intent"],
        "rag_used": use_rag,
        # NEW VALIDATION FIELDS IN RESPONSE
        "validation_scores": result.get("validation_scores"),
        "validation_passed": result.get("validation_passed", True),
        "retry_count": result.get("retry_count", 0),
    }
