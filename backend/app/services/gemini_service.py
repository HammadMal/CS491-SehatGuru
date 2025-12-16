import google.generativeai as genai
from app.config.settings import settings


class GeminiService:
    """Service for interacting with Google's Gemini AI"""

    def __init__(self):
        """Initialize Gemini client with API key from settings"""
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        self.system_prompt = (
            "You are a helpful fitness and nutrition assistant. "
            "Provide accurate, helpful advice about exercise, nutrition, "
            "meal planning, and healthy lifestyle choices. "
            "Keep responses concise and actionable."
        )

    async def generate_chat_response(self, message: str) -> str:
        """
        Generate a chat response using Gemini AI

        Args:
            message: User's message/question

        Returns:
            Bot's response text

        Raises:
            Exception: If API call fails
        """
        try:
            # Combine system prompt with user message
            full_prompt = f"{self.system_prompt}\n\nUser: {message}\n\nAssistant:"

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


# Create singleton instance
gemini_service = GeminiService()
