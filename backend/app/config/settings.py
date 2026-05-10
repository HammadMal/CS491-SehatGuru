from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings and configuration"""

    # Application
    APP_NAME: str = "SehatGuru"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Firebase
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_PRIVATE_KEY_ID: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    FIREBASE_CLIENT_EMAIL: str = ""
    FIREBASE_CLIENT_ID: str = ""
    FIREBASE_AUTH_URI: str = "https://accounts.google.com/o/oauth2/auth"
    FIREBASE_TOKEN_URI: str = "https://oauth2.googleapis.com/token"
    FIREBASE_AUTH_PROVIDER_CERT_URL: str = "https://www.googleapis.com/oauth2/v1/certs"
    FIREBASE_CLIENT_CERT_URL: str = ""
    FIREBASE_CREDENTIALS_PATH: str = ""

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@sehatguru.com"
    EMAIL_FROM_NAME: str = "SehatGuru"

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8000"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    # Firestore Collections
    FIRESTORE_COLLECTION_USERS: str = "users"
    FIRESTORE_COLLECTION_FOOD_LOGS: str = "food_logs"
    FIRESTORE_COLLECTION_FOODS: str = "foods"
    FIRESTORE_COLLECTION_MEAL_PLANS: str = "meal_plans"
    FIRESTORE_COLLECTION_CHAT_HISTORY: str = "chat_history"

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # RAG Configuration
    RAG_COLLECTION_KNOWLEDGE_BASE: str = "pakistani_dietary_guidelines"
    RAG_COLLECTION_DISHES: str = "pakistani_dishes"
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    RAG_CHUNK_SIZE: int = 1000
    RAG_CHUNK_OVERLAP: int = 200
    RAG_TOP_K: int = 5
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"

    # Memory (Mem0 OSS)
    MEM0_COLLECTION_NAME: str = "sehatguru_user_memories"
    MEM0_CHROMA_DIR: str = "./chroma_db_mem0"

    # Food vision model
    FOOD_MODEL_PATH: str = "model/SehatGuru_ConvNeXt_50_best_macroF1.pth"
    FOOD_MODEL_LOW_CONFIDENCE_THRESHOLD: float = 0.60

    # Self-Validation Settings
    ENABLE_RESPONSE_VALIDATION: bool = True
    VALIDATION_MAX_RETRIES: int = 1
    VALIDATION_THRESHOLD_SAFETY: float = 0.7
    VALIDATION_THRESHOLD_ACCURACY: float = 0.7
    VALIDATION_THRESHOLD_PERSONALIZATION: float = 0.5
    VALIDATION_THRESHOLD_CULTURAL: float = 0.7

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        case_sensitive = True


# Create settings instance
settings = Settings()
