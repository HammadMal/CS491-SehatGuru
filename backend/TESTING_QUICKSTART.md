# Quick Start - Testing Food Detection Model

## Simple 4-Step Testing Process

### Step 1: Install Dependencies (One Time Only)

Open terminal in the `backend` folder and run:

```bash
pip install torch==2.1.2 torchvision==0.16.2 Pillow==10.2.0
```

**Note:** This might take 3-5 minutes as PyTorch is a large library.

### Step 2: Get a Test Image

Download or find an image of one of these Pakistani foods:

- Chicken Biryani
- Naan
- Samosa
- Pakora
- Gulaab Jamun
- Chicken Karahi
- Paratha
- Tandoori Chicken
- Or any of the other 21 supported foods (see full list in FOOD_DETECTION_SETUP.md)

Save the image somewhere easy to find (e.g., Desktop).

### Step 3: Start the Server

In the `backend` folder, run:

```bash
python main.py
```

Wait until you see:
```
Food detection model initialized successfully
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Keep this terminal window open!**

### Step 4: Test with Your Image

Open a **NEW** terminal window, go to the `backend` folder, and run:

```bash
python test_food_detection.py /path/to/your/image.jpg
```

**Examples:**
```bash
# If your image is on Desktop (Mac/Linux)
python test_food_detection.py ~/Desktop/biryani.jpg

# If your image is on Desktop (Windows)
python test_food_detection.py "C:\Users\Hammad\Desktop\biryani.jpg"

# If your image is in the current folder
python test_food_detection.py ./food.png
```

## What You'll See

If everything works, you'll see something like:

```
============================================================
   SehatGuru Food Detection API Test
============================================================

🏥 Checking service health...
✅ Food detection service is healthy

🔍 Testing Food Detection
   Image: biryani.jpg
   Endpoint: http://localhost:8000/api/food/detect
   Mode: Simple
------------------------------------------------------------

⏳ Uploading image and running detection...

✅ Detection Successful!
============================================================

   ✅ Food: Chicken Biryani
   📊 Confidence: 94.56%

============================================================
```

## Try Detailed Mode

To see the top 3 predictions:

```bash
python test_food_detection.py /path/to/your/image.jpg --detailed
```

This will show you:
- Top 3 possible foods
- Confidence for each
- Which ones have low confidence

## Alternative: Test in Browser

1. Start the server (Step 3 above)
2. Open browser and go to: **http://localhost:8000/docs**
3. Find the **`/api/food/detect`** section
4. Click **"Try it out"**
5. Click **"Choose File"** and select your image
6. Click **"Execute"**
7. Scroll down to see the results!

## Troubleshooting

### Problem: "python: command not found"
Try using `python3` instead:
```bash
python3 main.py
python3 test_food_detection.py image.jpg
```

### Problem: "Could not connect to http://localhost:8000"
The server isn't running. Make sure Step 3 is done in a separate terminal window.

### Problem: "No such file or directory"
Check your image path. Use the full path or make sure you're in the right folder.

### Problem: "Model file not found"
Make sure `model/final_effnet_enhanced.pth` exists (one folder up from backend).

## What Next?

Once the model is working correctly:
- Try different food images
- Check if predictions are accurate
- Note which foods work well and which don't
- Then we can integrate with the React Native app!

## Need Help?

Share with me:
1. The exact command you ran
2. The error message (copy the full text)
3. What you expected vs. what happened
