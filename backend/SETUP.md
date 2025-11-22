# Quick Setup Guide - SehatGuru Backend

## ⚡ Quick Start (5 minutes)

### 1. Install Dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Firebase Setup

**Download Firebase Credentials:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → ⚙️ Settings → Service Accounts
3. Click "Generate New Private Key"
4. Save as `firebase-credentials.json` in the `backend/` folder

**Enable Firebase Services:**
- ✅ Firestore Database
- ✅ Authentication (Email/Password & Google)

### 3. Environment Setup

```bash
# Copy the example file
cp .env.example .env
```

**Edit `.env` and fill in these REQUIRED fields:**

```env
# Generate a random secret key (use: openssl rand -hex 32)
JWT_SECRET_KEY=your-random-secret-key-here

# Firebase - use credentials file path
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Email (Gmail)
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
```

### 4. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/Select Project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Add redirect URI: `http://localhost:8000/auth/google/callback`
5. Copy Client ID and Secret to `.env`

### 5. Get Gmail App Password

1. Enable 2FA on your Gmail account
2. Go to [Google Account](https://myaccount.google.com/)
3. Security → 2-Step Verification → App Passwords
4. Generate password for "Mail"
5. Copy to `.env` as `SMTP_PASSWORD`

### 6. Generate JWT Secret

```bash
# Run this command to generate a secure secret key
openssl rand -hex 32
```
Copy output to `.env` as `JWT_SECRET_KEY`

### 7. Run the Server

```bash
# Quick start
python main.py

# Or use uvicorn directly
uvicorn main:app --reload
```

### 8. Test the API

Open your browser:
- 📖 API Docs: http://localhost:8000/docs
- 🏠 Root: http://localhost:8000
- ❤️ Health: http://localhost:8000/health

## ✅ Verification Checklist

- [ ] Virtual environment activated
- [ ] Dependencies installed (`pip list` shows fastapi, firebase-admin, etc.)
- [ ] `.env` file created with all required values
- [ ] `firebase-credentials.json` exists in backend folder
- [ ] Server starts without errors
- [ ] http://localhost:8000/docs loads successfully
- [ ] Firebase connection successful (check server logs)
- [ ] No bcrypt compatibility warnings in logs

## 🧪 Quick Test

### Test Registration:
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com",
    "password": "test123"
  }'
```

### Test Login:
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

## 🧪 Automated Testing

Run the provided test scripts to verify everything works:

### Test All Auth Features
```bash
python test_auth.py
```
Tests: Register, Login, /me, Refresh token, Logout

### Test Password Reset
```bash
python test_password_reset.py
```
Verifies: Old password doesn't work after reset, new password works

### Test Email Verification Sync
```bash
python test_email_verification.py
```
Verifies: Auto-sync from Firebase Auth to Firestore

### Test Google OAuth
**Note:** First update `test_google_auth.html` line 75 - replace `YOUR-GOOGLE-CLIENT-ID` with your actual Google Client ID from `.env`

```bash
# Open in browser (easiest):
http://localhost:8000/test-google-auth

# Or with token:
python test_google_oauth.py
```

## 🔧 Troubleshooting

### Issue: "Firebase credentials not found"
**Solution:** Ensure `firebase-credentials.json` exists and `FIREBASE_CREDENTIALS_PATH` is set in `.env`

### Issue: "Error sending email"
**Solution:**
- Check Gmail app password is correct
- Ensure 2FA is enabled on Gmail
- Verify `SMTP_USER` and `SMTP_PASSWORD` in `.env`

### Issue: "bcrypt compatibility error"
**Solution:**
```bash
pip uninstall bcrypt passlib -y
pip install -r requirements.txt
```

### Issue: "CORS error from frontend"
**Solution:**
For development, `.env` already has `ALLOWED_ORIGINS=*` which allows all origins.
For production, set specific origins:
```env
ALLOWED_ORIGINS=https://yourdomain.com
```

### Issue: "Port 8000 already in use"
**Solution:** Change port in `.env`:
```env
PORT=8001
```

### Issue: "Google OAuth 'Failed to fetch'"
**Solution:** Access test page from server:
```
http://localhost:8000/test-google-auth
```
(Don't open the HTML file directly)

### Issue: "Wrong password still works after reset"
**Solution:** This was a bug that's now fixed. Make sure you:
1. Pull latest code
2. Restart the server
3. Try password reset again

## 📚 Next Steps

1. Read the full [README.md](./README.md) for detailed documentation
2. Explore API endpoints at http://localhost:8000/docs
3. Test all authentication flows
4. Proceed to Phase 3: User Profile Management

## 🚀 Quick Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run server (development)
python main.py

# Run with auto-reload
uvicorn main:app --reload

# Run on different port
uvicorn main:app --port 8001

# Check Python packages
pip list

# Update dependencies
pip install --upgrade -r requirements.txt
```

## 📞 Need Help?

- Check server logs for error messages
- Verify all environment variables are set
- Ensure Firebase project is configured correctly
- Check firewall/antivirus isn't blocking port 8000
