import google.generativeai as genai
from typing import Optional, Dict, Any
from app.config.settings import settings
from app.services.rag_service import rag_service


class GeminiService:
    """Service for interacting with Google's Gemini AI with RAG integration"""

    def __init__(self):
        """Initialize Gemini client with API key from settings"""
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)

        # Pakistan-specific nutrition assistant prompt
        self.system_prompt = """You are SehatGuru, an AI nutritionist specializing in Pakistani cuisine and dietary guidelines.

Your expertise includes:
- Pakistani Food Based Dietary Guidelines (FBDG)
- Nutritional information for Pakistani dishes
- Meal planning with traditional Pakistani foods
- Serving sizes in Pakistani measurements (roti, katori, cup, etc.)

Guidelines for responses:
1. Use the provided context from Pakistani Dietary Guidelines when available
2. Recommend Pakistani dishes when suggesting meals
3. Provide calorie and macro information from the database
4. Consider user's health goals (weight loss, diabetes management, heart health, etc.)
5. Give practical advice suited to Pakistani lifestyle and food availability
6. Use Urdu food names alongside English when helpful (e.g., "dal (lentils)", "roti (flatbread)")
7. Be culturally sensitive and aware of local eating patterns

Keep responses concise, actionable, and grounded in the provided context."""

    def _build_rag_prompt(
        self,
        message: str,
        rag_context: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Build the full prompt with RAG context and user information.

        Args:
            message: User's message/question
            rag_context: Retrieved context from RAG
            user_context: Optional user profile information

        Returns:
            Full prompt string for Gemini
        """
        prompt_parts = [self.system_prompt]

        # Add user context if available
        if user_context:
            user_info_parts = []
            if user_context.get('health_goals'):
                goals = user_context['health_goals']
                if isinstance(goals, list):
                    goals = ', '.join(goals)
                user_info_parts.append(f"Health Goals: {goals}")

            if user_context.get('dietary_restrictions'):
                restrictions = user_context['dietary_restrictions']
                if isinstance(restrictions, list):
                    restrictions = ', '.join(restrictions)
                user_info_parts.append(f"Dietary Restrictions: {restrictions}")

            if user_context.get('daily_calorie_target'):
                user_info_parts.append(
                    f"Daily Calorie Target: {user_context['daily_calorie_target']} kcal"
                )

            if user_context.get('age'):
                user_info_parts.append(f"Age: {user_context['age']}")

            if user_context.get('gender'):
                user_info_parts.append(f"Gender: {user_context['gender']}")

            if user_info_parts:
                prompt_parts.append(f"\n## User Profile:\n{chr(10).join(user_info_parts)}")

        # Add RAG context
        if rag_context:
            prompt_parts.append(f"\n## Retrieved Context:\n{rag_context}")

        # Add the user's question
        prompt_parts.append(f"\n## User Question:\n{message}")

        # Add response instruction
        prompt_parts.append(
            "\n## Instructions:\n"
            "Answer the user's question using the retrieved context above. "
            "If the context doesn't contain relevant information, use your general knowledge "
            "but prefer Pakistani dietary recommendations. Be specific with nutritional values when available."
        )

        return "\n".join(prompt_parts)

    async def generate_chat_response(
        self,
        message: str,
        user_context: Optional[Dict[str, Any]] = None,
        use_rag: bool = True
    ) -> str:
        """
        Generate a chat response using Gemini AI with RAG context.

        Args:
            message: User's message/question
            user_context: Optional user profile (health goals, restrictions, etc.)
            use_rag: Whether to retrieve RAG context (default True)

        Returns:
            Bot's response text

        Raises:
            Exception: If API call fails
        """
        try:
            # Get RAG context if enabled
            rag_context = ""
            if use_rag:
                try:
                    rag_context = rag_service.get_context_for_llm(message)
                except Exception as e:
                    print(f"Warning: RAG retrieval failed, proceeding without context: {e}")

            # Build full prompt with RAG context
            full_prompt = self._build_rag_prompt(message, rag_context, user_context)

            # Generate response
            response = self.model.generate_content(full_prompt)

            # Extract text from response
            if response.text:
                return response.text.strip()
            else:
                return "I apologize, but I couldn't generate a response. Please try again."

        except Exception as e:
            print(f"Error generating Gemini response: {str(e)}")
            raise Exception(f"Failed to generate response: {str(e)}")

    async def generate_chat_response_with_history(
        self,
        message: str,
        chat_history: list = None,
        user_context: Optional[Dict[str, Any]] = None,
        use_rag: bool = True
    ) -> str:
        """
        Generate a chat response with conversation history.

        Args:
            message: User's current message
            chat_history: List of previous messages [{"role": "user/assistant", "content": "..."}]
            user_context: Optional user profile
            use_rag: Whether to use RAG

        Returns:
            Bot's response text
        """
        try:
            # Get RAG context
            rag_context = ""
            if use_rag:
                try:
                    rag_context = rag_service.get_context_for_llm(message)
                except Exception as e:
                    print(f"Warning: RAG retrieval failed: {e}")

            # Build prompt with history
            prompt_parts = [self.system_prompt]

            # Add user context
            if user_context:
                user_info = []
                if user_context.get('health_goals'):
                    user_info.append(f"Health Goals: {user_context['health_goals']}")
                if user_context.get('dietary_restrictions'):
                    user_info.append(f"Dietary Restrictions: {user_context['dietary_restrictions']}")
                if user_info:
                    prompt_parts.append(f"\n## User Profile:\n{chr(10).join(user_info)}")

            # Add RAG context
            if rag_context:
                prompt_parts.append(f"\n## Retrieved Context:\n{rag_context}")

            # Add conversation history
            if chat_history:
                prompt_parts.append("\n## Conversation History:")
                for msg in chat_history[-5:]:  # Last 5 messages for context
                    role = "User" if msg.get('role') == 'user' else "SehatGuru"
                    prompt_parts.append(f"{role}: {msg.get('content', '')}")

            # Add current message
            prompt_parts.append(f"\nUser: {message}\n\nSehatGuru:")

            full_prompt = "\n".join(prompt_parts)

            # Generate response
            response = self.model.generate_content(full_prompt)

            if response.text:
                return response.text.strip()
            else:
                return "I apologize, but I couldn't generate a response. Please try again."

        except Exception as e:
            print(f"Error generating Gemini response: {str(e)}")
            raise Exception(f"Failed to generate response: {str(e)}")


# Create singleton instance
gemini_service = GeminiService()
