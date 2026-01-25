"""
Ingestion script for Pakistani Dishes Database.

This script:
1. Loads Food_dataset.csv with nutritional information
2. Optionally merges with extracted_dishes.json for name variants
3. Loads fyp_final_ranking.csv for popularity scores
4. Creates rich text representation for each dish
5. Generates embeddings and stores in ChromaDB

Usage:
    cd backend
    python -m app.scripts.ingest_dishes
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Optional

# Add backend to path for imports
backend_path = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_path))

import pandas as pd
from app.config.settings import settings
from app.services.vector_store import vector_store
from app.models.rag import DocumentChunk, DishDocument


def get_data_paths() -> Dict[str, Path]:
    """Get paths to all data files"""
    base_paths = [
        Path(__file__).parent.parent.parent.parent,  # From script location
        Path.cwd().parent,  # From backend directory
        Path.cwd(),  # From project root
    ]

    paths = {}

    for base in base_paths:
        # Food dataset
        food_path = base / "Dataset" / "Food_dataset.csv"
        if food_path.exists() and 'food_dataset' not in paths:
            paths['food_dataset'] = food_path

        # Extracted dishes
        dishes_path = base / "popular dish generation" / "data" / "extracted_dishes.json"
        if dishes_path.exists() and 'extracted_dishes' not in paths:
            paths['extracted_dishes'] = dishes_path

        # Ranking data
        ranking_path = base / "popular dish generation" / "data" / "fyp_final_ranking.csv"
        if ranking_path.exists() and 'ranking' not in paths:
            paths['ranking'] = ranking_path

    return paths


def load_food_dataset(path: Path) -> pd.DataFrame:
    """Load and clean the food dataset"""
    df = pd.read_csv(path)

    # Clean column names
    df.columns = df.columns.str.strip().str.lower()

    # Rename columns to standard names
    column_mapping = {
        'food_name': 'name',
        'energy_kcal': 'calories',
        'carb_g': 'carbs_g',
        'protein_g': 'protein_g',
        'fat_g': 'fat_g',
        'fibre_g': 'fiber_g',
        'freesugar_g': 'sugar_g',
        'sodium_mg': 'sodium_mg',
    }
    df = df.rename(columns=column_mapping)

    # Fill NaN values with 0 for numeric columns
    numeric_cols = ['calories', 'carbs_g', 'protein_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    return df


def load_extracted_dishes(path: Path) -> Dict[str, List[str]]:
    """Load extracted dishes with source URLs"""
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data


def load_ranking_data(path: Path) -> pd.DataFrame:
    """Load dish popularity ranking"""
    df = pd.read_csv(path)
    df.columns = df.columns.str.strip().str.lower()
    return df


def categorize_dish(name: str, calories: float, protein_g: float, carbs_g: float) -> Dict[str, str]:
    """Categorize a dish based on its name and nutritional profile"""
    name_lower = name.lower()

    # Determine meal type
    meal_type = None
    if any(kw in name_lower for kw in ['paratha', 'halwa puri', 'omelette', 'egg']):
        meal_type = 'breakfast'
    elif any(kw in name_lower for kw in ['biryani', 'pulao', 'karahi', 'nihari', 'korma']):
        meal_type = 'lunch/dinner'
    elif any(kw in name_lower for kw in ['samosa', 'pakora', 'chaat', 'kebab']):
        meal_type = 'snack'
    elif any(kw in name_lower for kw in ['kheer', 'halwa', 'gulab jamun', 'barfi', 'jalebi']):
        meal_type = 'dessert'
    elif any(kw in name_lower for kw in ['lassi', 'chai', 'sharbat']):
        meal_type = 'beverage'

    # Determine category
    category = None
    if any(kw in name_lower for kw in ['chicken', 'mutton', 'beef', 'lamb', 'meat', 'keema', 'qeema']):
        category = 'meat'
    elif any(kw in name_lower for kw in ['fish', 'prawn', 'shrimp', 'machli']):
        category = 'seafood'
    elif any(kw in name_lower for kw in ['dal', 'daal', 'lentil', 'chana', 'rajma']):
        category = 'legumes'
    elif any(kw in name_lower for kw in ['sabzi', 'vegetable', 'aloo', 'bhindi', 'baingan', 'gobhi']):
        category = 'vegetable'
    elif any(kw in name_lower for kw in ['rice', 'biryani', 'pulao', 'chawal']):
        category = 'rice_dish'
    elif any(kw in name_lower for kw in ['roti', 'naan', 'paratha', 'bread']):
        category = 'bread'
    elif any(kw in name_lower for kw in ['salad', 'raita']):
        category = 'side_dish'

    # Determine dietary tags based on nutrition
    tags = []
    if protein_g >= 15:
        tags.append('high_protein')
    if calories <= 200:
        tags.append('low_calorie')
    if carbs_g <= 20:
        tags.append('low_carb')
    if 'dal' in name_lower or 'sabzi' in name_lower:
        tags.append('vegetarian')

    return {
        'meal_type': meal_type,
        'category': category,
        'tags': tags
    }


def create_dish_embedding_text(
    name: str,
    calories: float,
    protein_g: float,
    carbs_g: float,
    fat_g: float,
    fiber_g: float = 0,
    category_info: Optional[Dict] = None,
    popularity_rank: Optional[int] = None
) -> str:
    """Create rich text representation for embedding"""
    parts = [f"{name} is a Pakistani dish"]

    if calories > 0:
        parts.append(f"with approximately {calories:.0f} kcal per serving")

    nutrition_parts = []
    if protein_g > 0:
        nutrition_parts.append(f"{protein_g:.1f}g protein")
    if carbs_g > 0:
        nutrition_parts.append(f"{carbs_g:.1f}g carbohydrates")
    if fat_g > 0:
        nutrition_parts.append(f"{fat_g:.1f}g fat")
    if fiber_g > 0:
        nutrition_parts.append(f"{fiber_g:.1f}g fiber")

    if nutrition_parts:
        parts.append(f"containing {', '.join(nutrition_parts)}")

    if category_info:
        if category_info.get('meal_type'):
            parts.append(f"typically served for {category_info['meal_type']}")
        if category_info.get('category'):
            parts.append(f"classified as a {category_info['category']} dish")
        if category_info.get('tags'):
            parts.append(f"suitable for {', '.join(category_info['tags'])} diets")

    if popularity_rank and popularity_rank <= 50:
        parts.append(f"ranked #{popularity_rank} in popularity")

    return ". ".join(parts) + "."


def ingest_dishes_database():
    """
    Main ingestion function for dishes database.
    """
    print("=" * 60)
    print("SehatGuru RAG - Dishes Database Ingestion")
    print("=" * 60)

    # Get data file paths
    paths = get_data_paths()

    if 'food_dataset' not in paths:
        print("\nError: Food_dataset.csv not found")
        return False

    print(f"\nData files found:")
    for name, path in paths.items():
        print(f"  - {name}: {path}")

    # Load food dataset
    print(f"\nLoading food dataset...")
    df = load_food_dataset(paths['food_dataset'])
    print(f"  Loaded {len(df)} food items")

    # Load ranking data if available
    popularity_map = {}
    if 'ranking' in paths:
        print("\nLoading popularity ranking...")
        ranking_df = load_ranking_data(paths['ranking'])
        for _, row in ranking_df.iterrows():
            dish_name = row.get('parent dish class', '').strip().lower()
            rank = row.get('rank', 999)
            if dish_name:
                popularity_map[dish_name] = int(rank)
        print(f"  Loaded {len(popularity_map)} popularity rankings")

    # Load extracted dishes for name variants (optional)
    name_variants = {}
    if 'extracted_dishes' in paths:
        print("\nLoading dish name variants...")
        try:
            extracted = load_extracted_dishes(paths['extracted_dishes'])
            # Flatten to get all dish names
            for source, dishes in extracted.items():
                for dish in dishes:
                    dish_lower = dish.lower().strip()
                    if dish_lower not in name_variants:
                        name_variants[dish_lower] = set()
                    # Add source as context
            print(f"  Found {len(name_variants)} unique dish names")
        except Exception as e:
            print(f"  Error loading extracted dishes: {e}")

    # Reset collection
    collection_name = settings.RAG_COLLECTION_DISHES
    print(f"\nResetting collection: {collection_name}")
    vector_store.reset_collection(collection_name)

    # Create document chunks for each dish
    print("\nCreating dish documents...")
    documents = []

    for idx, row in df.iterrows():
        name = str(row.get('name', '')).strip()
        if not name:
            continue

        # Get nutritional values
        calories = float(row.get('calories', 0))
        protein_g = float(row.get('protein_g', 0))
        carbs_g = float(row.get('carbs_g', 0))
        fat_g = float(row.get('fat_g', 0))
        fiber_g = float(row.get('fiber_g', 0))
        sugar_g = float(row.get('sugar_g', 0))
        sodium_mg = float(row.get('sodium_mg', 0))

        # Get category info
        category_info = categorize_dish(name, calories, protein_g, carbs_g)

        # Get popularity rank
        name_lower = name.lower()
        popularity_rank = None
        for rank_name, rank in popularity_map.items():
            if rank_name in name_lower or name_lower in rank_name:
                popularity_rank = rank
                break

        # Create embedding text
        embedding_text = create_dish_embedding_text(
            name=name,
            calories=calories,
            protein_g=protein_g,
            carbs_g=carbs_g,
            fat_g=fat_g,
            fiber_g=fiber_g,
            category_info=category_info,
            popularity_rank=popularity_rank
        )

        # Create document chunk
        # Note: ChromaDB doesn't accept None values, so we use empty strings/0 as defaults
        doc = DocumentChunk(
            content=embedding_text,
            metadata={
                'dish_id': f"dish_{idx}",
                'name': name,
                'calories': calories,
                'protein_g': protein_g,
                'carbs_g': carbs_g,
                'fat_g': fat_g,
                'fiber_g': fiber_g,
                'sugar_g': sugar_g,
                'sodium_mg': sodium_mg,
                'meal_type': category_info.get('meal_type') or '',
                'category': category_info.get('category') or '',
                'tags': ','.join(category_info.get('tags', [])),
                'popularity_rank': popularity_rank if popularity_rank is not None else 0,
                'source_type': 'food_database'
            }
        )
        documents.append(doc)

    print(f"  Created {len(documents)} dish documents")

    if not documents:
        print("\nNo dish documents created")
        return False

    # Show sample
    print("\nSample document:")
    sample = documents[0]
    print(f"  Content: {sample.content[:200]}...")
    print(f"  Metadata: {sample.metadata}")

    # Add to vector store
    print(f"\nAdding {len(documents)} dishes to vector store...")
    print("This may take several minutes for embedding generation...")

    try:
        added = vector_store.add_documents_batch(
            collection_name,
            documents,
            batch_size=50
        )
        print(f"\nSuccessfully added {added} dishes to collection")
    except Exception as e:
        print(f"\nError adding documents: {e}")
        return False

    # Verify ingestion
    print("\nVerifying ingestion...")
    info = vector_store.get_collection_info(collection_name)
    print(f"  Collection: {info['name']}")
    print(f"  Document count: {info['count']}")

    # Test queries
    print("\nRunning test queries...")
    test_queries = [
        "high protein Pakistani dishes",
        "low calorie breakfast options",
        "popular Pakistani biryani dishes",
    ]

    for query in test_queries:
        results = vector_store.query(collection_name, query, top_k=3)
        print(f"\n  Query: '{query}'")
        if results:
            for i, r in enumerate(results, 1):
                name = r['metadata'].get('name', 'Unknown')
                calories = r['metadata'].get('calories', 0)
                score = r['similarity_score']
                print(f"    {i}. {name} ({calories:.0f} kcal) - Score: {score:.4f}")
        else:
            print("    No results found")

    print("\n" + "=" * 60)
    print("Dishes database ingestion complete!")
    print("=" * 60)

    return True


if __name__ == "__main__":
    success = ingest_dishes_database()
    sys.exit(0 if success else 1)
