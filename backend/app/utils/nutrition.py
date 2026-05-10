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

FOOD_NAME_ALIASES = {
    # Model label -> closest nutrition CSV label
    "aloo gobi": "potato cauliflower",
    "aloo sabzi": "potato curry",
    "bhindi masala": "okra/lady's fingers fry",
    "boiled eggs": "boiled egg",
    "bun kabab": "vegetable burger",
    "burger": "vegetable burger",
    "chai": "hot tea",
    "chana masala": "chickpeas curry",
    "chicken pulao": "white chicken pulao",
    "chicken roll": "paneer kaathi roll",
    "daal chawal": "mixed dal",
    "falooda": "sweet lassi",
    "fried chicken": "fried chicken with tomato sauce",
    "fries": "fried fish and chips",
    "ice cream": "vanilla ice cream without egg",
    "kheer": "rice kheer",
    "pakistani omelette": "plain omelette/omlet",
    "palak paneer": "spinach paneer",
    "pani puri": "chana chaat",
    "pasta": "classic italian pasta",
    "sandwich": "chicken sandwich",
    "shami kabab": "shammi kabab",
    "sheer khurma": "vermicelli kheer",
    "steak": "roasted cauliflower steak",
}


def _normalize_food_name(name: str) -> str:
    return (
        str(name)
        .lower()
        .strip()
        .replace("kebab", "kabab")
        .strip()
    )


def get_macros(dish_name: str):
    dish = _normalize_food_name(dish_name)
    
    row = nutrition_df[nutrition_df["food_name"] == dish]
    if row.empty and dish in FOOD_NAME_ALIASES:
        row = nutrition_df[nutrition_df["food_name"] == FOOD_NAME_ALIASES[dish]]

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
