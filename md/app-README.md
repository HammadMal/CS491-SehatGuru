# SehatGuru Mobile App

A React Native mobile application built with Expo and TypeScript.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Android Studio with Android Emulator configured
- Expo CLI (will be installed automatically)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure backend URL:
   - Open `config.ts`
   - Update `API_BASE_URL` if needed
   - For Android Emulator: use `http://10.0.2.2:8000` (default)
   - For physical device: use your computer's IP address (e.g., `http://192.168.1.x:8000`)

## Running on Android Emulator

1. **Start your Android Emulator** from Android Studio

2. **Start the backend server** (in a separate terminal):
```bash
cd ../backend
# Follow backend setup instructions
```

3. **Start the Expo development server**:
```bash
npm run android
```

This will:
- Start the Metro bundler
- Build and install the app on your emulator
- Open the app automatically

## Alternative: Manual Start

If you prefer to start the development server first and then build:

```bash
npm start
```

Then press `a` to open on Android emulator.

## Features

### Authentication & Onboarding
- Email/password registration and login
- Google OAuth integration
- Email verification with OTP
- Password reset flow
- Personalized health profile setup
- Privacy consent flow

### Dashboard & Meal Tracking
- Real-time calorie and macro tracking
- AI-powered food detection via camera
- Manual meal logging with nutrition database
- Meal history organized by type (Breakfast, Lunch, Dinner, Snack)
- Firebase persistence for cross-device sync
- Smart meal type preselection

### AI Wellness Chatbot
- **Powered by:** Google Gemini 2.0 Flash
- Instant fitness and nutrition guidance
- Real-time Q&A interface
- Markdown-formatted responses
- Session-based chat (no persistence)
- Smart suggestion bubbles
- See [CHATBOT_FEATURE.md](CHATBOT_FEATURE.md) for details

## Project Structure

```
app/
├── app/
│   ├── (auth)/              # Authentication screens
│   ├── (onboarding)/        # Onboarding flow
│   ├── (tabs)/              # Main app tabs
│   │   ├── index.tsx       # Dashboard
│   │   ├── camera.tsx      # Food detection
│   │   ├── chatbot.tsx     # AI wellness coach
│   │   └── profile.tsx     # User profile
│   └── manual.tsx          # Manual meal entry
├── components/             # Reusable UI components
├── context/               # React context providers
├── hooks/                 # Custom React hooks
├── services/              # API services
│   ├── api.ts            # Base API client
│   ├── auth.api.ts       # Authentication API
│   ├── user.api.ts       # User profile API
│   ├── chat.api.ts       # Chatbot API
│   └── meals.firestore.ts # Firestore meals service
├── store/                 # Zustand state management
│   ├── useMealStore.ts   # Meal tracking store
│   └── useChatStore.ts   # Chat state store
├── types/                 # TypeScript type definitions
├── constants/            # App constants (colors, styles)
├── config.ts             # Configuration (API URL)
└── package.json          # Dependencies
```

## Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run in web browser

## Key Dependencies

```json
{
  "expo": "~54.0.24",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "expo-router": "~6.0.15",
  "firebase": "^9.22.0",
  "axios": "^1.13.2",
  "zustand": "^5.0.9",
  "react-native-markdown-display": "^7.0.2"
}
```

## Testing Backend Connection

The app requires a running backend server for full functionality:
- Authentication endpoints
- Food detection API
- Chatbot (Gemini) API
- User profile management

## Troubleshooting

**Connection refused error:**
- Ensure backend server is running
- Check that you're using `10.0.2.2` for Android Emulator (not `localhost`)
- Verify backend is running on port 8000

**Build errors:**
- Try clearing cache: `npx expo start --clear`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

**Emulator not detected:**
- Ensure Android Emulator is running before executing `npm run android`
- Check ADB connection: `adb devices`

**Chatbot not working:**
- Ensure backend has Gemini API key configured in `.env`
- Verify you're logged in (JWT token required)
- Check backend logs for Gemini API errors

## Documentation

- [Authentication & Onboarding Guide](AUTHENTICATION_ONBOARDING_DOCS.md)
- [Dashboard & Camera Feature Guide](DASHBOARD_CAMERAFEATURE.md)
- [AI Chatbot Feature Guide](CHATBOT_FEATURE.md)
