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
)

# Print for debugging (AFTER LOADING)
print("CSV Columns:", nutrition_df.columns.tolist())

def get_macros(dish_name: str):
    dish = dish_name.lower().strip()
    
    row = nutrition_df[nutrition_df["food_name"] == dish]

    if row.empty:
        return None

    return {
        "calories": float(row["energy_kcal"].values[0]),
        "carbs": float(row["carb_g"].values[0]),
        "protein": float(row["protein_g"].values[0]),
        "fat": float(row["fat_g"].values[0])
    }
