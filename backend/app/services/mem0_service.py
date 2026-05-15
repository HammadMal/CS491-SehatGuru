"""Mem0 OSS in-process memory service for SehatGuru."""
import asyncio
import logging
from functools import partial
from mem0 import Memory
from app.config.settings import settings

logger = logging.getLogger(__name__)


class Mem0Service:
    """Singleton wrapper around Mem0 OSS Memory, using existing ChromaDB + Gemini backends."""

    def __init__(self):
        config = {
            "vector_store": {
                "provider": "chroma",
                "config": {
                    "collection_name": settings.MEM0_COLLECTION_NAME,
                    "path": settings.MEM0_CHROMA_DIR,
                },
            },
            "llm": {
                "provider": "gemini",
                "config": {
                    "model": settings.GEMINI_MODEL,
                    "api_key": settings.GEMINI_API_KEY,
                },
            },
            "embedder": {
                "provider": "gemini",
                "config": {
                    "model": settings.EMBEDDING_MODEL,
                    "api_key": settings.GEMINI_API_KEY,
                },
            },
        }
        self._memory = Memory.from_config(config)
        logger.info("[MEM0] Mem0Service initialised with collection=%s", settings.MEM0_COLLECTION_NAME)

    async def add_turn(self, user_id: str, user_message: str, bot_response: str) -> None:
        """Extract and store facts from the user's message only.
        Bot response is intentionally excluded — Mem0 would otherwise extract
        facts from generated content (e.g. meal plans) and attribute them to the user.
        """
        messages = [
            {"role": "user", "content": user_message},
        ]
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                partial(self._memory.add, messages, user_id=user_id),
            )
            logger.info("[MEM0] add_turn completed for user=%s", user_id)
        except Exception as e:
            logger.warning("[MEM0] add_turn failed for user=%s: %s", user_id, e)

    async def search(self, user_id: str, query: str, limit: int = 5) -> list:
        """Search stored facts for a user. Returns [] on error."""
        try:
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None,
                partial(self._memory.search, query, user_id=user_id, limit=limit),
            )
            if isinstance(results, dict):
                results = results.get("results", [])
            logger.info("[MEM0] search returned %d results for user=%s", len(results), user_id)
            return results
        except Exception as e:
            logger.warning("[MEM0] search failed for user=%s: %s", user_id, e)
            return []

    async def delete_all(self, user_id: str) -> None:
        """Delete all stored memories for a user (called on account deletion)."""
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                partial(self._memory.delete_all, user_id=user_id),
            )
            logger.info("[MEM0] All memories deleted for user=%s", user_id)
        except Exception as e:
            logger.warning("[MEM0] delete_all failed for user=%s: %s", user_id, e)

    @staticmethod
    def format_for_prompt(memories: list) -> str:
        """Convert Mem0 search results to a bullet-point string for prompt injection.

        Returns "" (empty string) when memories is empty or no valid memory keys found.
        An empty string is falsy — generate_response() will skip the memory block.
        """
        if not memories:
            return ""
        lines = []
        for m in memories:
            if isinstance(m, str):
                text = m
            elif isinstance(m, dict):
                text = m.get("memory") or m.get("text") or m.get("content")
            else:
                text = None
            if text:
                lines.append(f"- {text}")
        return "\n".join(lines)


# Singleton instance
mem0_service = Mem0Service()
