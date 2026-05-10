# Testing Model Confidence via Swagger API

## 🎯 Quick Guide

Your backend already has the endpoints ready! You can test your confidence images in two ways:


## cut all this bullshit just run the test_confidence_api script it will give you the breakdown. remember to change the dishes you are testing in the script before running. also remember to run script from confidence_testing folder.


### Method 1: Using Swagger UI (Interactive) 🌐

1. **Make sure Docker is running** (you mentioned it's already running)

2. **Open Swagger UI in your browser:**
   ```
   http://localhost:8000/docs
   ```

3. **Test single images:**
   - Find `POST /api/food/detect/detailed`
   - Click "Try it out"
   - Set `top_k` to `5` (for top 5 predictions)
   - Click "Choose File" and upload an image
   - Click "Execute"
   - See results with confidence scores for top 5 predictions

4. **Test multiple images (NEW!):**
   - Find `POST /api/food/detect/batch`
   - Click "Try it out"
   - Set `top_k` to `5`
   - Upload multiple images at once
   - Click "Execute"
   - Get all results in one response

### Method 2: Using Python Script (Automated) 🤖

1. **Organize your confidence images:**
   ```
   confidence_images/
   ├── Chicken Biryani/
   │   ├── img1.jpg
   │   ├── img2.jpg
   │   └── ... (10 images)
   ├── Nihari/
   │   └── ... (10 images)
   ├── Chicken Karahi/
   ├── Seekh Kebab/
   └── Bihari Kebab/
   ```

2. **Update the dish names** in `test_confidence_api.py` if needed:
   ```python
   TOP_DISHES = [
       "Chicken Biryani",
       "Nihari",
       "Chicken Karahi",
       "Seekh Kebab",
       "Bihari Kebab"
   ]
   ```

3. **Install requests and pandas** (if not already installed):
   ```powershell
   pip install requests pandas
   ```

4. **Run the test script:**
   ```powershell
   python test_confidence_api.py
   ```

5. **View results:**
   - Console output shows real-time results
   - `confidence_test_results.csv` - detailed predictions
   - `confidence_test_statistics.csv` - summary statistics
   - `confidence_test_summary.txt` - formatted text report

---

## 📊 What You'll Get

### From Swagger UI:
```json
{
  "filename": "biryani1.jpg",
  "success": true,
  "top_prediction": {
    "rank": 1,
    "food_name": "Chicken Biryani",
    "confidence": 95.23,
    "is_low_confidence": false
  },
  "all_predictions": [
    {"rank": 1, "food_name": "Chicken Biryani", "confidence": 95.23},
    {"rank": 2, "food_name": "Chicken Pulao", "confidence": 3.45},
    {"rank": 3, "food_name": "Nihari", "confidence": 0.89},
    {"rank": 4, "food_name": "Haleem", "confidence": 0.23},
    {"rank": 5, "food_name": "Paya", "confidence": 0.12}
  ]
}
```

### From Python Script:
**Console Output:**
```
📁 Chicken Biryani
   Found 10 test images
   1. img1.jpg → Chicken Biryani (95.23%) ✓
   2. img2.jpg → Chicken Biryani (92.15%) ✓
   ...

📊 OVERALL STATISTICS
Total Images Tested: 50
Correct Predictions: 42
Overall Accuracy: 84.00%
Average Confidence: 87.34%
```

**CSV Table (confidence_test_results.csv):**
| True Dish | Image Number | Predicted Class | Confidence (%) | Correct | Top-2 Class | Top-2 Conf (%) |
|-----------|--------------|-----------------|----------------|---------|-------------|----------------|
| Chicken Biryani | 1 | Chicken Biryani | 95.23 | ✓ | Chicken Pulao | 3.45 |
| Chicken Biryani | 2 | Chicken Biryani | 92.15 | ✓ | Nihari | 4.23 |

**Statistics Table (confidence_test_statistics.csv):**
| Dish Name | Total Images | Correct | Accuracy (%) | Avg Confidence (%) |
|-----------|--------------|---------|--------------|-------------------|
| Chicken Biryani | 10 | 9 | 90.00 | 88.45 |
| Nihari | 10 | 8 | 80.00 | 85.23 |

---

## 🚀 Quick Start Steps

### For Swagger UI Testing:
```
1. Open http://localhost:8000/docs
2. Find POST /api/food/detect/batch
3. Click "Try it out"
4. Set top_k = 5
5. Upload your images
6. Click "Execute"
7. Copy results for your presentation
```

### For Automated Testing:
```powershell
# Step 1: Organize images in confidence_images folder
mkdir confidence_images
mkdir confidence_images\"Chicken Biryani"
mkdir confidence_images\Nihari
# ... add your images

# Step 2: Run the script
python test_confidence_api.py

# Step 3: Open the CSV files in Excel
start confidence_test_results.csv
```

---

## 💡 Tips for Presentation

1. **Use Swagger UI for Live Demo:**
   - Show real-time predictions
   - Audience can see confidence scores
   - Upload different images during Q&A

2. **Use CSV/Excel for Tables:**
   - Import into PowerPoint/Google Slides
   - Create charts from the data
   - Show accuracy comparison

3. **Key Metrics to Highlight:**
   - Overall accuracy (should be >80%)
   - Average confidence scores
   - Which dishes perform best
   - Confusion patterns (which dishes are mixed up)

4. **Create Visual Charts:**
   - Bar chart: Accuracy by dish
   - Line chart: Confidence distribution
   - Table: Top-5 predictions per image

---

## 🔧 Troubleshooting

**Error: "Cannot connect to API"**
- Check Docker Desktop is running
- Verify backend container is up
- Try: `docker ps` to see running containers
- Check: http://localhost:8000/docs

**Error: "Confidence images directory not found"**
- Create the folder: `mkdir confidence_images`
- Add subfolders for each dish
- Make sure folder names match dish names exactly

**Error: "File must be an image"**
- Use only .jpg, .jpeg, or .png files
- Check file isn't corrupted

---

## 📋 Endpoints Available

| Endpoint | Purpose | Use For |
|----------|---------|---------|
| `POST /api/food/detect` | Single image, top prediction | Quick tests |
| `POST /api/food/detect/detailed` | Single image, top-K predictions | Detailed analysis |
| `POST /api/food/detect/batch` | Multiple images, top-K predictions | **Confidence testing** |
| `GET /api/food/health` | Check if model is loaded | API status |

---

**Ready to test? Open http://localhost:8000/docs and start uploading! 🚀**
