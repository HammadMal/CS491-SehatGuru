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
    .str.replace('kebab', 'kabab', case=False)     # Normalize spelling
    .str.strip()
)

def get_macros(dish_name: str):
    dish = (
        dish_name.lower()
        .strip()
        .replace('kebab', 'kabab')
        .strip()
    )
    
    row = nutrition_df[nutrition_df["food_name"] == dish]

    if row.empty:
        return None

    try:
        return {
            "calories": float(row["energy_kcal"].values[0]),
            "carbs": float(row["carb_g"].values[0]),
            "protein": float(row["protein_g"].values[0]),
            "fat": float(row["fat_g"].values[0])
        }
    except (ValueError, KeyError):
        return None
