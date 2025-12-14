import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "nutrients.csv")

# Load CSV
nutrition_df = pd.read_csv(CSV_PATH)

# Clean column names (IMPORTANT)
nutrition_df.columns = nutrition_df.columns.str.lower().str.strip()

# Clean food names
nutrition_df["food_name"] = (
    nutrition_df["food_name"]
    .astype(str)
    .str.lower()
    .str.strip()
    .str.replace(r'\s*\([^)]*\)', '', regex=True)  # Remove parentheses and content
    .str.replace('kebab', 'kabab', case=False)  # Normalize spelling
    .str.strip()
)

# Print for debugging (AFTER LOADING)
print("CSV Columns:", nutrition_df.columns.tolist())

def get_macros(dish_name: str):
    dish = (dish_name.lower().strip()
            .replace('kebab', 'kabab')
            .strip())
    print(f"[DEBUG] Looking up nutrients for dish: '{dish_name}' -> normalized: '{dish}'")
    
    row = nutrition_df[nutrition_df["food_name"] == dish]
    print(f"[DEBUG] Found {len(row)} matching rows in CSV")

    if row.empty:
        print(f"[DEBUG] No match found for '{dish}'. Available food_names: {nutrition_df['food_name'].head(10).tolist()}")
        return None

    try:
        result = {
            "calories": float(row["energy_kcal"].values[0]),
            "carbs": float(row["carb_g"].values[0]),
            "protein": float(row["protein_g"].values[0]),
            "fat": float(row["fat_g"].values[0])
        }
        print(f"[DEBUG] Returning nutrients: {result}")
        return result
    except (ValueError, KeyError) as e:
        print(f"[DEBUG] Error parsing nutrients for '{dish}': {e}")
        return None
