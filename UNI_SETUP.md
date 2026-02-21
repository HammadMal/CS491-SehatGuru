# Running SehatGuru at Uni

## One-time Setup

### 1. Enable USB Debugging on your Android phone
- Settings → About Phone → tap **Build Number** 7 times
- Settings → Developer Options → enable **USB Debugging**

### 2. Update config.ts
Change `app/config.ts` line 7 to use localhost:
```ts
export const API_BASE_URL = 'http://localhost:8000';
```

---

## Every Time at Uni

### Step 1: Plug in your phone via USB
When prompted on your phone, tap **Allow USB Debugging** (check "Always allow from this computer").

### Step 2: Verify connection
```bash
adb devices
# Should show your device, not "unauthorized"
# If unauthorized: adb kill-server → adb start-server → check phone screen
```

### Step 3: Forward ports over USB
```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8000 tcp:8000
```

### Step 4: Start the backend
```bash
cd backend
python main.py
```

### Step 5: Start Expo
```bash
cd app
npx expo start --localhost
```

### Step 6: Open Expo Go on your phone
Scan the QR code or manually enter:
```
exp://localhost:8081
```

---

## How it works
- **Metro (Expo) ↔ Phone**: USB cable, no WiFi needed
- **Backend API ↔ Phone**: USB cable, no WiFi needed
- **Firebase auth**: phone's mobile data or WiFi (works on any network)
- **Gemini API**: your laptop calls it, needs internet (uni WiFi is fine for this)
