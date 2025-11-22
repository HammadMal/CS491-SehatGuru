# SehatGuru Backend API

FastAPI backend for SehatGuru - An intelligent nutrition tracking and advisory system.

## Features

### Phase 1 & 2 - Authentication (Completed)
- ✅ Email/Password Registration with Firebase Auth
- ✅ Email/Password Login with JWT tokens & password verification
- ✅ Google OAuth Authentication
- ✅ Email Verification with auto-sync
- ✅ Password Reset Flow (Forgot/Reset)
- ✅ Session Invalidation on Password Reset
- ✅ JWT Access & Refresh Tokens
- ✅ Token Refresh Endpoint
- ✅ Token Blacklist & Logout
- ✅ User Profile Retrieval
- ✅ Account Deletion

## Tech Stack

- **Framework**: FastAPI
- **Authentication**: Firebase Auth + JWT
- **Database**: Firebase Firestore
- **Password Hashing**: Passlib with BCrypt
- **Token Management**: PyJWT & Python-Jose
- **Email**: SMTP (Gmail)

## Project Structure

```
backend/
├── app/
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py       # App configuration
│   │   └── firebase.py       # Firebase client
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── auth.py           # Auth middleware & dependencies
│   ├── models/
│   │   ├── __init__.py
│   │   └── auth.py           # Pydantic models for auth
│   ├── routes/
│   │   ├── __init__.py
│   │   └── auth.py           # Auth endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   └── auth_service.py   # Auth business logic
│   └── utils/
│       ├── __init__.py
│       ├── jwt.py            # JWT utilities
│       ├── password.py       # Password hashing
│       └── email.py          # Email utilities
├── main.py                   # FastAPI app entry point
├── requirements.txt          # Python dependencies
├── .env.example             # Environment variables template
└── README.md                # This file
```

## Setup Instructions

### 1. Prerequisites

- Python 3.8+
- Firebase Project with Firestore enabled
- Google OAuth credentials (for Google login)
- SMTP email account (Gmail recommended)

### 2. Installation

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Firestore Database**
4. Enable **Authentication** → Email/Password and Google providers
5. Generate service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `firebase-credentials.json` in backend folder

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `http://localhost:8000/auth/google/callback`
4. Copy Client ID and Client Secret

### 5. Email Setup (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account → Security → App Passwords
   - Generate password for "Mail"
3. Use this app password in `.env` file

### 6. Environment Configuration

```bash
# Copy example env file
cp .env.example .env

# Edit .env and fill in your credentials
```

Required environment variables:
```env
# JWT
JWT_SECRET_KEY=your-secret-key-here

# Firebase (if not using credentials file)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
# OR use credentials file path
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email (Gmail)
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## Running the Server

```bash
# Development mode (with auto-reload)
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication Endpoints

All auth endpoints are prefixed with `/api/auth`

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepass123"
}
```

#### Google OAuth
```http
POST /api/auth/google
Content-Type: application/json

{
  "id_token": "google-id-token-from-client"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer <refresh_token>
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "new_password": "newsecurepass123"
}
```

#### Request Email Verification
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

#### Delete Account
```http
DELETE /api/auth/delete-account
Authorization: Bearer <access_token>
```

#### Admin: Delete User by Email (Development Only)
```http
DELETE /api/auth/admin/delete-user-by-email/{email}
```

### Testing Endpoints

#### Test Google OAuth (Development Only)
```http
GET /test-google-auth
```
Opens an HTML page to test Google OAuth flow in the browser.

## Authentication Flow

### Email/Password Flow
1. User registers via `/api/auth/register`
2. Verification email sent
3. User verifies email (handled by Firebase)
4. User logs in via `/api/auth/login`
5. Backend returns access_token and refresh_token
6. Client uses access_token for protected endpoints
7. When access_token expires, use refresh_token at `/api/auth/refresh`

### Google OAuth Flow
1. Client obtains Google ID token using Google Sign-In
2. Client sends ID token to `/api/auth/google`
3. Backend verifies token with Google
4. Backend creates/updates user in Firebase
5. Backend returns JWT access_token and refresh_token

### Password Reset Flow
1. User requests reset via `/api/auth/forgot-password`
2. Backend sends email with reset link containing token
3. User clicks link, frontend extracts token
4. User submits new password with token to `/api/auth/reset-password`
5. Backend verifies token and updates password
6. **All existing sessions are invalidated** - user must login again with new password

## Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT tokens with expiration
- ✅ Separate access and refresh tokens
- ✅ Session invalidation on password reset
- ✅ Email verification
- ✅ Secure password reset with time-limited tokens
- ✅ Token blacklist for logout
- ✅ CORS configuration
- ✅ HTTPS/TLS ready
- ✅ Input validation with Pydantic
- ✅ Firebase Auth integration

## Testing

### Automated Test Scripts

We provide several test scripts to verify functionality:

#### Test All Authentication
```bash
python test_auth.py
```
Tests: Register → Login → /me → Refresh → Logout

#### Test Password Reset
```bash
python test_password_reset.py
```
Tests: Reset flow, old password rejection, new password works

#### Test Session Invalidation
```bash
python test_session_invalidation.py
```
Tests: Session invalidation when password is reset
- Old session works before reset ✓
- Old session fails after reset ✓
- Old password rejected ✓
- New password works ✓
- New session works ✓

#### Test Email Verification
```bash
python test_email_verification.py
```
Tests: Auto-sync of email_verified status from Firebase Auth to Firestore

#### Test Google OAuth
```bash
# Option 1: Interactive (opens browser)
http://localhost:8000/test-google-auth

# Option 2: With token
python test_google_oauth.py <google_id_token>
```

### Manual Testing with Swagger

1. Go to http://localhost:8000/docs
2. For protected endpoints:
   - Login first to get access token
   - Click 🔓 **Authorize** button (top right)
   - Enter: `Bearer your_access_token_here`
   - Click **Authorize**
3. Try the endpoints

**Important:** Use the **refresh_token** (not access_token) for `/api/auth/refresh` endpoint!

## Next Steps (Phase 3+)

- [ ] User Profile Management
- [ ] Food Database Integration
- [ ] Food Logging (Manual & Camera)
- [ ] AI Chatbot with Gemini API
- [ ] Meal Planning
- [ ] Analytics Dashboard
- [ ] Notifications

## Troubleshooting

### Firebase Connection Issues
- Ensure `firebase-credentials.json` exists and is valid
- Check Firebase project ID matches your configuration
- Verify Firestore is enabled in Firebase Console

### Email Not Sending
- Verify Gmail app password is correct
- Check SMTP settings in `.env`
- Ensure 2FA is enabled on Gmail account

### JWT Token Errors
- Ensure `JWT_SECRET_KEY` is set in `.env`
- Check token expiration times
- Verify token format in Authorization header: `Bearer <token>`

### bcrypt Compatibility Issues
If you see `(trapped) error reading bcrypt version`:
```bash
pip uninstall bcrypt passlib -y
pip install -r requirements.txt
```

### CORS Errors from Frontend
- For development: `.env` has `ALLOWED_ORIGINS=*`
- For production: Set specific origins like `ALLOWED_ORIGINS=https://yourdomain.com`
- Restart server after changing `.env`

### Google OAuth "Failed to fetch"
- Make sure you're accessing via `http://localhost:8000/test-google-auth` (not opening HTML file directly)
- Check CORS settings allow requests
- Verify Google Client ID is correct in both `.env` and HTML test file

### Email Verification Not Updating
- The `/me` endpoint auto-syncs `email_verified` from Firebase Auth
- First call after verification will sync the status
- Check server logs for "Synced email_verified status" message

### Password Reset Not Working
- After reset, old password should NOT work
- If old password still works, check server logs for errors
- Ensure `hashed_password` field is being updated in Firestore

### Session Not Invalidated After Password Reset
- All existing tokens should fail with "Your password was changed" message
- Check that `password_changed_at` field exists and is being updated in Firestore
- Verify token includes `iat` (issued at) timestamp
- Run `python test_session_invalidation.py` to verify functionality

### Datetime Comparison Errors
If you see `"can't compare offset-naive and offset-aware datetimes"`:
- This has been fixed in `app/middleware/auth.py`
- Ensure you have the latest code that handles timezone conversion
- The fix strips timezone info before comparing timestamps

### User Already Exists Error
- User might exist in Firebase Auth but not Firestore (or vice versa)
- Use admin endpoint to clean up: `DELETE /api/auth/admin/delete-user-by-email/{email}`
- Or delete manually from Firebase Console → Authentication → Users

## License

MIT License - SehatGuru Team
