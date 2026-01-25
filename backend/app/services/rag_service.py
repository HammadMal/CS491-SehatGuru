from typing import List, Dict, Any, Optional
from app.config.settings import settings
from app.services.vector_store import vector_store
from app.models.rag import (
    RAGQueryRequest,
    RAGQueryResponse,
    KnowledgeBaseResult,
    DishResult
)


class RAGService:
    """Main RAG service for retrieval operations"""

    def __init__(self):
        """Initialize RAG service with vector store"""
        self.vector_store = vector_store
        self.knowledge_base_collection = settings.RAG_COLLECTION_KNOWLEDGE_BASE
        self.dishes_collection = settings.RAG_COLLECTION_DISHES
        self.default_top_k = settings.RAG_TOP_K

    def retrieve_dietary_guidelines(
        self,
        query: str,
        top_k: int = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[KnowledgeBaseResult]:
        """
        Retrieve relevant dietary guidelines from the knowledge base.

        Args:
            query: Search query (e.g., "What should a diabetic person eat?")
            top_k: Number of results to return
            filters: Optional metadata filters (e.g., {"section": "Guidelines"})

        Returns:
            List of KnowledgeBaseResult objects
        """
        top_k = top_k or self.default_top_k

        results = self.vector_store.query(
            collection_name=self.knowledge_base_collection,
            query=query,
            top_k=top_k,
            where=filters
        )

        return [
            KnowledgeBaseResult(
                content=r['content'],
                source_file=r['metadata'].get('source_file', 'Unknown'),
                page_number=r['metadata'].get('page_number'),
                section=r['metadata'].get('section'),
                relevance_score=r['similarity_score']
            )
            for r in results
        ]

    async def retrieve_dietary_guidelines_async(
        self,
        query: str,
        top_k: int = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[KnowledgeBaseResult]:
        """Async version of retrieve_dietary_guidelines"""
        top_k = top_k or self.default_top_k

        results = await self.vector_store.query_async(
            collection_name=self.knowledge_base_collection,
            query=query,
            top_k=top_k,
            where=filters
        )

        return [
            KnowledgeBaseResult(
                content=r['content'],
                source_file=r['metadata'].get('source_file', 'Unknown'),
                page_number=r['metadata'].get('page_number'),
                section=r['metadata'].get('section'),
                relevance_score=r['similarity_score']
            )
            for r in results
        ]

    def retrieve_dishes(
        self,
        query: str,
        top_k: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[DishResult]:
        """
        Retrieve relevant dishes from the dishes database.

        Args:
            query: Search query (e.g., "high protein Pakistani dishes")
            top_k: Number of results to return
            filters: Optional metadata filters (e.g., {"meal_type": "lunch"})

        Returns:
            List of DishResult objects
        """
        results = self.vector_store.query(
            collection_name=self.dishes_collection,
            query=query,
            top_k=top_k,
            where=filters
        )

        return [
            DishResult(
                dish_id=r['metadata'].get('dish_id', r['id']),
                name=r['metadata'].get('name', 'Unknown'),
                calories=float(r['metadata'].get('calories', 0)),
                protein_g=float(r['metadata'].get('protein_g', 0)),
                carbs_g=float(r['metadata'].get('carbs_g', 0)),
                fat_g=float(r['metadata'].get('fat_g', 0)),
                relevance_score=r['similarity_score'],
                metadata=r['metadata']
            )
            for r in results
        ]

    async def retrieve_dishes_async(
        self,
        query: str,
        top_k: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[DishResult]:
        """Async version of retrieve_dishes"""
        results = await self.vector_store.query_async(
            collection_name=self.dishes_collection,
            query=query,
            top_k=top_k,
            where=filters
        )

        return [
            DishResult(
                dish_id=r['metadata'].get('dish_id', r['id']),
                name=r['metadata'].get('name', 'Unknown'),
                calories=float(r['metadata'].get('calories', 0)),
                protein_g=float(r['metadata'].get('protein_g', 0)),
                carbs_g=float(r['metadata'].get('carbs_g', 0)),
                fat_g=float(r['metadata'].get('fat_g', 0)),
                relevance_score=r['similarity_score'],
                metadata=r['metadata']
            )
            for r in results
        ]

    def hybrid_search(
        self,
        query: str,
        user_context: Optional[Dict[str, Any]] = None,
        guidelines_top_k: int = 3,
        dishes_top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Perform hybrid search across both knowledge base and dishes.
        Useful for generating meal recommendations with nutritional guidance.

        Args:
            query: Search query
            user_context: Optional user context (e.g., {"dietary_restrictions": ["diabetic"]})
            guidelines_top_k: Number of guideline results
            dishes_top_k: Number of dish results

        Returns:
            Dictionary with guidelines and dishes results
        """
        # Build query with user context
        enhanced_query = query
        if user_context:
            context_parts = []
            if user_context.get('dietary_restrictions'):
                context_parts.append(
                    f"for someone with {', '.join(user_context['dietary_restrictions'])}"
                )
            if user_context.get('health_goals'):
                context_parts.append(
                    f"to achieve {', '.join(user_context['health_goals'])}"
                )
            if user_context.get('calorie_target'):
                context_parts.append(
                    f"with target calories around {user_context['calorie_target']} kcal"
                )

            if context_parts:
                enhanced_query = f"{query} {' '.join(context_parts)}"

        # Retrieve from both collections
        guidelines = self.retrieve_dietary_guidelines(
            enhanced_query,
            top_k=guidelines_top_k
        )
        dishes = self.retrieve_dishes(
            enhanced_query,
            top_k=dishes_top_k
        )

        return {
            "query": query,
            "enhanced_query": enhanced_query,
            "user_context": user_context,
            "guidelines": [
                {
                    "content": g.content,
                    "source": g.source_file,
                    "section": g.section,
                    "relevance": g.relevance_score
                }
                for g in guidelines
            ],
            "dishes": [
                {
                    "name": d.name,
                    "calories": d.calories,
                    "protein_g": d.protein_g,
                    "carbs_g": d.carbs_g,
                    "fat_g": d.fat_g,
                    "relevance": d.relevance_score
                }
                for d in dishes
            ]
        }

    async def hybrid_search_async(
        self,
        query: str,
        user_context: Optional[Dict[str, Any]] = None,
        guidelines_top_k: int = 3,
        dishes_top_k: int = 5
    ) -> Dict[str, Any]:
        """Async version of hybrid_search"""
        import asyncio

        # Build enhanced query
        enhanced_query = query
        if user_context:
            context_parts = []
            if user_context.get('dietary_restrictions'):
                context_parts.append(
                    f"for someone with {', '.join(user_context['dietary_restrictions'])}"
                )
            if user_context.get('health_goals'):
                context_parts.append(
                    f"to achieve {', '.join(user_context['health_goals'])}"
                )
            if context_parts:
                enhanced_query = f"{query} {' '.join(context_parts)}"

        # Run both retrievals concurrently
        guidelines_task = self.retrieve_dietary_guidelines_async(
            enhanced_query,
            top_k=guidelines_top_k
        )
        dishes_task = self.retrieve_dishes_async(
            enhanced_query,
            top_k=dishes_top_k
        )

        guidelines, dishes = await asyncio.gather(guidelines_task, dishes_task)

        return {
            "query": query,
            "enhanced_query": enhanced_query,
            "user_context": user_context,
            "guidelines": [
                {
                    "content": g.content,
                    "source": g.source_file,
                    "section": g.section,
                    "relevance": g.relevance_score
                }
                for g in guidelines
            ],
            "dishes": [
                {
                    "name": d.name,
                    "calories": d.calories,
                    "protein_g": d.protein_g,
                    "carbs_g": d.carbs_g,
                    "fat_g": d.fat_g,
                    "relevance": d.relevance_score
                }
                for d in dishes
            ]
        }

    def query(self, request: RAGQueryRequest) -> RAGQueryResponse:
        """
        General query method that routes to appropriate retrieval.

        Args:
            request: RAGQueryRequest object

        Returns:
            RAGQueryResponse object
        """
        if request.collection == "knowledge_base":
            results = self.retrieve_dietary_guidelines(
                request.query,
                top_k=request.top_k,
                filters=request.filters
            )
            formatted_results = [
                {
                    "content": r.content,
                    "source_file": r.source_file,
                    "page_number": r.page_number,
                    "section": r.section,
                    "relevance_score": r.relevance_score
                }
                for r in results
            ]
        elif request.collection == "dishes":
            results = self.retrieve_dishes(
                request.query,
                top_k=request.top_k,
                filters=request.filters
            )
            formatted_results = [
                {
                    "dish_id": r.dish_id,
                    "name": r.name,
                    "calories": r.calories,
                    "protein_g": r.protein_g,
                    "carbs_g": r.carbs_g,
                    "fat_g": r.fat_g,
                    "relevance_score": r.relevance_score
                }
                for r in results
            ]
        else:
            raise ValueError(f"Unknown collection: {request.collection}")

        return RAGQueryResponse(
            results=formatted_results,
            query=request.query,
            collection=request.collection,
            total_results=len(formatted_results)
        )

    def get_context_for_llm(
        self,
        query: str,
        max_context_length: int = 4000
    ) -> str:
        """
        Get formatted context string for LLM prompting.

        Args:
            query: User's question
            max_context_length: Maximum characters for context

        Returns:
            Formatted context string
        """
        guidelines = self.retrieve_dietary_guidelines(query, top_k=3)
        dishes = self.retrieve_dishes(query, top_k=5)

        context_parts = []

        # Add guidelines context
        if guidelines:
            context_parts.append("## Relevant Dietary Guidelines from Pakistani Health Authority:\n")
            for g in guidelines:
                if len('\n'.join(context_parts)) < max_context_length * 0.6:
                    context_parts.append(f"- {g.content}\n")

        # Add dishes context
        if dishes:
            context_parts.append("\n## Relevant Pakistani Dishes:\n")
            for d in dishes:
                if len('\n'.join(context_parts)) < max_context_length:
                    dish_info = (
                        f"- {d.name}: {d.calories:.0f} kcal, "
                        f"{d.protein_g:.1f}g protein, "
                        f"{d.carbs_g:.1f}g carbs, "
                        f"{d.fat_g:.1f}g fat\n"
                    )
                    context_parts.append(dish_info)

        return ''.join(context_parts)

    def get_status(self) -> Dict[str, Any]:
        """Get status of RAG collections"""
        kb_info = self.vector_store.get_collection_info(self.knowledge_base_collection)
        dishes_info = self.vector_store.get_collection_info(self.dishes_collection)

        return {
            "knowledge_base": kb_info,
            "dishes": dishes_info,
            "ready": kb_info.get('count', 0) > 0 or dishes_info.get('count', 0) > 0
        }


# Create singleton instance
rag_service = RAGService()


if __name__ == "__main__":
    print("RAG Service Status:")
    print("=" * 50)
    status = rag_service.get_status()
    print(f"Knowledge Base: {status['knowledge_base']}")
    print(f"Dishes: {status['dishes']}")
    print(f"Ready: {status['ready']}")
