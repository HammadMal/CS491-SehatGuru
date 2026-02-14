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

    # generate_response -> END
    graph.add_edge("generate_response", END)

    return graph.compile()


# Compile once at module load
intent_router = build_intent_router()


# --- Public API ---

async def route_and_respond(
    message: str,
    user_context: Optional[Dict[str, Any]] = None,
    chat_history: Optional[List[Dict[str, str]]] = None,
    use_rag: bool = True,
) -> Dict[str, Any]:
    """
    Route a user message through the intent router and return a response.

    Args:
        message: User's message/question
        user_context: Optional user profile (health goals, restrictions, etc.)
        chat_history: Optional conversation history
        use_rag: Whether to use RAG context

    Returns:
        Dict with keys: response, intent, rag_used
    """
    initial_state: RouterState = {
        "message": message,
        "user_context": user_context,
        "chat_history": chat_history,
        "use_rag": use_rag,
        "intent": "",
        "rag_context": "",
        "response": "",
    }

    result = await intent_router.ainvoke(initial_state)

    return {
        "response": result["response"],
        "intent": result["intent"],
        "rag_used": use_rag,
    }
