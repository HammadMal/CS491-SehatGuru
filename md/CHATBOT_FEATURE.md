# AI Wellness Chatbot Feature

## Overview

The SehatGuru chatbot is an AI-powered wellness coach that provides instant fitness and nutrition guidance using Google's Gemini 2.0 Flash model. It offers users real-time answers to questions about exercise, nutrition, meal planning, and healthy lifestyle choices.

## Architecture

### Backend Proxy Pattern

The chatbot uses a **backend proxy architecture** for security and scalability:

```
Frontend (React Native)
    ↓ HTTP Request with JWT
Backend (FastAPI)
    ↓ Gemini API Call
Google Gemini API
    ↓ Response
Backend (Process & Validate)
    ↓ JSON Response
Frontend (Display in Chat UI)
```

**Security Benefits:**
- API key never exposed to frontend
- Server-side rate limiting
- Request validation and filtering
- Response processing and sanitization

## Features

### 1. **Real-Time Chat Interface**
- Modern, wellness-focused UI with smooth animations
- Message bubbles with distinct user/bot styling
- Markdown support for formatted responses (bold, italic, lists, code)
- Typing indicators with animated dots
- Auto-scroll to latest messages
- Session-only chat history (not persisted)

### 2. **Smart Keyboard Handling**
- Automatic scroll adjustment when keyboard appears
- Dynamic padding for better visibility
- Smooth transitions and animations

### 3. **Intelligent Responses**
- Fitness and nutrition-focused system prompt
- Concise, actionable advice
- General wellness Q&A (future: personalized responses)

### 4. **Empty State with Suggestions**
- Welcoming onboarding screen
- Interactive suggestion bubbles:
  - "💪 What exercises burn the most calories?"
  - "🥗 How much protein should I eat daily?"
  - "🏃 Tips for starting a running routine"
- One-tap to populate input field

## Technical Implementation

### Backend Components

#### 1. Configuration
**File:** `backend/.env`
```bash
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-2.0-flash-exp
```

**File:** `backend/app/config/settings.py`
```python
GEMINI_API_KEY: str = ""
GEMINI_MODEL: str = "gemini-2.0-flash-exp"
```

#### 2. Gemini Service
**File:** `backend/app/services/gemini_service.py`

```python
class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        self.system_prompt = (
            "You are a helpful fitness and nutrition assistant. "
            "Provide accurate, helpful advice about exercise, nutrition, "
            "meal planning, and healthy lifestyle choices. "
            "Keep responses concise and actionable."
        )

    async def generate_chat_response(self, message: str) -> str:
        # Combines system prompt with user message
        # Returns formatted response
```

#### 3. Chat Models
**File:** `backend/app/models/chat.py`

```python
class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

class ChatMessageResponse(BaseModel):
    response: str
```

#### 4. Chat Route
**File:** `backend/app/routes/chat.py`

**Endpoint:** `POST /api/chat/message`
- **Authentication:** Required (JWT token)
- **Rate Limiting:** Server-side
- **Request:** `{ message: string }`
- **Response:** `{ response: string }`

### Frontend Components

#### 1. Chat Types
**File:** `app/types/chat.types.ts`

```typescript
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatResponse {
  response: string;
}
```

#### 2. Chat Store (Zustand)
**File:** `app/store/useChatStore.ts`

```typescript
interface ChatState {
  messages: Message[];
  isLoading: boolean;
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
}
```

**Features:**
- In-memory message storage
- No persistence (session-only)
- Loading state management

#### 3. Chat API Service
**File:** `app/services/chat.api.ts`

```typescript
export const chatAPI = {
  sendMessage: async (message: string): Promise<ChatResponse> => {
    const response = await apiClient.post('/api/chat/message', { message });
    return response.data;
  }
};
```

#### 4. Chat Message Component
**File:** `app/components/ChatMessage.tsx`

**Features:**
- Animated fade-in and slide-up on mount
- Markdown rendering for bot messages
- Distinct styling for user vs bot messages
- Timestamp display
- Subtle shadows and rounded corners

#### 5. Chatbot Screen
**File:** `app/app/(tabs)/chatbot.tsx`

**Layout:**
- Header with wellness coach branding
- Scrollable message list
- Empty state with suggestions
- Loading indicator (typing dots)
- Bottom input bar with send button

## User Flow

### First-Time Experience
1. User opens Chatbot tab
2. Sees welcoming empty state with sparkles icon
3. Reads "Your AI Wellness Coach" message
4. Views 3 suggestion bubbles
5. Taps suggestion to auto-populate input

### Chat Interaction
1. User types message or selects suggestion
2. Message sent to backend with JWT token
3. User message appears immediately (green bubble, right-aligned)
4. Loading indicator shows "typing dots"
5. Bot response received and rendered with markdown
6. Bot message appears (white bubble with border, left-aligned)
7. Conversation continues in session

### Keyboard Behavior
1. User taps input field
2. Keyboard appears
3. Chat auto-scrolls to show latest message
4. Dynamic padding prevents message hiding
5. Send button sends message and dismisses keyboard

## UI/UX Design

### Color Palette
- **Primary Green:** `#22c55e` (brand color)
- **Background:** `#F8FAFB` (soft gray)
- **Message Bubbles:**
  - User: Green with white text
  - Bot: White with gray border and black text
- **Accent:** Green for loading dots and send button

### Typography
- **Header Title:** 18px, bold
- **Header Subtitle:** 12px, medium
- **Messages:** 15px, regular
- **Timestamps:** 10px, light

### Animations
- Message fade-in: 300ms
- Message slide-up: 300ms
- Keyboard transitions: Smooth with native driver
- Loading dots: Pulsing opacity animation

## Dependencies

### Backend
```txt
google-generativeai>=0.3.0  # Gemini SDK
```

### Frontend
```json
"react-native-markdown-display": "^7.0.2"  // Markdown rendering
```

## Setup Instructions

### Backend Setup

1. **Install dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Configure Gemini API:**
   - Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Copy `backend/.env.example` to `backend/.env`
   - Add your API key:
   ```bash
   GEMINI_API_KEY=your-actual-api-key
   GEMINI_MODEL=gemini-2.0-flash-exp
   ```

3. **Restart backend:**
```bash
python main.py
```

### Frontend Setup

1. **Install dependencies:**
```bash
cd app
npm install
```

2. **Run the app:**
```bash
npm run android
# or
npm run ios
```

## API Testing

### Using cURL
```bash
# 1. Login first to get access token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# 2. Send chat message
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"message": "What exercises burn the most calories?"}'
```

### Using FastAPI Docs
1. Navigate to http://localhost:8000/docs
2. Click "Authorize" button
3. Login to get access token
4. Use `/api/chat/message` endpoint
5. Test with sample messages

## Future Enhancements

### Planned Features
- [ ] **Personalized Responses:** Include user profile data (health goals, dietary restrictions, recent meals)
- [ ] **Conversation History:** Persist chat history to Firestore for cross-device access
- [ ] **Meal Generation:** Chatbot suggests meals with nutrition info, user approves to add to dashboard
- [ ] **Voice Input:** Speech-to-text for hands-free interaction
- [ ] **Streaming Responses:** Real-time token-by-token response display
- [ ] **Follow-up Questions:** Smart suggestions based on conversation context
- [ ] **Multi-modal Input:** Image analysis for meal questions

### Technical Improvements
- [ ] Rate limiting per user
- [ ] Response caching for common questions
- [ ] Context window management for long conversations
- [ ] A/B testing for different system prompts
- [ ] Analytics and usage tracking

## Bug Fixes Applied

### Issue 1: Consent Screen Loop
**Problem:** Users saw consent screen on every login, even after completing onboarding.

**Root Cause:** `CONSENT_ACCEPTED` flag wasn't being set when onboarding completed.

**Solution:**
- Updated `OnboardingContext.tsx` to set both flags on completion
- Added fallback logic in `AuthContext.tsx` to auto-fix inconsistent state
- Retroactive fix for existing users

**Files Modified:**
- `app/context/OnboardingContext.tsx`
- `app/context/AuthContext.tsx`

### Issue 2: No Dashboard Redirect After Meal Addition
**Problem:** After adding a meal via camera or manual entry, users stayed on the add screen instead of being redirected to dashboard.

**Solution:**
- Added `router.push("/(tabs)/")` after successful meal save
- 150ms delay for smooth modal close animation
- Works for both camera and manual entry flows

**Files Modified:**
- `app/app/(tabs)/camera.tsx`
- `app/app/manual.tsx`

### Issue 3: Meal Type Preselection
**Problem:** AddMealModal always defaulted to "Dinner" regardless of which section's "+" button was clicked.

**Solution:**
- Pass `mealType` as URL parameter from dashboard
- Camera and manual screens read parameter and pass to modal
- Modal uses `defaultMealType` prop to initialize state
- Preserves meal type when switching from camera to manual

**Files Modified:**
- `app/app/(tabs)/index.tsx` - Pass mealType in URL
- `app/app/(tabs)/camera.tsx` - Read and forward mealType
- `app/app/manual.tsx` - Read and forward mealType
- `app/components/AddMealModal.tsx` - Accept defaultMealType prop

## Performance Considerations

### Response Time
- **Average:** 1-3 seconds for simple queries
- **Complex:** 3-5 seconds for detailed explanations
- **Network dependent:** May vary with internet speed

### Memory Usage
- **Session-only storage:** Minimal memory footprint
- **No persistence:** Reduces database operations
- **Efficient rendering:** Markdown library optimized for mobile

### Rate Limiting
- **Backend:** Can implement per-user rate limits
- **Frontend:** Debounced send button (prevents spam)
- **API:** Gemini API has built-in rate limits

## Accessibility

- ✅ Keyboard navigation support
- ✅ Screen reader friendly (semantic HTML)
- ✅ High contrast text
- ✅ Touch-friendly button sizes (44x44px minimum)
- ✅ Clear visual feedback for all interactions

## Security

### Authentication
- All requests require valid JWT token
- Token validation on backend
- Automatic token refresh

### API Key Protection
- Never exposed to frontend
- Stored in environment variables
- Not committed to version control

### Input Validation
- Message length limited (1-2000 characters)
- Request sanitization on backend
- Response filtering (future enhancement)

## Troubleshooting

### Chatbot Not Responding
1. Check backend is running
2. Verify Gemini API key in `.env`
3. Check network connection
4. Review backend logs for errors

### Markdown Not Rendering
1. Ensure `react-native-markdown-display` is installed
2. Clear cache: `npx expo start --clear`
3. Rebuild app

### Messages Not Appearing
1. Check user authentication
2. Verify JWT token is valid
3. Check console for API errors
4. Ensure chat store is initialized

## Contributing

When adding features to the chatbot:
1. Update system prompt in `gemini_service.py`
2. Test with various question types
3. Ensure markdown rendering works
4. Add appropriate error handling
5. Update this documentation

## License

This feature is part of the SehatGuru project and follows the same MIT License.

---

**Last Updated:** December 2025
**Author:** SehatGuru Development Team
