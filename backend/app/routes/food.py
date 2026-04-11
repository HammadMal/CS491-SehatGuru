"""Food detection API endpoints"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from app.utils.nutrition import get_macros
from typing import Optional, List
import logging

from app.ml.food_detector import get_detector

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/food", tags=["food"])


class Nutrition(BaseModel):
    "Nutrients information model"
    calories: float
    carbs: float
    protein: float
    fat: float

class FoodDetectionResponse(BaseModel):
    """Response model for food detection"""
    food_name: str
    confidence: float
    is_low_confidence: bool
    nutrients: Optional[Nutrition]


class FoodDetectionDetailedResponse(BaseModel):
    """Detailed response with top predictions"""
    predictions: list[dict]
    top_prediction: dict


@router.post("/detect", response_model=FoodDetectionResponse)
async def detect_food(
    file: UploadFile = File(..., description="Image file of the food item")
) -> FoodDetectionResponse:
    """
    Detect food item from uploaded image

    Args:
        file: Uploaded image file (JPG, PNG, etc.)

    Returns:
        FoodDetectionResponse with food name, confidence, and low confidence flag

    Raises:
        HTTPException: If detection fails or file is invalid
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (JPEG, PNG, etc.)"
        )

    try:
        # Read image bytes
        image_bytes = await file.read()

        # Get detector
        detector = get_detector()

        # Run prediction (detector may return new safety-dict or legacy list)
        predictions = detector.predict_from_bytes(image_bytes, top_k=3)

        if not predictions:
            raise HTTPException(
                status_code=500,
                detail="Model failed to generate predictions"
            )

        # Normalize outputs from new SafeFoodPredictor (dict) or legacy list
        if isinstance(predictions, dict):
            # New safety format
            status = predictions.get("status")
            if status == "CONFIRMED":
                food_name = predictions.get("dish")
                confidence = float(predictions.get("confidence", 0.0))
                # predictor returns percentage (0-100); normalize to 0-1
                if confidence > 1.0:
                    confidence = confidence / 100.0
                is_low_confidence = confidence < 0.7
            else:
                # ASK_USER: pick first prediction and show its confidence
                preds = predictions.get("predictions", [])
                if preds:
                    food_name = preds[0].get("dish", "")
                    confidence = float(preds[0].get("confidence", 0.0))
                else:
                    # Fallback to old format if predictions not available
                    options = predictions.get("options", [])
                    food_name = options[0] if options else ""
                    confidence = float(predictions.get("confidence", 0.0))
                # predictor returns percentage (0-100); normalize to 0-1
                if confidence > 1.0:
                    confidence = confidence / 100.0
                is_low_confidence = True

            logger.info(
                f"Detected food (safe API): {food_name} "
                f"(confidence: {confidence:.2%}, low: {is_low_confidence})"
            )

        else:
            # Legacy list format [(name, confidence), ...]
            food_name, confidence = predictions[0]
            # Ensure confidence in 0-1 range
            if confidence > 1.0:
                confidence = float(confidence) / 100.0
            is_low_confidence = confidence < 0.7

            logger.info(
                f"Detected food: {food_name} "
                f"(confidence: {confidence:.2%}, low: {is_low_confidence})"
            )

        # Look up nutrients from CSV
        nutrients = get_macros(food_name) if food_name else None

        return FoodDetectionResponse(
            food_name=food_name,
            confidence=confidence,
            is_low_confidence=is_low_confidence,
            nutrients=nutrients
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during food detection: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Food detection failed: {str(e)}"
        )


@router.post("/detect/detailed", response_model=FoodDetectionDetailedResponse)
async def detect_food_detailed(
    file: UploadFile = File(..., description="Image file of the food item"),
    top_k: int = 3
) -> FoodDetectionDetailedResponse:
    """
    Detect food item from uploaded image with top K predictions

    Args:
        file: Uploaded image file (JPG, PNG, etc.)
        top_k: Number of top predictions to return (default: 3)

    Returns:
        FoodDetectionDetailedResponse with multiple predictions

    Raises:
        HTTPException: If detection fails or file is invalid
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (JPEG, PNG, etc.)"
        )

    try:
        # Read image bytes
        image_bytes = await file.read()

        # Get detector
        detector = get_detector()

        # Run prediction (may return safety-dict or legacy list)
        predictions = detector.predict_from_bytes(image_bytes, top_k=top_k)

        if not predictions:
            raise HTTPException(
                status_code=500,
                detail="Model failed to generate predictions"
            )

        formatted_predictions = []

        if isinstance(predictions, dict):
            # New SafeFoodPredictor returned a dict
            status = predictions.get("status")
            
            # Extract predictions list (available for both CONFIRMED and ASK_USER)
            preds = predictions.get("predictions", [])
            
            if status == "UNKNOWN_OBJECT":
                # Object not in our dataset - return with unknown flag
                for pred in preds:
                    dish = pred.get("dish", "")
                    conf = float(pred.get("confidence", 0.0))
                    if conf > 1.0:
                        conf = conf / 100.0
                    nutrients = get_macros(dish) if dish else None
                    formatted_predictions.append({
                        "food_name": dish,
                        "confidence": conf,
                        "is_low_confidence": True,
                        "is_unknown": True,
                        "nutrients": nutrients
                    })
                if not formatted_predictions:
                    formatted_predictions.append({
                        "food_name": "Unknown",
                        "confidence": 0.0,
                        "is_low_confidence": True,
                        "is_unknown": True,
                        "nutrients": None
                    })
                return FoodDetectionDetailedResponse(
                    predictions=formatted_predictions,
                    top_prediction=formatted_predictions[0]
                )

            if preds:
                # Use the predictions list with individual confidence scores
                for pred in preds:
                    dish = pred.get("dish", "")
                    conf = float(pred.get("confidence", 0.0))
                    if conf > 1.0:
                        conf = conf / 100.0
                    # Look up nutrients for this food item
                    nutrients = get_macros(dish) if dish else None
                    formatted_predictions.append({
                        "food_name": dish,
                        "confidence": conf,
                        "is_low_confidence": (status == "ASK_USER") or (conf < 0.7),
                        "nutrients": nutrients
                    })
            elif status == "CONFIRMED":
                # Fallback for old format (single dish)
                dish = predictions.get("dish")
                conf = float(predictions.get("confidence", 0.0))
                if conf > 1.0:
                    conf = conf / 100.0
                # Look up nutrients for this food item
                nutrients = get_macros(dish) if dish else None
                formatted_predictions.append({
                    "food_name": dish,
                    "confidence": conf,
                    "is_low_confidence": conf < 0.7,
                    "nutrients": nutrients
                })
            else:
                # Fallback: ASK_USER with old options format
                options = predictions.get("options", [])
                conf = float(predictions.get("confidence", 0.0))
                if conf > 1.0:
                    conf = conf / 100.0
                for opt in options:
                    # Look up nutrients for this food item
                    nutrients = get_macros(opt) if opt else None
                    formatted_predictions.append({
                        "food_name": opt,
                        "confidence": conf,
                        "is_low_confidence": True,
                        "nutrients": nutrients
                    })

            # Ensure we have at least one top_prediction
            if not formatted_predictions:
                raise HTTPException(status_code=500, detail="Model returned no usable predictions")

        else:
            # Legacy list format
            for name, conf in predictions:
                if conf > 1.0:
                    conf = float(conf) / 100.0
                # Look up nutrients for this food item
                nutrients = get_macros(name) if name else None
                formatted_predictions.append({
                    "food_name": name,
                    "confidence": conf,
                    "is_low_confidence": conf < 0.7,
                    "nutrients": nutrients
                })

        return FoodDetectionDetailedResponse(
            predictions=formatted_predictions,
            top_prediction=formatted_predictions[0]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during food detection: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Food detection failed: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Check if the food detection service is ready"""
    from app.ml.food_detector import is_initialized

    if not is_initialized():
        raise HTTPException(
            status_code=503,
            detail="Food detection model not initialized"
        )

    return {
        "status": "healthy",
        "service": "food_detection",
        "model_loaded": True
    }


@router.post("/detect/batch", response_model=List[dict])
async def detect_food_batch(
    files: List[UploadFile] = File(..., description="Multiple image files"),
    top_k: int = 5
) -> List[dict]:
    """
    Detect food items from multiple uploaded images with top K predictions
    Perfect for confidence testing on multiple images

    Args:
        files: List of uploaded image files (JPG, PNG, etc.)
        top_k: Number of top predictions to return per image (default: 5)

    Returns:
        List of detection results, one per image

    Raises:
        HTTPException: If detection fails
    """
    results = []
    
    for idx, file in enumerate(files):
        try:
            # Validate file type
            if not file.content_type or not file.content_type.startswith('image/'):
                results.append({
                    "filename": file.filename,
                    "error": "File must be an image",
                    "success": False
                })
                continue

            # Read image bytes
            image_bytes = await file.read()

            # Get detector
            detector = get_detector()

            # Run prediction
            predictions = detector.predict_from_bytes(image_bytes, top_k=top_k)

            if not predictions:
                results.append({
                    "filename": file.filename,
                    "error": "Model failed to generate predictions",
                    "success": False
                })
                continue

            # Format predictions
            formatted_predictions = [
                {
                    "rank": i + 1,
                    "food_name": name,
                    "confidence": round(conf * 100, 2),  # Convert to percentage
                    "is_low_confidence": conf < 0.7
                }
                for i, (name, conf) in enumerate(predictions)
            ]

            results.append({
                "filename": file.filename,
                "success": True,
                "top_prediction": formatted_predictions[0],
                "all_predictions": formatted_predictions
            })

            logger.info(
                f"[{idx + 1}/{len(files)}] {file.filename}: "
                f"{formatted_predictions[0]['food_name']} "
                f"({formatted_predictions[0]['confidence']}%)"
            )

        except Exception as e:
            logger.error(f"Error processing {file.filename}: {str(e)}")
            results.append({
                "filename": file.filename,
                "error": str(e),
                "success": False
            })

    return results
