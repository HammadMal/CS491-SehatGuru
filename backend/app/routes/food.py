"""Food vision API endpoints."""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.ml.food_detector import get_detector, is_initialized
from app.utils.nutrition import get_macros

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/food", tags=["food"])


class Nutrition(BaseModel):
    calories: float
    carbs: float
    protein: float
    fat: float


class TopPrediction(BaseModel):
    food_name: str
    confidence: float
    is_low_confidence: bool
    nutrients: Optional[Nutrition] = None
    class_name: Optional[str] = None


class FoodDetectionResponse(BaseModel):
    success: bool
    predicted_class: str
    confidence: float
    top5: list[dict[str, Any]]
    low_confidence: bool
    food_name: str
    is_low_confidence: bool
    nutrients: Optional[Nutrition] = None
    model: Optional[dict[str, Any]] = None


class FoodDetectionDetailedResponse(BaseModel):
    success: bool
    predicted_class: str
    confidence: float
    top5: list[dict[str, Any]]
    low_confidence: bool
    predictions: list[TopPrediction]
    top_prediction: TopPrediction
    model: Optional[dict[str, Any]] = None


def _validate_image_file(file: UploadFile) -> None:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (JPEG, PNG, etc.)",
        )


def _prediction_option(prediction: dict[str, Any], low_confidence: bool) -> dict[str, Any]:
    class_name = str(prediction["class"])
    nutrients = get_macros(class_name)
    return {
        "food_name": class_name,
        "class_name": class_name,
        "confidence": float(prediction["confidence"]),
        "is_low_confidence": low_confidence,
        "nutrients": nutrients,
    }


def _format_detection(result: dict[str, Any]) -> dict[str, Any]:
    predicted_class = str(result["predicted_class"])
    low_confidence = bool(result["low_confidence"])
    nutrients = get_macros(predicted_class)
    predictions = [
        _prediction_option(prediction, low_confidence)
        for prediction in result["top5"]
    ]

    return {
        "success": True,
        "predicted_class": predicted_class,
        "confidence": float(result["confidence"]),
        "top5": result["top5"],
        "low_confidence": low_confidence,
        "food_name": predicted_class,
        "is_low_confidence": low_confidence,
        "nutrients": nutrients,
        "predictions": predictions,
        "top_prediction": predictions[0],
        "model": result.get("model"),
    }


@router.post("/detect", response_model=FoodDetectionResponse)
async def detect_food(
    file: UploadFile = File(..., description="Image file of the food item"),
) -> FoodDetectionResponse:
    """Detect the most likely food class from an uploaded image."""
    _validate_image_file(file)

    try:
        image_bytes = await file.read()
        result = get_detector().predict_from_bytes(image_bytes, top_k=5)
        formatted = _format_detection(result)

        logger.info(
            "Detected food: %s (confidence: %.2f, low_confidence=%s)",
            formatted["predicted_class"],
            formatted["confidence"],
            formatted["low_confidence"],
        )
        return FoodDetectionResponse(**formatted)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error during food detection")
        raise HTTPException(status_code=500, detail=f"Food detection failed: {exc}") from exc


@router.post("/detect/detailed", response_model=FoodDetectionDetailedResponse)
async def detect_food_detailed(
    file: UploadFile = File(..., description="Image file of the food item"),
    top_k: int = 5,
) -> FoodDetectionDetailedResponse:
    """Detect a food item and return top-k predictions for uncertain cases."""
    _validate_image_file(file)

    try:
        image_bytes = await file.read()
        result = get_detector().predict_from_bytes(image_bytes, top_k=top_k)
        formatted = _format_detection(result)
        return FoodDetectionDetailedResponse(**formatted)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error during detailed food detection")
        raise HTTPException(status_code=500, detail=f"Food detection failed: {exc}") from exc


@router.get("/health")
async def health_check():
    """Check if the food detection service is ready."""
    if not is_initialized():
        raise HTTPException(status_code=503, detail="Food detection model not initialized")

    detector = get_detector()
    return {
        "status": "healthy",
        "service": "food_detection",
        "model_loaded": True,
        "num_classes": len(detector.class_names),
        "img_size": detector.img_size,
        "model": detector.metadata,
    }


@router.post("/detect/batch", response_model=list[dict[str, Any]])
async def detect_food_batch(
    files: list[UploadFile] = File(..., description="Multiple image files"),
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """Detect food items from multiple uploaded images."""
    results = []

    for file in files:
        try:
            _validate_image_file(file)
            image_bytes = await file.read()
            result = get_detector().predict_from_bytes(image_bytes, top_k=top_k)
            formatted = _format_detection(result)
            results.append({
                "filename": file.filename,
                "success": True,
                "predicted_class": formatted["predicted_class"],
                "confidence": formatted["confidence"],
                "low_confidence": formatted["low_confidence"],
                "top5": formatted["top5"],
                "top_prediction": formatted["top_prediction"],
                "all_predictions": formatted["predictions"],
            })
        except Exception as exc:
            logger.exception("Error processing %s", file.filename)
            results.append({
                "filename": file.filename,
                "success": False,
                "error": str(exc),
            })

    return results
