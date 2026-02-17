import os
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.config.settings import settings
from app.models.rag import DocumentChunk
from app.services.embedding_service import embedding_service


class VectorStoreService:
    """Manage ChromaDB collections for RAG"""

    def __init__(self):
        """Initialize ChromaDB client with persistent storage"""
        # Ensure the persist directory exists
        persist_dir = settings.CHROMA_PERSIST_DIR
        os.makedirs(persist_dir, exist_ok=True)

        # Initialize persistent client
        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )

        # Collection names from settings
        self.knowledge_base_collection = settings.RAG_COLLECTION_KNOWLEDGE_BASE
        self.dishes_collection = settings.RAG_COLLECTION_DISHES

    def _sanitize_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize metadata for ChromaDB (removes None values).
        ChromaDB only accepts str, int, float, or bool values.
        """
        sanitized = {}
        for key, value in metadata.items():
            if value is None:
                # Skip None values or convert to empty string
                continue
            elif isinstance(value, (str, int, float, bool)):
                sanitized[key] = value
            elif isinstance(value, list):
                # Convert lists to comma-separated strings
                sanitized[key] = ','.join(str(v) for v in value if v is not None)
            else:
                # Convert other types to string
                sanitized[key] = str(value)
        return sanitized

    def get_or_create_collection(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> chromadb.Collection:
        """
        Get an existing collection or create a new one.

        Args:
            name: Name of the collection
            metadata: Optional metadata for the collection

        Returns:
            ChromaDB Collection object
        """
        return self.client.get_or_create_collection(
            name=name,
            metadata=metadata or {"hnsw:space": "cosine"}
        )

    def add_documents(
        self,
        collection_name: str,
        documents: List[DocumentChunk],
        ids: Optional[List[str]] = None
    ) -> int:
        """
        Add documents to a collection with embeddings.

        Args:
            collection_name: Name of the collection
            documents: List of DocumentChunk objects
            ids: Optional list of IDs (auto-generated if not provided)

        Returns:
            Number of documents added
        """
        if not documents:
            return 0

        collection = self.get_or_create_collection(collection_name)

        # Extract texts and metadata
        texts = [doc.content for doc in documents]
        # Sanitize metadata: ChromaDB doesn't accept None values
        metadatas = [self._sanitize_metadata(doc.metadata) for doc in documents]

        # Generate IDs if not provided
        if ids is None:
            # Get current count to generate unique IDs
            existing_count = collection.count()
            ids = [f"{collection_name}_{existing_count + i}" for i in range(len(documents))]

        # Generate embeddings
        embeddings = embedding_service.embed_batch(texts, task_type="retrieval_document")

        # Filter out any documents that failed to embed
        valid_indices = [i for i, emb in enumerate(embeddings) if emb is not None]

        if not valid_indices:
            print("Warning: No valid embeddings generated")
            return 0

        valid_ids = [ids[i] for i in valid_indices]
        valid_texts = [texts[i] for i in valid_indices]
        valid_metadatas = [metadatas[i] for i in valid_indices]
        valid_embeddings = [embeddings[i] for i in valid_indices]

        # Add to collection
        collection.add(
            ids=valid_ids,
            documents=valid_texts,
            metadatas=valid_metadatas,
            embeddings=valid_embeddings
        )

        return len(valid_ids)

    def add_documents_batch(
        self,
        collection_name: str,
        documents: List[DocumentChunk],
        batch_size: int = 100
    ) -> int:
        """
        Add documents in batches to handle large datasets.

        Args:
            collection_name: Name of the collection
            documents: List of DocumentChunk objects
            batch_size: Number of documents per batch

        Returns:
            Total number of documents added
        """
        total_added = 0

        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            print(f"Processing batch {i // batch_size + 1}/{(len(documents) - 1) // batch_size + 1}")

            added = self.add_documents(collection_name, batch)
            total_added += added

        return total_added

    def query(
        self,
        collection_name: str,
        query: str,
        top_k: int = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Query a collection for similar documents.

        Args:
            collection_name: Name of the collection
            query: Search query text
            top_k: Number of results to return
            where: Optional metadata filter
            where_document: Optional document content filter

        Returns:
            List of matching documents with metadata and scores
        """
        top_k = top_k or settings.RAG_TOP_K

        collection = self.get_or_create_collection(collection_name)

        if collection.count() == 0:
            return []

        # Generate query embedding
        query_embedding = embedding_service.embed_query(query)

        # Query the collection
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, collection.count()),
            where=where,
            where_document=where_document,
            include=["documents", "metadatas", "distances"]
        )

        # Format results
        formatted_results = []
        if results['ids'] and results['ids'][0]:
            for i, doc_id in enumerate(results['ids'][0]):
                # Convert distance to similarity score (cosine distance to similarity)
                distance = results['distances'][0][i] if results['distances'] else 0
                similarity = 1 - distance  # Cosine similarity = 1 - cosine distance

                formatted_results.append({
                    'id': doc_id,
                    'content': results['documents'][0][i] if results['documents'] else "",
                    'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                    'similarity_score': similarity,
                    'distance': distance
                })

        return formatted_results

    async def query_async(
        self,
        collection_name: str,
        query: str,
        top_k: int = None,
        where: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Async wrapper for query method.

        Args:
            collection_name: Name of the collection
            query: Search query text
            top_k: Number of results to return
            where: Optional metadata filter

        Returns:
            List of matching documents with metadata and scores
        """
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self.query(collection_name, query, top_k, where)
        )

    def delete_collection(self, name: str) -> bool:
        """
        Delete a collection.

        Args:
            name: Name of the collection to delete

        Returns:
            True if deleted successfully
        """
        try:
            self.client.delete_collection(name)
            return True
        except Exception as e:
            print(f"Error deleting collection {name}: {e}")
            return False

    def get_collection_info(self, name: str) -> Dict[str, Any]:
        """
        Get information about a collection.

        Args:
            name: Name of the collection

        Returns:
            Dictionary with collection info
        """
        try:
            collection = self.client.get_collection(name)
            return {
                "name": name,
                "count": collection.count(),
                "metadata": collection.metadata
            }
        except Exception:
            return {"name": name, "count": 0, "exists": False}

    def list_collections(self) -> List[Dict[str, Any]]:
        """
        List all collections with their info.

        Returns:
            List of collection info dictionaries
        """
        collections = self.client.list_collections()
        return [
            {
                "name": c.name,
                "count": c.count(),
                "metadata": c.metadata
            }
            for c in collections
        ]

    def reset_collection(self, name: str) -> bool:
        """
        Delete and recreate a collection.

        Args:
            name: Name of the collection

        Returns:
            True if reset successfully
        """
        self.delete_collection(name)
        self.get_or_create_collection(name)
        return True

    def test(self):
        """Test vector store operations"""
        print("Vector Store Service Test")
        print("=" * 50)

        # Test collection creation
        test_collection = "test_collection"
        print(f"\nCreating test collection: {test_collection}")
        collection = self.get_or_create_collection(test_collection)
        print(f"  Collection created: {collection.name}")

        # Test adding documents
        print("\nAdding test documents...")
        test_docs = [
            DocumentChunk(
                content="Biryani is a popular Pakistani rice dish with aromatic spices.",
                metadata={"category": "main_dish", "type": "rice"}
            ),
            DocumentChunk(
                content="Dal is a nutritious lentil dish high in protein.",
                metadata={"category": "main_dish", "type": "lentils"}
            ),
            DocumentChunk(
                content="Roti is a whole wheat flatbread eaten with most meals.",
                metadata={"category": "bread", "type": "wheat"}
            )
        ]

        added = self.add_documents(test_collection, test_docs)
        print(f"  Added {added} documents")

        # Test querying
        print("\nQuerying for 'rice dish with spices'...")
        results = self.query(test_collection, "rice dish with spices", top_k=2)
        for i, result in enumerate(results):
            print(f"  {i + 1}. Score: {result['similarity_score']:.4f}")
            print(f"     Content: {result['content'][:50]}...")

        # Test collection info
        print("\nCollection info:")
        info = self.get_collection_info(test_collection)
        print(f"  {info}")

        # Cleanup
        print("\nCleaning up test collection...")
        self.delete_collection(test_collection)
        print("  Done")


# Create singleton instance
vector_store = VectorStoreService()


if __name__ == "__main__":
    vector_store.test()
