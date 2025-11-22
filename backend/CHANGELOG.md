# SehatGuru Backend - Changelog

## Phase 1 & 2 Completion - Authentication System

### ✅ Completed Features

#### Core Authentication
- **Email/Password Registration** - Creates user in Firebase Auth + Firestore with hashed password
- **Email/Password Login** - Server-side password verification using bcrypt
- **Google OAuth** - Seamless Google Sign-In integration
- **JWT Tokens** - Access tokens (30 min) and refresh tokens (7 days)
- **Token Refresh** - Refresh expired access tokens
- **Logout** - Token blacklist system to invalidate tokens
- **Account Deletion** - Remove user from both Firebase Auth and Firestore

#### Email & Password Management
- **Email Verification** - Firebase-generated verification links
- **Email Verification Sync** - Auto-sync verified status from Firebase Auth to Firestore
- **Forgot Password** - Sends password reset email with time-limited token
- **Reset Password** - Updates password in both Firebase Auth and Firestore
- **Session Invalidation** - All existing tokens invalidated when password is reset
- **Password Validation** - Minimum 6 characters, properly hashed with bcrypt

#### Security Features
- ✅ Bcrypt password hashing (server-side)
- ✅ JWT access & refresh tokens with expiration
- ✅ Session invalidation on password reset (timestamp-based)
- ✅ Token blacklist for logout
- ✅ HTTPS-ready configuration
- ✅ CORS protection (configurable)
- ✅ Input validation with Pydantic
- ✅ Firebase Auth integration
- ✅ Prevents Google users from resetting password

### 🐛 Bugs Fixed

1. **bcrypt Compatibility** - Fixed version mismatch between passlib and bcrypt
2. **Password Verification** - Now properly verifies passwords on login (was accepting any password)
3. **Password Reset** - Now updates hashed password in Firestore (old password is rejected)
4. **Email Verification Sync** - Auto-syncs `email_verified` from Firebase Auth to Firestore
5. **Google OAuth** - Fixed `create_user` to work without password parameter
6. **CORS Issues** - Added wildcard CORS for development testing
7. **Timezone Comparison** - Fixed datetime comparison error in session invalidation (naive vs aware)

### 📁 Project Structure

```
backend/
├── app/
│   ├── config/
│   │   ├── settings.py          # Environment config with Pydantic
│   │   └── firebase.py          # Firebase Admin SDK client
│   ├── middleware/
│   │   └── auth.py              # JWT auth, token verification, blacklist
│   ├── models/
│   │   ├── auth.py              # Pydantic models for requests/responses
│   │   └── token_blacklist.py   # In-memory token blacklist
│   ├── routes/
│   │   └── auth.py              # 11 authentication endpoints
│   ├── services/
│   │   └── auth_service.py      # Business logic for auth operations
│   └── utils/
│       ├── jwt.py               # Token creation & verification
│       ├── password.py          # Bcrypt hashing
│       └── email.py             # SMTP email sending
├── main.py                      # FastAPI app with CORS & error handling
├── requirements.txt             # Python dependencies (fixed bcrypt)
├── .env.example                 # Environment variables template
├── .env                         # Your environment config
├── firebase-credentials.json    # Firebase service account key
├── test_auth.py                 # Test all auth flows
├── test_password_reset.py       # Test password reset
├── test_session_invalidation.py # Test session invalidation on password reset
├── test_email_verification.py   # Test email sync
├── test_google_oauth.py         # Test Google OAuth
├── test_google_auth.html        # Browser-based Google OAuth test
├── README.md                    # Complete documentation
├── SETUP.md                     # Quick setup guide
└── CHANGELOG.md                 # This file
```

### 🔌 API Endpoints

#### Authentication (11 endpoints)
- `POST /api/auth/register` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Authenticate with Google
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout and invalidate token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/verify-email` - Request verification email
- `DELETE /api/auth/delete-account` - Delete user account
- `DELETE /api/auth/admin/delete-user-by-email/{email}` - Admin cleanup (dev only)

#### Testing (1 endpoint)
- `GET /test-google-auth` - HTML page to test Google OAuth

### 🧪 Testing

#### Automated Test Scripts
- `test_auth.py` - Complete auth flow test
- `test_password_reset.py` - Password reset verification
- `test_session_invalidation.py` - Session invalidation on password reset
- `test_email_verification.py` - Email sync test
- `test_google_oauth.py` - Google OAuth test

#### Manual Testing
- Swagger UI: http://localhost:8000/docs
- Google OAuth Test: http://localhost:8000/test-google-auth

### 📦 Dependencies

Key packages:
- **fastapi** - Web framework
- **uvicorn** - ASGI server
- **pydantic** - Data validation
- **firebase-admin** - Firebase integration
- **bcrypt** - Password hashing (v4.0.1 for compatibility)
- **passlib** - Password utilities (v1.7.4)
- **python-jose** - JWT handling
- **google-auth** - Google OAuth

### 🔑 Environment Variables

Required:
- `JWT_SECRET_KEY` - Secret for JWT signing
- `FIREBASE_CREDENTIALS_PATH` - Path to Firebase service account JSON
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- `SMTP_USER` - Gmail address for sending emails
- `SMTP_PASSWORD` - Gmail app password

Optional:
- `ALLOWED_ORIGINS` - CORS origins (default: `*` for dev)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiry (default: 30)
- `REFRESH_TOKEN_EXPIRE_DAYS` - Refresh token expiry (default: 7)

### 🚀 Quick Start

```bash
# 1. Setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 2. Configure
cp .env.example .env
# Edit .env with your credentials

# 3. Run
python main.py

# 4. Test
python test_auth.py
# or visit http://localhost:8000/docs
```

### 📝 Notes

- **Production Ready**: Remove `ALLOWED_ORIGINS=*` and admin endpoints before deploying
- **Token Blacklist**: Currently in-memory (use Redis for production multi-server setup)
- **Session Invalidation**: Timestamp-based using `password_changed_at` field and JWT `iat` claim
- **Email Sync**: Happens automatically on first `/me` call after verification
- **Password Storage**: Hashed in Firestore for server-side verification (not relying on Firebase Auth password verification)

### 🎯 Next Phase

Phase 3 will include:
- User Profile Management (demographics, goals, preferences)
- Food Database Integration (200+ Pakistani dishes)
- Food Logging (manual and camera-based)
- AI Chatbot with Gemini API
- Meal Planning & Recommendations

---

**Version:** 1.0.0
**Date:** November 15, 2024
**Team:** SehatGuru Development Team
