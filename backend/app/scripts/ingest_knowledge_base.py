"""
Ingestion script for Pakistani Dietary Guidelines PDFs.

This script:
1. Loads PDFs from Docs/Knowledge Base Files/
2. Extracts and chunks text using PDFProcessor
3. Generates embeddings using EmbeddingService
4. Stores in ChromaDB collection 'pakistani_dietary_guidelines'

Usage:
    cd backend
    python -m app.scripts.ingest_knowledge_base
"""

import os
import sys
from pathlib import Path

# Add backend to path for imports
backend_path = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_path))

from app.config.settings import settings
from app.services.pdf_processor import pdf_processor
from app.services.vector_store import vector_store
from app.models.rag import DocumentChunk


def get_knowledge_base_path() -> Path:
    """Get the path to the knowledge base PDFs directory"""
    # Try multiple possible locations
    possible_paths = [
        Path(__file__).parent.parent.parent.parent / "Docs" / "Knowledge Base Files",
        Path.cwd().parent / "Docs" / "Knowledge Base Files",
        Path.cwd() / "Docs" / "Knowledge Base Files",
    ]

    for path in possible_paths:
        if path.exists():
            return path

    raise FileNotFoundError(
        "Knowledge Base Files directory not found. "
        "Expected at: Docs/Knowledge Base Files/"
    )


def ingest_dietary_guidelines():
    """
    Main ingestion function for dietary guidelines PDFs.
    """
    print("=" * 60)
    print("SehatGuru RAG - Knowledge Base Ingestion")
    print("=" * 60)

    # Get knowledge base path
    try:
        kb_path = get_knowledge_base_path()
        print(f"\nKnowledge base path: {kb_path}")
    except FileNotFoundError as e:
        print(f"\nError: {e}")
        return False

    # Find all PDF files
    pdf_files = list(kb_path.glob("*.pdf"))
    if not pdf_files:
        print(f"\nNo PDF files found in {kb_path}")
        return False

    print(f"\nFound {len(pdf_files)} PDF file(s):")
    for pdf in pdf_files:
        print(f"  - {pdf.name}")

    # Reset collection for clean ingestion
    collection_name = settings.RAG_COLLECTION_KNOWLEDGE_BASE
    print(f"\nResetting collection: {collection_name}")
    vector_store.reset_collection(collection_name)

    # Process each PDF
    all_chunks = []
    for pdf_path in pdf_files:
        print(f"\nProcessing: {pdf_path.name}")
        print("-" * 40)

        try:
            # Extract and chunk the PDF
            chunks = pdf_processor.create_chunks_with_metadata(
                str(pdf_path),
                source_name=pdf_path.name
            )
            print(f"  Extracted {len(chunks)} chunks")

            # Add source-specific metadata
            for chunk in chunks:
                chunk.metadata['source_type'] = 'dietary_guidelines'

                # Tag specific content types for better retrieval
                content_lower = chunk.content.lower()
                if any(kw in content_lower for kw in ['calorie', 'kcal', 'energy']):
                    chunk.metadata['topic'] = 'energy_requirements'
                elif any(kw in content_lower for kw in ['serving', 'portion', 'amount']):
                    chunk.metadata['topic'] = 'serving_sizes'
                elif any(kw in content_lower for kw in ['food group', 'pyramid', 'category']):
                    chunk.metadata['topic'] = 'food_groups'
                elif any(kw in content_lower for kw in ['menu', 'meal', 'breakfast', 'lunch', 'dinner']):
                    chunk.metadata['topic'] = 'meal_planning'
                elif any(kw in content_lower for kw in ['child', 'infant', 'baby', 'toddler']):
                    chunk.metadata['topic'] = 'child_nutrition'
                elif any(kw in content_lower for kw in ['diabetic', 'diabetes', 'blood sugar']):
                    chunk.metadata['topic'] = 'diabetes_management'
                elif any(kw in content_lower for kw in ['heart', 'cholesterol', 'cardiovascular']):
                    chunk.metadata['topic'] = 'heart_health'

            all_chunks.extend(chunks)

            if chunks:
                print(f"  First chunk preview: {chunks[0].content[:100]}...")

        except Exception as e:
            print(f"  Error processing {pdf_path.name}: {e}")
            continue

    if not all_chunks:
        print("\nNo chunks extracted from PDFs")
        return False

    # Add all chunks to vector store
    print(f"\nAdding {len(all_chunks)} chunks to vector store...")
    print("This may take a few minutes for embedding generation...")

    try:
        added = vector_store.add_documents_batch(
            collection_name,
            all_chunks,
            batch_size=50
        )
        print(f"\nSuccessfully added {added} documents to collection")
    except Exception as e:
        print(f"\nError adding documents: {e}")
        return False

    # Verify ingestion
    print("\nVerifying ingestion...")
    info = vector_store.get_collection_info(collection_name)
    print(f"  Collection: {info['name']}")
    print(f"  Document count: {info['count']}")

    # Test query
    print("\nRunning test query...")
    test_query = "What are the recommended daily calories for adults?"
    results = vector_store.query(collection_name, test_query, top_k=3)

    if results:
        print(f"  Query: '{test_query}'")
        print(f"  Found {len(results)} results:")
        for i, r in enumerate(results, 1):
            print(f"    {i}. Score: {r['similarity_score']:.4f}")
            print(f"       Content: {r['content'][:80]}...")
    else:
        print("  No results found for test query")

    print("\n" + "=" * 60)
    print("Knowledge base ingestion complete!")
    print("=" * 60)

    return True


if __name__ == "__main__":
    success = ingest_dietary_guidelines()
    sys.exit(0 if success else 1)
