# SehatGuru RAG Implementation Plan

## Overview
RAG (Retrieval Augmented Generation) system for SehatGuru that provides Pakistan-specific nutritional advice by combining:
1. **Knowledge Base** - Pakistani Dietary Guidelines PDFs
2. **Dishes Database** - 1,025 Pakistani foods with nutritional data

---

## Phase 1: Vector Database Setup ✅ COMPLETED

### Data Sources

| Source | Location | Content |
|--------|----------|---------|
| `fbdg-pakistan.pdf` | `Docs/Knowledge Base Files/` | National Food Based Dietary Guidelines (36 pages) |
| `Pakistan_Dietary_Nutrition_2019.pdf` | `Docs/Knowledge Base Files/` | Detailed nutrition guidelines |
| `Food_dataset.csv` | `Dataset/` | 1,025 foods with 40 nutritional columns |
| `extracted_dishes.json` | `popular dish generation/data/` | 2,695 dish names from 113 sources |
| `fyp_final_ranking.csv` | `popular dish generation/data/` | 1,401 dishes with popularity scores |

### Files Created

```
backend/
├── app/
│   ├── config/
│   │   └── settings.py              # + RAG configuration settings
│   ├── models/
│   │   └── rag.py                   # NEW: Pydantic models for RAG
│   ├── services/
│   │   ├── pdf_processor.py         # NEW: PDF text extraction & chunking
│   │   ├── embedding_service.py     # NEW: Gemini embeddings (768-dim)
│   │   ├── vector_store.py          # NEW: ChromaDB operations
│   │   └── rag_service.py           # NEW: RAG retrieval logic
│   └── scripts/
│       ├── ingest_knowledge_base.py # NEW: PDF ingestion script
│       └── ingest_dishes.py         # NEW: Dishes ingestion script
├── chroma_db/                       # Vector database storage (gitignored)
└── requirements.txt                 # + RAG dependencies
```

### Dependencies Added

```txt
chromadb>=0.4.22
langchain>=0.1.0
langchain-google-genai>=0.0.6
pypdf>=3.17.0
sentence-transformers>=2.2.2
tiktoken>=0.5.2
```

### Configuration (settings.py)

```python
RAG_COLLECTION_KNOWLEDGE_BASE = "pakistani_dietary_guidelines"
RAG_COLLECTION_DISHES = "pakistani_dishes"
CHROMA_PERSIST_DIR = "./chroma_db"
RAG_CHUNK_SIZE = 1000
RAG_CHUNK_OVERLAP = 200
RAG_TOP_K = 5
EMBEDDING_MODEL = "models/embedding-001"  # Gemini embedding
```

### Usage Commands

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run ingestion (one-time)
python -m app.scripts.ingest_knowledge_base
python -m app.scripts.ingest_dishes

# Test queries
python -c "from app.services.rag_service import rag_service; print(rag_service.get_status())"

# Query dietary guidelines
python -c "from app.services.rag_service import rag_service; results = rag_service.retrieve_dietary_guidelines('diabetic diet'); print(results)"

# Query dishes
python -c "from app.services.rag_service import rag_service; results = rag_service.retrieve_dishes('haleem'); print([(r.name, r.calories, r.protein_g) for r in results[:3]])"
```

---

## Phase 2: Chat Integration ✅ COMPLETED

### Goal
Integrate RAG retrieval into the chatbot so responses are grounded in Pakistani dietary guidelines and food data.

### Files Modified

#### 1. `backend/app/services/gemini_service.py`

Updated with RAG integration:
- New Pakistan-specific system prompt (SehatGuru persona)
- `_build_rag_prompt()` - Builds prompt with RAG context and user profile
- `generate_chat_response()` - Now accepts `user_context` and `use_rag` parameters
- `generate_chat_response_with_history()` - New method for multi-turn conversations

```python
# Key changes:
async def generate_chat_response(
    self,
    message: str,
    user_context: Optional[Dict[str, Any]] = None,  # NEW
    use_rag: bool = True  # NEW
) -> str:
    # Get RAG context
    rag_context = rag_service.get_context_for_llm(message)

    # Build enhanced prompt
    full_prompt = self._build_rag_prompt(message, rag_context, user_context)

    # Generate response with Gemini
    response = self.model.generate_content(full_prompt)
    return response.text
```

#### 2. `backend/app/models/chat.py`

Added new models for enhanced chat:
- `UserContext` - User profile for personalization (health_goals, dietary_restrictions, etc.)
- `ChatWithHistoryRequest` - Request with conversation history
- `ChatHistoryMessage` - Single message in history
- Updated `ChatMessageResponse` with `rag_used` field

#### 3. `backend/app/routes/chat.py`

Added new endpoints:
- `POST /chat/message` - Enhanced with user_context and use_rag options
- `POST /chat/message/with-history` - Multi-turn conversation support
- `GET /chat/rag/status` - Check RAG system health

### System Prompt (SehatGuru Persona)

```
You are SehatGuru, an AI nutritionist specializing in Pakistani cuisine and dietary guidelines.

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
6. Use Urdu food names alongside English when helpful
7. Be culturally sensitive and aware of local eating patterns
```

### API Usage Examples

#### Basic Message (with RAG)
```bash
curl -X POST http://localhost:8000/chat/message \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "What should I eat for diabetes?"}'
```

#### With User Context
```bash
curl -X POST http://localhost:8000/chat/message \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Suggest a lunch for me",
    "user_context": {
      "health_goals": ["weight_loss"],
      "dietary_restrictions": ["diabetic"],
      "daily_calorie_target": 1800
    }
  }'
```

#### With Conversation History
```bash
curl -X POST http://localhost:8000/chat/message/with-history \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What about for dinner?",
    "chat_history": [
      {"role": "user", "content": "What should I have for lunch?"},
      {"role": "assistant", "content": "I recommend dal with roti..."}
    ],
    "user_context": {"health_goals": ["weight_loss"]}
  }'
```

#### Check RAG Status
```bash
curl -X GET http://localhost:8000/chat/rag/status \
  -H "Authorization: Bearer <token>"
```

---

## Phase 3: Advanced Features 🔲 FUTURE

### 3.1 Meal Plan Generation
- Use RAG to find dishes matching calorie/macro targets
- Generate weekly meal plans based on user goals
- Consider variety and Pakistani food preferences

### 3.2 Food Logging with RAG
- When user logs "biryani", retrieve exact nutritional info
- Handle variations (chicken biryani vs beef biryani)
- Suggest portion sizes based on guidelines

### 3.3 Personalized Recommendations
- Filter dishes by dietary restrictions (diabetic, hypertension)
- Recommend based on nutritional gaps
- Consider user's past meals

### 3.4 Hybrid Search Improvements
- Combine semantic search with keyword matching
- Add filters (meal_type, calorie range, cuisine type)
- Re-ranking based on user preferences

---

## API Reference

### RAGService Methods

```python
# Retrieve dietary guidelines
rag_service.retrieve_dietary_guidelines(
    query: str,
    top_k: int = 5,
    filters: dict = None
) -> List[KnowledgeBaseResult]

# Retrieve dishes
rag_service.retrieve_dishes(
    query: str,
    top_k: int = 10,
    filters: dict = None
) -> List[DishResult]

# Hybrid search (both collections)
rag_service.hybrid_search(
    query: str,
    user_context: dict = None,
    guidelines_top_k: int = 3,
    dishes_top_k: int = 5
) -> dict

# Get formatted context for LLM
rag_service.get_context_for_llm(
    query: str,
    max_context_length: int = 4000
) -> str

# Check system status
rag_service.get_status() -> dict
```

### Pydantic Models

```python
class KnowledgeBaseResult:
    content: str
    source_file: str
    page_number: int
    section: str
    relevance_score: float

class DishResult:
    dish_id: str
    name: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    relevance_score: float
```

---

## Troubleshooting

### Common Issues

1. **"Collection does not exist"**
   - Run ingestion scripts first
   - Check `chroma_db/` folder exists

2. **"No module named 'app.services.rag_service'"**
   - Make sure you're in the `backend/` directory

3. **ChromaDB None value error**
   - Fixed in `vector_store.py` with `_sanitize_metadata()`

4. **Slow embedding generation**
   - Normal for first ingestion (1000+ documents)
   - Uses batching (50 docs at a time)

### Verify Installation

```bash
cd backend
python -c "from app.services.rag_service import rag_service; print(rag_service.get_status())"
```

Expected output:
```python
{
    'knowledge_base': {'name': 'pakistani_dietary_guidelines', 'count': X},
    'dishes': {'name': 'pakistani_dishes', 'count': 1025},
    'ready': True
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Query                           │
│                  "What should a diabetic eat?"              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     RAG Service                             │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │ Embedding       │     │ Vector Store    │               │
│  │ Service         │────▶│ (ChromaDB)      │               │
│  │ (Gemini API)    │     │                 │               │
│  └─────────────────┘     └────────┬────────┘               │
└───────────────────────────────────┼─────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │ Knowledge Base    │           │ Dishes Collection │
        │ (PDF Guidelines)  │           │ (1025 foods)      │
        └─────────┬─────────┘           └─────────┬─────────┘
                  │                               │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                    ┌───────────────────────┐
                    │   Retrieved Context   │
                    │ - Glycemic index info │
                    │ - Low-sugar dishes    │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Gemini LLM          │
                    │   + Context           │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Informed Response   │
                    │   with Pakistani      │
                    │   dietary advice      │
                    └───────────────────────┘
```

---

## Changelog

| Date | Phase | Changes |
|------|-------|---------|
| 2024-01-25 | Phase 1 | Initial RAG setup - PDF processing, embeddings, ChromaDB |
| | | Created: pdf_processor.py, embedding_service.py, vector_store.py, rag_service.py |
| | | Created: ingest_knowledge_base.py, ingest_dishes.py |
| | | Added RAG dependencies to requirements.txt |
| 2024-01-25 | Phase 2 | Chat Integration - RAG connected to chatbot |
| | | Updated: gemini_service.py with SehatGuru persona and RAG integration |
| | | Updated: models/chat.py with UserContext, ChatWithHistoryRequest |
| | | Updated: routes/chat.py with /message/with-history and /rag/status endpoints |
| | | React Native app now receives RAG-enhanced responses |
