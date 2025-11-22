import firebase_admin
from firebase_admin import credentials, auth, firestore
from app.config.settings import settings
import json
import os


class FirebaseClient:
    """Firebase Admin SDK client wrapper"""

    _instance = None
    _db = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirebaseClient, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initialize Firebase Admin SDK"""
        try:
            # Check if Firebase app is already initialized
            if not firebase_admin._apps:
                # Try to use service account file if provided
                if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
                    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                    firebase_admin.initialize_app(cred)
                    print("Firebase initialized with service account file")
                # Otherwise, use environment variables
                elif settings.FIREBASE_PROJECT_ID and settings.FIREBASE_PRIVATE_KEY:
                    # Construct service account dictionary from environment variables
                    service_account_info = {
                        "type": "service_account",
                        "project_id": settings.FIREBASE_PROJECT_ID,
                        "private_key_id": settings.FIREBASE_PRIVATE_KEY_ID,
                        "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
                        "client_email": settings.FIREBASE_CLIENT_EMAIL,
                        "client_id": settings.FIREBASE_CLIENT_ID,
                        "auth_uri": settings.FIREBASE_AUTH_URI,
                        "token_uri": settings.FIREBASE_TOKEN_URI,
                        "auth_provider_x509_cert_url": settings.FIREBASE_AUTH_PROVIDER_CERT_URL,
                        "client_x509_cert_url": settings.FIREBASE_CLIENT_CERT_URL,
                    }
                    cred = credentials.Certificate(service_account_info)
                    firebase_admin.initialize_app(cred)
                    print("Firebase initialized with environment variables")
                else:
                    raise ValueError(
                        "Firebase credentials not found. Please provide either "
                        "FIREBASE_CREDENTIALS_PATH or Firebase environment variables."
                    )

            # Initialize Firestore client
            self._db = firestore.client()
            print("Firestore client initialized successfully")

        except Exception as e:
            print(f"Error initializing Firebase: {str(e)}")
            raise

    @property
    def db(self):
        """Get Firestore database client"""
        if self._db is None:
            self._db = firestore.client()
        return self._db

    def get_auth(self):
        """Get Firebase Auth instance"""
        return auth

    def verify_id_token(self, id_token: str):
        """Verify Firebase ID token"""
        try:
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
        except Exception as e:
            raise ValueError(f"Invalid token: {str(e)}")

    def get_user(self, uid: str):
        """Get user by UID"""
        try:
            return auth.get_user(uid)
        except Exception as e:
            raise ValueError(f"User not found: {str(e)}")

    def create_user(self, email: str, password: str = None, display_name: str = None, **kwargs):
        """Create a new Firebase user"""
        try:
            user_params = {
                "email": email,
                "display_name": display_name,
            }

            # Add password if provided (for email/password auth)
            if password:
                user_params["password"] = password
                user_params["email_verified"] = False

            # Add any additional parameters (for OAuth)
            user_params.update(kwargs)

            user = auth.create_user(**user_params)
            return user
        except Exception as e:
            raise ValueError(f"Error creating user: {str(e)}")

    def update_user(self, uid: str, **kwargs):
        """Update user information"""
        try:
            return auth.update_user(uid, **kwargs)
        except Exception as e:
            raise ValueError(f"Error updating user: {str(e)}")

    def delete_user(self, uid: str):
        """Delete a user"""
        try:
            auth.delete_user(uid)
            return True
        except Exception as e:
            raise ValueError(f"Error deleting user: {str(e)}")

    def generate_email_verification_link(self, email: str):
        """Generate email verification link"""
        try:
            link = auth.generate_email_verification_link(
                email,
                action_code_settings=None
            )
            return link
        except Exception as e:
            raise ValueError(f"Error generating verification link: {str(e)}")

    def generate_password_reset_link(self, email: str):
        """Generate password reset link"""
        try:
            link = auth.generate_password_reset_link(
                email,
                action_code_settings=None
            )
            return link
        except Exception as e:
            raise ValueError(f"Error generating password reset link: {str(e)}")


# Create singleton instance
firebase_client = FirebaseClient()
