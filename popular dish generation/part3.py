import json
from collections import Counter
import csv
import os
from difflib import SequenceMatcher

# Configuration
INPUT_FILE = "extracted_dishes.json"
REPORT_FILE = "fyp_final_ranking.csv"

def get_similarity(a, b):
    return SequenceMatcher(None, a, b).ratio()

def merge_typos(counts):
    """
    Intelligently merges similar spellings.
    Strategy: Sort by popularity. The most popular version is assumed to be the 'correct' spelling.
    Compare less popular items to more popular ones. If they are very similar (ratio > 0.85),
    merge them into the popular one.
    """
    print("   -> Merging similar spellings (e.g., 'biriyani' -> 'biryani')...")
    
    # Sort items by frequency (descending)
    sorted_dishes = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    merged_counts = Counter()
    processed = set()

    for i in range(len(sorted_dishes)):
        dish_main, count_main = sorted_dishes[i]
        
        if dish_main in processed:
            continue
        
        # Initialize this dish in the new counter
        merged_counts[dish_main] = count_main
        processed.add(dish_main)
        
        # Compare with all subsequent (less popular) dishes
        for j in range(i + 1, len(sorted_dishes)):
            dish_sub, count_sub = sorted_dishes[j]
            
            if dish_sub in processed:
                continue
            
            # Similarity check
            # 0.85 threshold is safe for typos (karahi/karhai = 0.9)
            # but usually distinct enough for different dishes.
            if get_similarity(dish_main, dish_sub) >= 0.85:
                # Merge the counts!
                merged_counts[dish_main] += count_sub
                processed.add(dish_sub)
                # print(f"      Merged '{dish_sub}' into '{dish_main}'") # Uncomment to debug
                
    return merged_counts

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
    
    # Average Calculation
    if total_sources > 0:
        avg_dishes = total_mentions / total_sources
        print(f"Average Dishes per Website: {avg_dishes:.1f}")
    print(f"---------------------")

    # 3. Count Frequencies (Raw)
    raw_counts = Counter(all_votes)
    
    # 4. Merge Similar Spellings
    final_counts = merge_typos(raw_counts)

    # 5. Generate the Report Data
    # REMOVE LIMIT: most_common() without arguments returns ALL items
    top_dishes = final_counts.most_common()

    print("\n" + "="*85)
    print(f"{'RANK':<5} {'DISH NAME':<35} {'VOTES':<10} {'POPULARITY %':<15}")
    print("="*85)
    
    csv_data = []
    
    for rank, (dish, count) in enumerate(top_dishes, 1):
        # Calculate percentage: (Mentions / Total Websites) * 100
        popularity = (count / total_sources) * 100
        
        # Only print top 100 to console to avoid flooding, but ALL go to CSV
        if rank <= 100:
            print(f"{rank:<5} {dish:<35} {count:<10} {popularity:.1f}%")
        
        csv_data.append([rank, dish, count, f"{popularity:.2f}%"])

    if len(top_dishes) > 100:
        print(f"... and {len(top_dishes) - 100} more items (see CSV for full list).")

    # 6. Save to CSV
    with open(REPORT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Rank", "Dish Name", "Frequency (Votes)", "Consensus (Popularity %)"])
        writer.writerows(csv_data)

    print(f"\n[SUCCESS] Final Report generated: {REPORT_FILE}")
    print("\nNEXT STEPS FOR YOUR FYP:")
    print("1. Open the CSV file in Excel.")
    print("2. Look at the Top 25.")
    print("3. Filter out any that are visually identical (e.g., if 'Mutton Karahi' and 'Chicken Karahi'")
    print("   are both top ranked, you might merge them into a single 'Karahi' class).")
    print("4. Select your final 20.")

if __name__ == "__main__":
    analyze_frequencies()