from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class DocumentChunk(BaseModel):
    """Represents a chunk of text from a document for embedding"""
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    # Metadata includes: source_file, page_number, section, topic


class DishDocument(BaseModel):
    """Represents a dish for embedding in the vector store"""
    dish_id: str
    name: str
    name_variants: List[str] = Field(default_factory=list)
    calories: float = 0.0
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fat_g: float = 0.0
    fiber_g: float = 0.0
    sodium_mg: float = 0.0
    meal_type: Optional[str] = None
    category: Optional[str] = None
    popularity_rank: Optional[int] = None
    embedding_text: str = ""  # Rich text representation for embedding

    def generate_embedding_text(self) -> str:
        """Generate rich text for embedding"""
        parts = [f"{self.name} is a Pakistani dish"]

        if self.calories > 0:
            parts.append(f"with {self.calories:.0f} kcal per serving")

        nutrition_parts = []
        if self.protein_g > 0:
            nutrition_parts.append(f"{self.protein_g:.1f}g protein")
        if self.carbs_g > 0:
            nutrition_parts.append(f"{self.carbs_g:.1f}g carbs")
        if self.fat_g > 0:
            nutrition_parts.append(f"{self.fat_g:.1f}g fat")

        if nutrition_parts:
            parts.append(f"containing {', '.join(nutrition_parts)}")

        if self.meal_type:
            parts.append(f"suitable for {self.meal_type}")

        if self.category:
            parts.append(f"categorized as {self.category}")

        if self.name_variants:
            parts.append(f"also known as: {', '.join(self.name_variants[:5])}")

        self.embedding_text = ". ".join(parts) + "."
        return self.embedding_text


class RAGQueryRequest(BaseModel):
    """Request model for RAG queries"""
    query: str
    collection: str = "knowledge_base"  # "knowledge_base" or "dishes"
    top_k: int = Field(default=5, ge=1, le=20)
    filters: Optional[Dict[str, Any]] = None


class RAGQueryResponse(BaseModel):
    """Response model for RAG queries"""
    results: List[Dict[str, Any]]
    query: str
    collection: str
    total_results: int = 0


class KnowledgeBaseResult(BaseModel):
    """A result from the knowledge base retrieval"""
    content: str
    source_file: str
    page_number: Optional[int] = None
    section: Optional[str] = None
    relevance_score: float = 0.0


class DishResult(BaseModel):
    """A result from the dishes retrieval"""
    dish_id: str
    name: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    relevance_score: float = 0.0
    metadata: Dict[str, Any] = Field(default_factory=dict)
