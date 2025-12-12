import os
import json
import time
import google.generativeai as genai

# --- CONFIGURATION ---
API_KEY = "AIzaSyBdNsv3kuKYccA55JmtPczgZJJLcBTay-o"  # <--- PASTE YOUR GOOGLE AI STUDIO KEY HERE
SCRAPED_DIR = "scraped_data"
INDEX_FILE = os.path.join(SCRAPED_DIR, "index.json")
OUTPUT_FILE = "extracted_dishes.json"

# We use 2.5 Flash Lite because it has the best free-tier limits (15 RPM, 1000 RPD)
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash-lite')

def extract_dishes_with_ai(text_content):
    prompt = """
    You are a culinary data analyst for a Pakistani Food Computer Vision project.
    Analyze the text below from a food website/blog.
    Extract a list of all PAKISTANI food dishes mentioned.

    RULES:
    1. EXTRACT SPECIFIC NAMES: "Sindhi Biryani" -> "sindhi biryani" (Keep it granular/specific).
    2. CLEANUP: Remove marketing words ("Delicious", "Best", "Authentic", "Recipe", "Homemade"). Keep nouns ("Chicken", "Mutton", "Fry").
    3. IGNORE: Ingredients (onion, garlic, salt), generic terms (dinner, lunch, desi food, meal), and non-Pakistani food (pizza, burger, pasta).
    4. FORMAT: Return ONLY a valid JSON list of lowercase strings. 
       Example: ["chicken karahi", "seekh kabab", "gulab jamun"]
    
    Text to analyze:
    """
    
    # Truncate text to 15k chars to save tokens (usually captures the main content)
    if len(text_content) > 15000:
        text_content = text_content[:15000]

    try:
        response = model.generate_content(prompt + f"\n\n{text_content}")
        # Clean response string to ensure it's valid JSON
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)
    except Exception as e:
        # Print error but don't crash, just return empty list
        print(f"   [AI Error]: {e}")
        return []

def run_extraction():
    if not os.path.exists(INDEX_FILE):
        print("Error: No data found. Run 1_scraper.py first.")
        return

    with open(INDEX_FILE, "r") as f:
        files_index = json.load(f)

    # Dictionary to store results per page URL
    all_page_results = {}
    
    print(f"Starting AI Extraction on {len(files_index)} files...")
    print("Using Model: gemini-2.5-flash-lite (Safe Rate Limit Mode)")

    for i, item in enumerate(files_index):
        file_path = os.path.join(SCRAPED_DIR, item['file'])
        
        try:
            if not os.path.exists(file_path):
                continue

            with open(file_path, "r", encoding="utf-8") as f:
                page_data = json.load(f)
            
            # Skip if text is too short (failed scrape)
            if len(page_data['text']) < 100:
                print(f"[{i+1}] Skipped (Text too short)")
                continue

            print(f"[{i+1}/{len(files_index)}] Analyzing: {item['url'][:60]}...")
            
            raw_dishes = extract_dishes_with_ai(page_data['text'])
            
            if raw_dishes:
                # --- DOCUMENT FREQUENCY LOGIC ---
                # 1. Normalize (lowercase, strip)
                normalized = [d.lower().strip() for d in raw_dishes]
                
                # 2. Deduplicate per page
                # If a blog mentions "Biryani" 50 times, it counts as 1 vote for this URL.
                unique_for_this_page = list(set(normalized))
                
                all_page_results[item['url']] = unique_for_this_page
                print(f"   -> Found {len(unique_for_this_page)} unique dishes.")
            else:
                print("   -> No dishes identified.")
            
            # CRITICAL: Sleep to stay below 15 Requests Per Minute (RPM)
            # 5 seconds sleep + ~1 second processing = ~10 RPM (Safe Zone)
            time.sleep(5) 

        except Exception as e:
            print(f"   -> File Error: {e}")

    # Save the results
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_page_results, f, indent=4)
    
    print(f"\nExtraction Complete! Data saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    run_extraction()