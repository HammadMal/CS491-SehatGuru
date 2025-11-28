# Food Detection Model - Setup & Testing Guide

## Overview
The food detection model has been integrated into the backend API. This guide will help you test the model using Swagger UI.

## Prerequisites
- Docker and Docker Compose installed (recommended)
- OR Python 3.8+ and pip (manual setup)
- Food images to test with

## Setup Instructions

### Option 1: Using Docker (Recommended)

1. **Configure environment:**
```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit .env and configure your credentials
# Place firebase-credentials.json in backend/
```

2. **Start the API server:**
```bash
# From project root (first time)
docker-compose up --build

# Daily usage (after first build)
docker-compose up
```
**Note:** First build downloads PyTorch (~700MB). Subsequent runs are much faster as packages are cached.

3. **Verify the model loaded:**
Check the logs for:
```
Loading food detection model from: /app/model/final_effnet_enhanced.pth
Food detection model initialized successfully
```

### Option 2: Manual Setup

1. **Install dependencies:**
```bash
cd backend
pip install -r requirements.txt
```
**Note:** PyTorch installation might take a few minutes as it's a large package (~2GB).

2. **Verify model file exists:**
```
model/final_effnet_enhanced.pth
```

3. **Start the API server:**
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

### Using Swagger UI (Interactive API Documentation)

1. **Open Swagger UI in your browser:**
   ```
   http://localhost:8000/docs
   ```

2. **Test the Health Check:**
   - Find the `GET /api/food/health` endpoint
   - Click "Try it out"
   - Click "Execute"
   - You should see:
   ```json
   {
     "status": "healthy",
     "service": "food_detection",
     "model_loaded": true
   }
   ```

3. **Test Simple Detection (single prediction):**
   - Find the `POST /api/food/detect` endpoint
   - Click "Try it out"
   - Click "Choose File" and select a food image
   - Click "Execute"
   - Review the prediction result

4. **Test Detailed Detection (multiple predictions):**
   - Find the `POST /api/food/detect/detailed` endpoint
   - Click "Try it out"
   - Optionally adjust `top_k` parameter (default: 3)
   - Click "Choose File" and select a food image
   - Click "Execute"
   - Review the top-K predictions

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

## Testing Tips

- **Use clear, well-lit photos** for best results
- **Center the food item** in the frame
- **Test with Pakistani dishes** from the supported list above
- **Try different images** of the same food to see consistency
- **Check confidence scores** - low confidence may indicate poor image quality

## Support

If you encounter any issues:
1. Check the server logs for error messages
   - Docker: `docker-compose logs -f backend`
   - Manual: Check terminal output
2. Verify all dependencies are installed correctly
3. Ensure the model file exists and is not corrupted
4. Test with different food images from the supported list

## Interactive API Documentation

- **Swagger UI (Recommended):** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
