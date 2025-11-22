# Food Detection Model - Setup & Testing Guide

## Overview
The food detection model has been integrated into the backend API. This guide will help you test the model with local images before integrating with the React Native app.

## Prerequisites
- Python 3.8+
- pip
- Food images to test with

## Setup Instructions

### 1. Install Dependencies

Navigate to the backend directory and install the required packages:

```bash
cd backend
pip install -r requirements.txt
```

**Note:** PyTorch installation might take a few minutes as it's a large package (~2GB).

### 2. Verify Model File

Make sure the model file exists at:
```
model/final_effnet_enhanced.pth
```

### 3. Start the API Server

Run the FastAPI server:

```bash
python main.py
```

You should see output like:
```
Starting SehatGuru API...
Environment: development
Firebase initialized successfully
Loading food detection model from: /path/to/model/final_effnet_enhanced.pth
Food detection model initialized successfully
INFO:     Uvicorn running on http://localhost:8000
```

## Testing the Model

### Method 1: Using the Python Test Script (Recommended)

The easiest way to test is using the provided test script:

```bash
# Basic test
python test_food_detection.py path/to/your/food_image.jpg

# Detailed test with top-3 predictions
python test_food_detection.py path/to/your/food_image.jpg --detailed

# Test with custom API URL
python test_food_detection.py path/to/your/food_image.jpg --url http://localhost:8000

# Health check only
python test_food_detection.py --health
```

**Example Output:**
```
============================================================
   SehatGuru Food Detection API Test
============================================================

🏥 Checking service health...
✅ Food detection service is healthy

🔍 Testing Food Detection
   Image: pizza.jpg
   Endpoint: http://localhost:8000/api/food/detect
   Mode: Simple
------------------------------------------------------------

⏳ Uploading image and running detection...

✅ Detection Successful!
============================================================

   ✅ Food: pizza
   📊 Confidence: 95.34%

============================================================
```

### Method 2: Using curl

```bash
curl -X POST "http://localhost:8000/api/food/detect" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@path/to/your/food_image.jpg"
```

### Method 3: Using Postman or Thunder Client

1. Create a new POST request
2. URL: `http://localhost:8000/api/food/detect`
3. Body type: `form-data`
4. Add a file field named `file` and select your food image
5. Send the request

## API Endpoints

### 1. Simple Detection
- **Endpoint:** `POST /api/food/detect`
- **Description:** Returns single food prediction with confidence
- **Response:**
```json
{
  "food_name": "pizza",
  "confidence": 0.9534,
  "is_low_confidence": false
}
```

### 2. Detailed Detection
- **Endpoint:** `POST /api/food/detect/detailed`
- **Description:** Returns top-K predictions (default: 3)
- **Query Parameter:** `top_k` (optional, default: 3)
- **Response:**
```json
{
  "predictions": [
    {
      "food_name": "pizza",
      "confidence": 0.9534,
      "is_low_confidence": false
    },
    {
      "food_name": "flatbread",
      "confidence": 0.0312,
      "is_low_confidence": true
    },
    {
      "food_name": "bread",
      "confidence": 0.0089,
      "is_low_confidence": true
    }
  ],
  "top_prediction": {
    "food_name": "pizza",
    "confidence": 0.9534,
    "is_low_confidence": false
  }
}
```

### 3. Health Check
- **Endpoint:** `GET /api/food/health`
- **Description:** Check if model is loaded and ready
- **Response:**
```json
{
  "status": "healthy",
  "service": "food_detection",
  "model_loaded": true
}
```

## Supported Food Classes

The model can detect 21 Pakistani food items:

1. Aloo Keema
2. Aloo Sabzi
3. Aloo Samosa
4. Bhindi Masala
5. Chana Chaat
6. Chana Masala
7. Chapli Kebab
8. Chicken Biryani
9. Chicken Karahi
10. Chicken Pulao
11. Doodh Patti Chai
12. Gajar ka Halwa
13. Gulaab Jamun
14. Haleem
15. Naan
16. Nihari
17. Pakora
18. Palak Paneer
19. Paratha
20. Seekh Kebab
21. Tandoori Chicken

## Understanding Results

### Confidence Scores
- **High Confidence:** ≥ 70% - Model is confident about the prediction
- **Low Confidence:** < 70% - Model is uncertain, might need better image

### Low Confidence Warning
When `is_low_confidence` is `true`, it means the model is not very confident. This could happen due to:
- Blurry or low-quality image
- Poor lighting
- Food item not in training data (only Pakistani dishes above are supported)
- Multiple food items in the frame
- Unusual angle or presentation

## Troubleshooting

### Issue: "Could not connect to http://localhost:8000"
**Solution:** Make sure the API server is running with `python main.py`

### Issue: "Food detection model not initialized"
**Solution:**
1. Check that the model file exists: `model/final_effnet_enhanced.pth`
2. Check the server startup logs for errors
3. Ensure PyTorch is installed correctly: `pip install torch torchvision`

### Issue: Model predictions don't match the food
**Solution:** This could happen if:
1. The food item is not one of the 21 supported Pakistani dishes
2. The image quality is poor or unclear
3. The food looks different from typical presentation

### Issue: Low confidence on all predictions
**Solution:**
1. Check image quality - use clear, well-lit photos
2. Verify the model file is the correct one
3. Ensure the image preprocessing matches the training preprocessing

## Next Steps

Once you've verified the model is working correctly:

1. **Optimize Performance:** Consider model caching and optimization
2. **Integrate with App:** Connect the React Native camera screen to this API
3. **Add Nutrition Data:** Link predictions to the Food_dataset.xlsx nutrition database
4. **Add Meal Logging:** Allow users to save detected foods to their meal history
5. **Add Logging:** Track predictions for model improvement

## Support

If you encounter any issues:
1. Check the server logs for error messages
2. Verify all dependencies are installed correctly
3. Ensure the model file is not corrupted
4. Test with different food images

## API Documentation

For interactive API documentation, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
