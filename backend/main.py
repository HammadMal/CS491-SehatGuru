from fastapi import FastAPI, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import logging

from app.config.settings import settings
from app.config.firebase import firebase_client
from app.routes import auth, food, user, chat
from app.ml.food_detector import initialize_detector
from app.middleware.auth import get_current_active_user

# Configure logging for ML module
logging.basicConfig(level=logging.INFO)
ml_logger = logging.getLogger('app.ml.food_detector')
ml_logger.setLevel(logging.DEBUG)


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

    # Initialize Food Detection Model
    try:
        model_path = settings.MODEL_PATH
        print(f"Loading food detection model from: {model_path}")
        initialize_detector(model_path)
        print("Food detection model initialized successfully")
    except Exception as e:
        print(f"Warning: Food detection model initialization failed: {str(e)}")
        print("Food detection endpoints will not be available")

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
app.include_router(user.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(food.router)

# Nutrients endpoint (correct location)
import csv
import pandas as pd
from pydantic import BaseModel
from typing import List
from datetime import datetime, timezone

# ── Load nutrients CSVs once at startup ──────────────────────────────────────
_nutrients_path = os.path.join(os.path.dirname(__file__), "nutrients.csv")
_ingredients_path = os.path.join(os.path.dirname(__file__), "ingredientsfinal.csv")

_nutrients_df = pd.read_csv(_nutrients_path)
_nutrients_df.columns = _nutrients_df.columns.str.lower().str.strip()

_ingredients_df = pd.read_csv(_ingredients_path)
_ingredients_df.columns = _ingredients_df.columns.str.lower().str.strip()
_ingredients_df["food_name"] = _ingredients_df["food_name"].astype(str).str.lower().str.strip()

# All nutrient columns (mirrors nutrients.csv schema)
_NUTRIENT_COLS = [
    "energy_kcal", "carb_g", "protein_g", "fat_g", "freesugar_g", "fibre_g",
    "calcium_mg", "iron_mg", "energy_kj", "sfa_mg", "mufa_mg", "pufa_mg",
    "cholesterol_mg", "phosphorus_mg", "magnesium_mg", "sodium_mg", "potassium_mg",
    "copper_mg", "selenium_ug", "chromium_mg", "manganese_mg", "molybdenum_mg",
    "zinc_mg", "vita_ug", "vite_mg", "vitd2_ug", "vitd3_ug", "vitk1_ug", "vitk2_ug",
    "folate_ug", "vitb1_mg", "vitb2_mg", "vitb3_mg", "vitb5_mg", "vitb6_mg",
    "vitb7_ug", "vitb9_ug", "vitc_mg", "carotenoids_ug",
]

# ── Models ───────────────────────────────────────────────────────────────────
class CustomDishIngredient(BaseModel):
    food_name: str
    grams: float

class CustomDishRequest(BaseModel):
    dish_name: str
    ingredients: List[CustomDishIngredient]

# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/nutrients")
def get_nutrients():
    file_path = os.path.join(os.path.dirname(__file__), "nutrients.csv")

    if not os.path.exists(file_path):
        return {"error": "nutrients.csv not found"}

    rows = []
    with open(file_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    return rows


@app.get("/api/ingredients/search")
def search_ingredients(q: str = "", limit: int = 20):
    """
    Search ingredientsfinal.csv by food_name substring with relevance ranking.
    Ranking tiers (best first):
      0 - exact match
      1 - name starts with query
      2 - a word in the name starts with query
      3 - query appears anywhere in name
    Within each tier, shorter names rank higher.
    """
    if not q.strip():
        return []

    query = q.lower().strip()

    # Get all rows that contain the query anywhere
    mask = _ingredients_df["food_name"].str.contains(query, na=False)
    matches = _ingredients_df[mask].copy()

    if matches.empty:
        return []

    # Assign relevance score
    def relevance(name: str) -> int:
        if name == query:
            return 0
        if name.startswith(query):
            return 1
        if any(word.startswith(query) for word in name.split()):
            return 2
        return 3

    matches["_score"] = matches["food_name"].apply(relevance)
    matches["_len"] = matches["food_name"].str.len()
    matches = matches.sort_values(["_score", "_len"]).head(limit)

    output = []
    for _, row in matches.iterrows():
        item = {"food_name": row["food_name"]}
        for col in _NUTRIENT_COLS:
            if col in row:
                val = row[col]
                item[col] = float(val) if pd.notna(val) else 0.0
        output.append(item)

    return output


@app.post("/api/custom-dishes")
async def save_custom_dish(
    dish: CustomDishRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Build a custom dish from ingredients, compute full nutrient profile, save to Firestore.
    Each ingredient's nutrients are scaled: value * grams / 100.
    """
    uid = current_user["uid"]

    # Initialise totals for all nutrient columns
    totals = {col: 0.0 for col in _NUTRIENT_COLS}

    used_ingredients = []
    for ing in dish.ingredients:
        name = ing.food_name.lower().strip()
        row = _ingredients_df[_ingredients_df["food_name"] == name]
        if row.empty:
            # Try partial match fallback
            row = _ingredients_df[_ingredients_df["food_name"].str.contains(name, na=False)].head(1)
        if row.empty:
            continue  # skip unknown ingredient

        factor = ing.grams / 100.0
        for col in _NUTRIENT_COLS:
            if col in row.columns:
                val = row[col].values[0]
                totals[col] += float(val) * factor if pd.notna(val) else 0.0

        used_ingredients.append({"food_name": ing.food_name, "grams": ing.grams})

    # Build Firestore document (mirrors nutrients.csv columns)
    doc = {
        "userId": uid,
        "food_name": dish.dish_name,
        **{col: round(totals[col], 4) for col in _NUTRIENT_COLS},
        "ingredients": used_ingredients,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    db = firebase_client.db
    ref = db.collection("custom_dishes").document()
    ref.set(doc)

    return {"id": ref.id, **doc}


@app.get("/api/custom-dishes")
async def get_custom_dishes(
    current_user: dict = Depends(get_current_active_user)
):
    """Return all custom dishes saved by the current user."""
    uid = current_user["uid"]
    db = firebase_client.db
    docs = (
        db.collection("custom_dishes")
        .where("userId", "==", uid)
        .stream()
    )
    results = [{"id": d.id, **d.to_dict()} for d in docs]
    # Sort newest-first in Python (avoids needing a composite Firestore index)
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return results



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
