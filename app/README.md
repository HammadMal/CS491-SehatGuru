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

## Project Structure

```
app/
├── App.tsx              # Main app component
├── config.ts            # Configuration (API URL, etc.)
├── services/
│   └── api.ts          # API service layer
├── assets/             # Images, fonts, etc.
└── package.json        # Dependencies
```

## Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run in web browser

## Testing Backend Connection

The app includes a "Test Backend Connection" button on the home screen to verify connectivity with your backend server.

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
