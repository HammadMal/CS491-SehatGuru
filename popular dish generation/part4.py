import json
from collections import Counter
import csv
import os
import time
import google.generativeai as genai

# --- CONFIGURATION ---
INPUT_FILE = "extracted_dishes.json"
REPORT_FILE = "fyp_final_ranking.csv"
API_KEY = "AIzaSyBdNsv3kuKYccA55JmtPczgZJJLcBTay-o" # <--- PASTE KEY HERE

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash-lite')

def merge_dishes_with_llm(raw_counts):
    """
    Uses Gemini to semantically group dishes (e.g., 'Sindhi Biryani' -> 'Biryani').
    """
    print("   -> Running Stage 4: AI Semantic Merging...")
    
    # Prepare the data for the LLM
    # We send ALL dishes to ensure the long tail of unique spellings/variations is captured.
    # The 'most_common()' without arguments returns the full list.
    all_dishes = raw_counts.most_common()
    print(f"      (Sending {len(all_dishes)} unique items to Gemini for clustering...)")
    
    dishes_text = "\n".join([f"{dish} ({count})" for dish, count in all_dishes])
    
    prompt = f"""
    You are a data cleaning assistant for a Pakistani Food dataset.
    I have a list of dish names and their frequencies. Many are variations of the same dish (e.g., spelling differences, regional prefixes).
    
    Your Task:
    1. Group these items into distinct "Parent Dish Classes" (e.g., "Chicken Biryani", "Sindhi Biryani" -> "Biryani").
    2. Sum their counts.
    3. Return a JSON object where Keys are the Parent Class and Values are the Total Count.
    
    Rules:
    - Merge "Chicken Karahi", "Mutton Karahi", "White Karahi" -> "Karahi"
    - Merge "Beef Nihari", "Nalli Nihari" -> "Nihari"
    - Merge "Seekh Kabab", "Reshmi Kabab" -> "Seekh Kabab" (or just "Kabab" if generic)
    - Keep distinct items distinct (e.g., don't merge "Haleem" with "Hareesa").
    - Return JSON ONLY.
    
    Input List:
    {dishes_text}
    """
    
    try:
        response = model.generate_content(prompt)
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        merged_data = json.loads(clean_text)
        return Counter(merged_data)
    except Exception as e:
        print(f"   [AI Merge Error]: {e}")
        return raw_counts # Fallback to raw counts if AI fails

def analyze_frequencies():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found. You must run 2_extractor.py first.")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data_by_url = json.load(f)

    # 1. Calculate Total Sources (N)
    total_sources = len(data_by_url)
    
    # 2. Flatten the votes
    all_votes = []
    for url, dishes in data_by_url.items():
        all_votes.extend(dishes)

    total_mentions = len(all_votes)

    if total_mentions == 0:
        print("No dishes found! Check your scraper or API key.")
        return

    print(f"--- DATASET STATS ---")
    print(f"Total Websites Processed: {total_sources}")
    print(f"Total Unique Mentions:    {total_mentions}")
    if total_sources > 0:
        avg_dishes = total_mentions / total_sources
        print(f"Average Dishes per Website: {avg_dishes:.1f}")
    print(f"---------------------")

    # 3. Count Frequencies (Raw)
    raw_counts = Counter(all_votes)
    
    # 4. AI Semantic Merging (Stage 4)
    # This replaces the simple string matching with powerful LLM logic
    final_counts = merge_dishes_with_llm(raw_counts)

    # 5. Generate the Report Data
    top_dishes = final_counts.most_common()

    print("\n" + "="*85)
    print(f"{'RANK':<5} {'PARENT DISH CLASS':<35} {'VOTES':<10} {'POPULARITY %':<15}")
    print("="*85)
    
    csv_data = []
    
    for rank, (dish, count) in enumerate(top_dishes, 1):
        # Calculate percentage based on original total sources
        popularity = (count / total_sources) * 100
        
        if rank <= 100:
            print(f"{rank:<5} {dish:<35} {count:<10} {popularity:.1f}%")
        
        csv_data.append([rank, dish, count, f"{popularity:.2f}%"])

    if len(top_dishes) > 100:
        print(f"... and {len(top_dishes) - 100} more items (see CSV).")

    # 6. Save to CSV
    with open(REPORT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Rank", "Parent Dish Class", "Frequency (Votes)", "Consensus (Popularity %)"])
        writer.writerows(csv_data)

    print(f"\n[SUCCESS] Final Merged Report generated: {REPORT_FILE}")

if __name__ == "__main__":
    analyze_frequencies()