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

## Phase 3: Intent Router (LangGraph) ✅ COMPLETED

### Goal
Route user messages through an **intent classification** step so that different types of questions get different RAG retrieval ratios and different system prompts — instead of treating every message the same way.

### How It Works

```
User message
     │
     ▼
┌──────────────────┐
│  classify_intent  │  ← Lightweight Gemini call classifies the message
└────────┬─────────┘
         │
    route_by_intent()   ← Conditional edge
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│nutrition│ │meal_plan │
│_context │ │_context  │   ← Different RAG retrieval ratios per intent
│guidel=5 │ │dishes=8  │
│dishes=3 │ │guidel=2  │
└────┬───┘ └────┬─────┘
     │          │
     ▼          ▼
┌──────────────────┐
│ generate_response │  ← Intent-specific system prompt + Gemini call
└────────┬─────────┘
         ▼
        END
```

### Two Intents

| Intent | When | RAG Ratios | System Prompt Tone |
|--------|------|------------|--------------------|
| `nutritional_advice` | Nutrition questions, calorie queries, diet tips, food info | guidelines=5, dishes=3 | Advisory, cites guidelines, explains health impacts |
| `meal_plan_generation` | "Create a meal plan", "weekly menu", "daily eating schedule" | guidelines=2, dishes=8 | Structured format (Breakfast/Lunch/Dinner/Snacks), calorie breakdowns |

### Technology Stack

- **LangGraph** (`langgraph>=0.0.28`) — Orchestrates the flow as a `StateGraph`. Handles node sequencing, conditional routing, and async execution via `ainvoke()`.
- **Google Generative AI SDK** (`google.generativeai`) — Used directly inside each node for Gemini API calls. No LangChain wrappers — matches existing codebase pattern.

### Files Changed

| Action | File | What |
|--------|------|------|
| **CREATE** | `backend/app/services/intent_router.py` | LangGraph StateGraph with 4 nodes, conditional routing, two system prompts, singleton compiled graph, `route_and_respond()` public API |
| **MODIFY** | `backend/requirements.txt` | Added `langgraph>=0.0.28` |
| **MODIFY** | `backend/app/models/chat.py` | Added `intent: Optional[str]` field to `ChatMessageResponse` |
| **MODIFY** | `backend/app/routes/chat.py` | Both `/chat/message` and `/chat/message/with-history` now call `route_and_respond()` when `use_rag=True`, fall back to `gemini_service` when `use_rag=False` |
| **MODIFY** | `backend/app/services/__init__.py` | Exported `intent_router` and `route_and_respond` |

### Key Design Decisions

1. **`use_rag=False` bypasses the intent router entirely** — No point classifying if there's no RAG to customize. Falls back to existing `gemini_service` methods.
2. **`intent` is `Optional[str]` in the response** — Backward compatible. Frontend doesn't break. Returns `null` when RAG is disabled.
3. **Classification defaults to `nutritional_advice` on error** — Safe fallback if Gemini returns something unexpected.
4. **Singleton pattern** — Graph is compiled once at module load (`intent_router = build_intent_router()`), reused via `ainvoke()` per request.
5. **Last 2 chat history messages** sent to classification prompt for context (e.g., if the user says "make it a plan" after a nutrition question).

### State Schema

```python
class RouterState(TypedDict):
    message: str                                    # User's input message
    user_context: Optional[Dict[str, Any]]          # Onboarding data (health_goals, age, etc.)
    chat_history: Optional[List[Dict[str, str]]]    # Previous conversation messages
    use_rag: bool                                   # Whether RAG is enabled
    intent: str                                     # Classified intent label
    rag_context: str                                # Retrieved RAG context string
    response: str                                   # Final generated response
```

### Public API

```python
from app.services.intent_router import route_and_respond

result = await route_and_respond(
    message="Create a 1500 calorie meal plan",
    user_context={"health_goals": ["weight_loss"], "daily_calorie_target": 1500},
    chat_history=[{"role": "user", "content": "I want to lose weight"}],
    use_rag=True,
)
# result = {"response": "...", "intent": "meal_plan_generation", "rag_used": True}
```

### API Response (updated)

Both `/chat/message` and `/chat/message/with-history` now return:

```json
{
  "response": "Biryani typically contains approximately 197 kcal...",
  "rag_used": true,
  "intent": "nutritional_advice"
}
```

### Performance

- Adds ~200-400ms for the classification Gemini call (short prompt, `gemini-2.0-flash`)
- RAG retrieval stays async via `asyncio.gather` inside `hybrid_search_async`
- Graph compiled once at startup, no per-request compilation overhead

### Testing

```powershell
cd backend

# Should classify as nutritional_advice
python -c "from app.services.intent_router import route_and_respond; import asyncio; r = asyncio.run(route_and_respond('How many calories in biryani?')); print(r['intent'], '-', r['response'][:100])"

# Should classify as meal_plan_generation
python -c "from app.services.intent_router import route_and_respond; import asyncio; r = asyncio.run(route_and_respond('Create a 1500 calorie meal plan for the day')); print(r['intent'], '-', r['response'][:100])"
```

Or via Swagger at `http://localhost:8000/docs` after starting the server.

---

## Phase 4: Advanced Features 🔲 FUTURE

### 4.1 Food Logging with RAG
- When user logs "biryani", retrieve exact nutritional info
- Handle variations (chicken biryani vs beef biryani)
- Suggest portion sizes based on guidelines

### 4.2 Personalized Recommendations
- Filter dishes by dietary restrictions (diabetic, hypertension)
- Recommend based on nutritional gaps
- Consider user's past meals

### 4.3 Hybrid Search Improvements
- Combine semantic search with keyword matching
- Add filters (meal_type, calorie range, cuisine type)
- Re-ranking based on user preferences

### 4.4 Additional Intents
- `food_logging` — Optimized for identifying and logging specific foods
- `health_tracking` — Optimized for progress queries and health metrics

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
│                  Intent Router (LangGraph)                   │
│                                                             │
│  ┌──────────────────┐                                       │
│  │ classify_intent   │ ← Gemini flash (lightweight call)    │
│  └────────┬─────────┘                                       │
│           │                                                 │
│     ┌─────┴─────┐                                           │
│     ▼           ▼                                           │
│  nutrition   meal_plan                                      │
│  _advice     _generation                                    │
│     │           │                                           │
│     ▼           ▼                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  RAG Service                         │    │
│  │  ┌─────────────────┐     ┌─────────────────┐       │    │
│  │  │ Embedding       │     │ Vector Store    │       │    │
│  │  │ Service         │────▶│ (ChromaDB)      │       │    │
│  │  │ (Gemini API)    │     │                 │       │    │
│  │  └─────────────────┘     └────────┬────────┘       │    │
│  └───────────────────────────────────┼─────────────────┘    │
│                                      │                      │
│                      ┌───────────────┴───────────────┐      │
│                      │                               │      │
│                      ▼                               ▼      │
│          ┌───────────────────┐           ┌───────────────┐  │
│          │ Knowledge Base    │           │ Dishes        │  │
│          │ (PDF Guidelines)  │           │ (1025 foods)  │  │
│          │ top_k varies by   │           │ top_k varies  │  │
│          │ intent (2 or 5)   │           │ by intent     │  │
│          └─────────┬─────────┘           └─────┬────────┘  │
│                    │                           │            │
│                    └─────────────┬─────────────┘            │
│                                  │                          │
│                                  ▼                          │
│                    ┌───────────────────────┐                │
│                    │   generate_response    │                │
│                    │   Intent-specific      │                │
│                    │   system prompt +      │                │
│                    │   Gemini call          │                │
│                    └───────────┬───────────┘                │
│                                │                            │
└────────────────────────────────┼────────────────────────────┘
                                 │
                                 ▼
                   ┌───────────────────────┐
                   │   Response + Intent   │
                   │   {response, intent,  │
                   │    rag_used}          │
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
| 2026-02-09 | Phase 3 | Intent Router - LangGraph-based intent classification |
| | | Created: intent_router.py with StateGraph (4 nodes, conditional routing) |
| | | Added: langgraph dependency to requirements.txt |
| | | Updated: models/chat.py with `intent` field in ChatMessageResponse |
| | | Updated: routes/chat.py to use `route_and_respond()` when RAG enabled |
| | | Updated: services/__init__.py with intent_router exports |
