from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

from app.config.settings import settings
from app.config.firebase import firebase_client
from app.routes import auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    print("Starting SehatGuru API...")
    print(f"Environment: {settings.ENVIRONMENT}")

    # Initialize Firebase
    try:
        _ = firebase_client.db  # Initialize Firestore connection
        print("Firebase initialized successfully")
    except Exception as e:
        print(f"Warning: Firebase initialization issue: {str(e)}")

    yield

    # Shutdown
    print("Shutting down SehatGuru API...")


# Create FastAPI app
app = FastAPI(
    title="SehatGuru API",
    description="Intelligent nutrition tracking and advisory system for health-conscious individuals",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
if settings.ALLOWED_ORIGINS == "*":
    # Allow all origins in development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,  # Can't use credentials with wildcard
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Specific origins in production
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "detail": exc.errors(),
            "success": False
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An error occurred",
            "success": False
        }
    )


# Include routers
app.include_router(auth.router, prefix="/api")


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to SehatGuru API",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs"
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }


# Test page for Google OAuth (development only)
@app.get("/test-google-auth")
async def test_google_auth_page():
    """Serve Google OAuth test page"""
    file_path = os.path.join(os.path.dirname(__file__), "test_google_auth.html")
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return {"error": "Test file not found"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
