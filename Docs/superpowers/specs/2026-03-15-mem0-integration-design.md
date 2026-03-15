# Mem0 OSS Integration Design
**Date:** 2026-03-15
**Branch:** feature/MEM0
**Status:** Approved

---

## Problem Statement

The current memory system stores a rolling 20-message window in Firestore and regenerates a flat LLM text summary every 5 messages. This has three weaknesses:

1. **Contradictions not resolved** — if a user changes a preference, the old and new info coexist in the summary with no resolution.
2. **Facts lost after rolling window** — preferences mentioned early in a long conversation are dropped once they scroll out of the 20-message window if not captured in the summary.
3. **Opaque blob** — the summary is an unstructured text string that cannot be inspected, queried, or corrected per-fact.

---

## Solution: In-Process Mem0 OSS

Replace the summary layer with `mem0ai` (open-source, in-process), configured to use the existing ChromaDB instance and Gemini model. No new infrastructure required.

Mem0 automatically:
- Extracts discrete facts from conversation turns
- Deduplicates overlapping facts
- Resolves contradictions (new preference overrides old)
- Enables semantic search to retrieve only relevant facts per query

---

## Architecture

### Data Flow (with-history endpoint)

```
1. Request arrives at POST /chat/message/with-history
2. mem0_service.search(user_id, current_message, limit=5)
   → returns relevant facts: ["User dislikes biryani", "User is diabetic"]
3. mem0_service.format_for_prompt(memories) → formatted string (or "" if empty)
4. route_and_respond(..., user_memory=formatted_string or None)
   → same RouterState.user_memory field, same prompt injection in generate_response()
   → generate_response() only injects memory block when user_memory is truthy;
     empty string "" is falsy so no block is injected on first-use (correct behavior)
5. Response returned to user
6. Background task: asyncio.create_task(mem0_service.add_turn(...))
   → Mem0 extracts facts, deduplicates, resolves contradictions
```

**Search query strategy:** `request.message` alone is used as the Mem0 search query.
For short/ambiguous messages (e.g. "give me a meal plan") the returned memories will be
generic but still correct — Mem0 will return all stored user facts ranked by relevance.
Incorporating chat history into the query is explicitly out of scope for this iteration.

**`use_rag=False` path:** The `send_chat_message_with_history` handler also has a
non-RAG fallback path (lines ~191–207). After this change, that path must also call
`asyncio.create_task(mem0_service.add_turn(...))` to ensure memory is written regardless
of RAG mode. Memory loading (search) is not needed on the non-RAG path since it bypasses
`route_and_respond` and does not inject `user_memory` into the prompt.

**`asyncio.create_task` vs `BackgroundTasks`:** The existing code already uses
`asyncio.create_task` for background work. We continue this pattern for consistency.
FastAPI `BackgroundTasks` would offer better lifecycle management but switching is out of
scope. This is a deliberate documented choice.

**ChromaDB write contention:** Mem0 OSS uses an in-process ChromaDB (SQLite-backed).
Concurrent `add_turn` background tasks across simultaneous requests for the same `user_id`
may produce minor write contention. At the expected user scale of this project this is an
accepted risk. No per-user locking or queue is implemented.

### What Is Removed

| Item | Location | Reason |
|---|---|---|
| `MEMORY_SUMMARIZE_EVERY_N` | `firestore_service.py` | No longer needed |
| `MEMORY_MAX_RECENT_MESSAGES` | `firestore_service.py` | No longer needed |
| `USER_MEMORY_COLLECTION` | `firestore_service.py` | No longer needed |
| `update_preference_summary()` | `firestore_service.py` | Replaced by Mem0 |
| `get_user_memory()` | `firestore_service.py` | Replaced by Mem0 search |
| `save_user_memory()` | `firestore_service.py` | Replaced by Mem0 add |
| `generate_preference_summary()` | `intent_router.py` | Replaced by Mem0 extraction |
| `SUMMARY_PROMPT` | `intent_router.py` | No longer needed |
| `_regenerate_summary()` background task | `chat.py` | Replaced by Mem0 add_turn |
| `message_count` Firestore field | Firestore `user_memory` collection | No longer needed |
| `preference_summary` Firestore field | Firestore `user_memory` collection | Replaced by ChromaDB via Mem0 |
| `recent_messages` Firestore field | Firestore `user_memory` collection | Frontend sends chat_history directly |

### What Is Added

| Item | Location |
|---|---|
| `mem0_service.py` | `backend/app/services/` |
| `MEM0_COLLECTION_NAME` setting | `settings.py` |
| `mem0ai>=0.1.60` pin | `requirements.txt` |

### What Is Unchanged

| Item | Notes |
|---|---|
| `RouterState.user_memory: Optional[str]` | Same field, same prompt injection — only the content source changes |
| `generate_response()` prompt injection logic | Unchanged — already guards on `if state.get("user_memory")` (truthy check) |
| `user_memory_override` test mode in `chat.py` | Logic unchanged; inline comment updated from "Firestore" to "Mem0" |
| ChromaDB instance at `./chroma_db` | Mem0 adds a new collection `sehatguru_user_memories` alongside existing ones |
| Firestore for meals, auth, food logs | Unchanged |

---

## Component: `mem0_service.py`

### Mem0 Configuration

```python
Memory.from_config({
    "vector_store": {
        "provider": "chroma",
        "config": {
            "collection_name": settings.MEM0_COLLECTION_NAME,  # "sehatguru_user_memories"
            "path": settings.CHROMA_PERSIST_DIR,               # "./chroma_db"
        }
    },
    "llm": {
        "provider": "gemini",
        "config": {
            "model": settings.GEMINI_MODEL,
            "api_key": settings.GEMINI_API_KEY,
        }
    },
    "embedder": {
        "provider": "gemini",
        "config": {
            "model": settings.EMBEDDING_MODEL,
            "api_key": settings.GEMINI_API_KEY,
        }
    }
})
```

### Public Interface

```python
class Mem0Service:
    async def add_turn(self, user_id: str, user_message: str, bot_response: str) -> None
    async def search(self, user_id: str, query: str, limit: int = 5) -> list[dict]
    @staticmethod
    def format_for_prompt(memories: list[dict]) -> str
```

- `add_turn` — wraps `memory.add([{role, content}, {role, content}], user_id=user_id)` in
  `asyncio.get_event_loop().run_in_executor(None, ...)` (Mem0 OSS is synchronous)
- `search` — wraps `memory.search(query, user_id=user_id, limit=limit)` in thread executor
- `format_for_prompt` — static method; converts Mem0 result list → bullet-point string.
  Returns `""` (empty string) when `memories` is empty or `None`.
  The memory text key is `result["memory"]` (verified against `mem0ai==0.1.60`).
  If the key is absent for a result, that result is silently skipped.

### `format_for_prompt` contract

| Input | Output |
|---|---|
| `[]` | `""` (empty string — falsy, no memory block injected) |
| `[{"memory": "User is diabetic"}]` | `"- User is diabetic"` |
| `[{"memory": "A"}, {"memory": "B"}]` | `"- A\n- B"` |
| `[{"other_key": "X"}]` | `""` (key absent, skipped) |

### Error Handling

Both `add_turn` and `search` catch all exceptions and log warnings with `logger.warning`.
A Mem0 failure must never block a response. `search` returns `[]` on error; `add_turn`
silently discards on error.

---

## Changes to `chat.py`

### Loading memory — RAG path (before)
```python
memory = get_user_memory(current_user["uid"])
preference_summary = memory.get("preference_summary")
# comment: "use override if provided (test mode), otherwise load from Firestore"
```

### Loading memory — RAG path (after)
```python
memories = await mem0_service.search(current_user["uid"], request.message)
preference_summary = mem0_service.format_for_prompt(memories)
# comment: "use override if provided (test mode), otherwise search Mem0"
```

`preference_summary` will be `""` for new users with no stored facts. `route_and_respond`
receives `user_memory=""` which is falsy — `generate_response()` skips the memory block
injection. This is the correct behavior.

### Saving memory — RAG path (before)
```python
new_count = save_user_memory(uid, request.message, result["response"])
if new_count % MEMORY_SUMMARIZE_EVERY_N == 0:
    asyncio.create_task(_regenerate_summary(...))
```

### Saving memory — RAG path (after)
```python
asyncio.create_task(mem0_service.add_turn(uid, request.message, result["response"]))
```

### Saving memory — non-RAG fallback path (after)
The `use_rag=False` fallback path (currently calls `save_user_memory`) must also write
to Mem0 after the change:
```python
asyncio.create_task(mem0_service.add_turn(uid, request.message, response_text))
```
No memory loading (search) is needed on the non-RAG path since `user_memory` is not
passed to `gemini_service.generate_chat_response_with_history`.

### Imports to remove from `chat.py`
- `generate_preference_summary` from `app.services.intent_router`
- `get_user_memory`, `save_user_memory`, `update_preference_summary`, `MEMORY_SUMMARIZE_EVERY_N` from `app.services.firestore_service`

### Imports to add to `chat.py`
- `mem0_service` from `app.services.mem0_service`

---

## Changes to `firestore_service.py`

Remove entirely:
- `USER_MEMORY_COLLECTION`
- `MEMORY_MAX_RECENT_MESSAGES`
- `MEMORY_SUMMARIZE_EVERY_N`
- `get_user_memory()`
- `save_user_memory()`
- `update_preference_summary()`

Keep: `delete_meal_from_firestore` and all other non-memory functions.

---

## Changes to `intent_router.py`

Remove:
- `SUMMARY_PROMPT` constant
- `generate_preference_summary()` function

No changes to `RouterState`, `route_and_respond()`, `generate_response()`, or any other node.

---

## Settings Changes

```python
# Memory (Mem0 OSS)
MEM0_COLLECTION_NAME: str = "sehatguru_user_memories"
```

No new API key — uses existing `GEMINI_API_KEY` and `CHROMA_PERSIST_DIR`.

---

## Dependencies

Add to `requirements.txt` (pinned to tested version):
```
mem0ai>=0.1.60,<0.2.0
```

Version `0.1.60` is the baseline tested version. The `<0.2.0` upper bound guards against
breaking API changes between minor versions. The memory result key `"memory"` is stable
across the `0.1.x` series.

---

## Testing

- **Unit:** `format_for_prompt([])` returns `""` (empty string)
- **Unit:** `format_for_prompt([{"memory": "X"}])` returns `"- X"`
- **Unit:** `format_for_prompt([{"other": "X"}])` returns `""` (missing key, skipped)
- **Integration:** `add_turn` → `search` → verify fact appears in formatted output
- **Integration:** add "User likes biryani", add "User dislikes biryani" → verify only the latter is returned by `search`
- **Resilience:** mock Mem0 `search` to raise → verify `search` returns `[]`, chat endpoint still returns a response
- **Resilience:** mock Mem0 `add_turn` to raise → verify exception is swallowed, no 500 error
- **Non-RAG path:** verify `add_turn` is called on the `use_rag=False` fallback path

---

## Migration Notes

- Existing `user_memory` Firestore documents can be left in place — they will simply go
  unused. No migration script needed.
- The `sehatguru_user_memories` ChromaDB collection is created automatically by Mem0 on
  first use.
- Users will start with empty Mem0 memory; facts accumulate from first message after
  deployment.
