import asyncio
from typing import List, Optional
import google.generativeai as genai
from app.config.settings import settings


class EmbeddingService:
    """Generate embeddings using Google's Gemini embedding model"""

    def __init__(self):
        """Initialize the embedding service with Gemini API"""
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = settings.EMBEDDING_MODEL
        self._batch_size = 100  # Max texts per batch

    def embed_text(self, text: str, task_type: str = "retrieval_document") -> List[float]:
        """
        Generate embedding for a single text.

        Args:
            text: The text to embed
            task_type: The type of task for embedding optimization
                      - "retrieval_document": For documents to be retrieved
                      - "retrieval_query": For search queries
                      - "semantic_similarity": For comparing text similarity
                      - "classification": For text classification
                      - "clustering": For clustering similar texts

        Returns:
            List of floats representing the embedding vector
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        # Truncate very long texts (Gemini has input limits)
        max_chars = 10000
        if len(text) > max_chars:
            text = text[:max_chars]

        result = genai.embed_content(
            model=self.model,
            content=text,
            task_type=task_type
        )

        return result['embedding']

    def embed_batch(
        self,
        texts: List[str],
        task_type: str = "retrieval_document"
    ) -> List[List[float]]:
        """
        Generate embeddings for a batch of texts.

        Args:
            texts: List of texts to embed
            task_type: The type of task for embedding optimization

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        embeddings = []

        # Process in batches
        for i in range(0, len(texts), self._batch_size):
            batch = texts[i:i + self._batch_size]

            # Filter empty texts and track indices
            valid_texts = []
            valid_indices = []
            for j, text in enumerate(batch):
                if text and text.strip():
                    # Truncate long texts
                    max_chars = 10000
                    if len(text) > max_chars:
                        text = text[:max_chars]
                    valid_texts.append(text)
                    valid_indices.append(j)

            if not valid_texts:
                # Add None placeholders for empty batch
                embeddings.extend([None] * len(batch))
                continue

            # Embed batch
            result = genai.embed_content(
                model=self.model,
                content=valid_texts,
                task_type=task_type
            )

            # Reconstruct results with None for empty texts
            batch_embeddings = [None] * len(batch)
            for idx, embedding in zip(valid_indices, result['embedding']):
                batch_embeddings[idx] = embedding

            embeddings.extend(batch_embeddings)

        return embeddings

    async def embed_text_async(
        self,
        text: str,
        task_type: str = "retrieval_document"
    ) -> List[float]:
        """
        Async wrapper for embed_text.

        Args:
            text: The text to embed
            task_type: The type of task for embedding optimization

        Returns:
            List of floats representing the embedding vector
        """
        # Run sync method in executor
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self.embed_text(text, task_type)
        )

    async def embed_batch_async(
        self,
        texts: List[str],
        task_type: str = "retrieval_document"
    ) -> List[List[float]]:
        """
        Async wrapper for embed_batch.

        Args:
            texts: List of texts to embed
            task_type: The type of task for embedding optimization

        Returns:
            List of embedding vectors
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self.embed_batch(texts, task_type)
        )

    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a search query.
        Uses retrieval_query task type for optimal search performance.

        Args:
            query: The search query

        Returns:
            Embedding vector optimized for query matching
        """
        return self.embed_text(query, task_type="retrieval_query")

    async def embed_query_async(self, query: str) -> List[float]:
        """
        Async version of embed_query.

        Args:
            query: The search query

        Returns:
            Embedding vector optimized for query matching
        """
        return await self.embed_text_async(query, task_type="retrieval_query")

    def get_embedding_dimension(self) -> int:
        """
        Get the dimension of the embedding vectors.

        Returns:
            The number of dimensions in the embedding vector (768 for Gemini)
        """
        # Gemini embedding-001 produces 768-dimensional vectors
        return 768

    def test(self):
        """Test embedding generation"""
        print("Embedding Service Test")
        print("=" * 50)

        test_texts = [
            "Biryani is a popular Pakistani rice dish with spices and meat.",
            "A diabetic person should eat foods low in sugar and high in fiber.",
            "The recommended daily calorie intake for adults is 2000-2500 kcal."
        ]

        for text in test_texts:
            print(f"\nText: {text[:50]}...")
            try:
                embedding = self.embed_text(text)
                print(f"  Embedding dimension: {len(embedding)}")
                print(f"  First 5 values: {embedding[:5]}")
            except Exception as e:
                print(f"  Error: {e}")

        # Test query embedding
        print("\n\nQuery Embedding Test:")
        query = "What foods are good for diabetes?"
        try:
            embedding = self.embed_query(query)
            print(f"Query: {query}")
            print(f"Embedding dimension: {len(embedding)}")
        except Exception as e:
            print(f"Error: {e}")


# Create singleton instance
embedding_service = EmbeddingService()


if __name__ == "__main__":
    embedding_service.test()
