# SehatGuru Memory Architecture (Mem0 Integration)

## Overview

SehatGuru uses four layers of context to personalize every chatbot response:

1. **User Profile** — static onboarding data (age, gender, goals, calorie target)
2. **Mem0 Memory** — dynamic facts extracted from past conversations
3. **RAG** — Pakistani dietary knowledge and dish database
4. **Chat History** — current session messages

---

## What Is Stored Where

```
Firestore
├── users/                    ← auth + onboarding profiles
├── meals/                    ← logged meals
└── (no chat memory stored here anymore)

ChromaDB  ./chroma_db
├── pakistani_dietary_guidelines   ← RAG knowledge base (static)
└── pakistani_dishes               ← RAG dish database (static)

ChromaDB  ./chroma_db_mem0
└── sehatguru_user_memories        ← Mem0 per-user facts (dynamic)
    ├── user: uid_abc  →  ["Dislikes biryani", "Is diabetic", ...]
    ├── user: uid_xyz  →  ["Goal is weight gain, 2880 kcal target", ...]
    └── ...
```

---

## Request Flow

```
User sends a message
        │
        ▼
┌─────────────────────────────┐
│  1. Mem0 Search             │
│  query = user's message     │
│  embedder = Gemini          │
│  → top 5 relevant facts     │
│    for this user            │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  2. LangGraph Router        │
│                             │
│  Guard rails check          │
│       ↓                     │
│  Intent classification      │
│  (nutritional_advice /      │
│   meal_plan_generation)     │
│       ↓                     │
│  RAG retrieval              │
│  (guidelines + dishes)      │
│       ↓                     │
│  Response generation        │
│                             │
│  Prompt contains:           │
│  ├── System prompt          │
│  ├── User profile           │  ← from Firestore (onboarding)
│  ├── User memory            │  ← from Mem0 (past conversations)
│  ├── RAG context            │  ← from ChromaDB (knowledge base)
│  ├── Chat history           │  ← from frontend (current session)
│  └── Current message        │
└─────────────┬───────────────┘
              │
              ▼
     Response returned (200 OK)
              │
              ▼
┌─────────────────────────────┐
│  3. Background: Mem0 Add    │
│  input = user message only  │  ← bot response excluded on purpose
│  LLM extracts facts         │
│  Deduplicates               │
│  Resolves contradictions    │
│  Stores in ChromaDB         │
└─────────────────────────────┘
```

---

## The Four Context Layers Compared

| Layer | Source | Scope | Example content |
|---|---|---|---|
| User Profile | Firestore (onboarding) | Permanent, user-editable | Age 22, male, gain-weight goal, 2880 kcal target |
| Mem0 Memory | ChromaDB `chroma_db_mem0` | Permanent, grows over time | "Dislikes biryani", "Mentioned lactose intolerance" |
| RAG Context | ChromaDB `chroma_db` | Static, query-dependent | Nutritional guidelines, dish macros |
| Chat History | Frontend (in-memory) | Current session only | Last N messages for conversational coherence |

---

## How Mem0 Manages Facts

Mem0 does not store raw messages. It extracts **discrete facts** and manages them intelligently:

| Operation | When it happens | Example |
|---|---|---|
| **ADD** | New fact not seen before | User says "I'm vegetarian" → stores "User is vegetarian" |
| **UPDATE** | Fact exists but details changed | "I want to lose weight" after previously storing "gain weight" |
| **DELETE** | Fact contradicted or irrelevant | User says "I don't like biryani" → removes "Likes biryani" |
| **NOOP** | Fact already known, no change | User repeats something already stored |

**Why bot responses are excluded from `add_turn`:**
Mem0 extracts facts from everything it is given. If the bot's meal plan says "Chicken Biryani (500 kcal)", Mem0 would extract "User likes Chicken Biryani" — which is wrong. Only user messages contain actual user preferences.

---

## Key Files

| File | Role |
|---|---|
| `backend/app/services/mem0_service.py` | Mem0 singleton — `add_turn`, `search`, `format_for_prompt` |
| `backend/app/services/intent_router.py` | LangGraph pipeline — injects memory into prompt |
| `backend/app/routes/chat.py` | Orchestrates search (before) and add_turn (after) each request |
| `backend/app/config/settings.py` | `MEM0_COLLECTION_NAME`, `MEM0_CHROMA_DIR` |
| `chroma_db_mem0/` | On-disk vector store for user memories |
