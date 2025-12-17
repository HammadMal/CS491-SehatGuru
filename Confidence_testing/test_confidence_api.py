"""
Test confidence images using the FastAPI batch endpoint
Creates a nice presentation table for the top 5 dishes
"""
import requests
import os
from pathlib import Path
import pandas as pd
from typing import List, Dict
import json


def test_images_via_api(
    api_url: str,
    confidence_images_dir: str,
    top_dishes: List[str],
    top_k: int = 5
) -> pd.DataFrame:
    """
    Test all confidence images using the batch API endpoint
    
    Args:
        api_url: Base URL of the API (e.g., http://localhost:8000)
        confidence_images_dir: Directory containing test images organized by dish
        top_dishes: List of top 5 dish names to test
        top_k: Number of top predictions to get (default: 5)
    
    Returns:
        DataFrame with all results
    """
    print("=" * 80)
    print("MODEL CONFIDENCE TESTING VIA API")
    print("=" * 80)
    print(f"\nAPI URL: {api_url}")
    print(f"Images Directory: {confidence_images_dir}")
    print(f"Testing dishes: {', '.join(top_dishes)}")
    print("\n" + "=" * 80)
    
    endpoint = f"{api_url}/api/food/detect/batch"
    all_results = []
    
    for dish_name in top_dishes:
        dish_dir = Path(confidence_images_dir) / dish_name
        
        if not dish_dir.exists():
            print(f"\n⚠️  Warning: Directory not found for '{dish_name}'")
            print(f"   Expected: {dish_dir}")
            continue
        
        # Get all image files
        image_files = set()  # Use set to avoid duplicates
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
            image_files.update(dish_dir.glob(ext))
        
        image_files = sorted(list(image_files))  # Convert back to sorted list
        
        if not image_files:
            print(f"\n⚠️  Warning: No images found for '{dish_name}'")
            continue
        
        print(f"\n📁 {dish_name}")
        print(f"   Found {len(image_files)} test images")
        print(f"   Uploading to {endpoint}...")
        
        # Prepare files for upload
        files = []
        for img_path in sorted(image_files):
            files.append(
                ('files', (img_path.name, open(img_path, 'rb'), 'image/jpeg'))
            )
        
        try:
            # Make API request
            response = requests.post(
                endpoint,
                files=files,
                params={'top_k': top_k},
                timeout=300  # 5 minutes timeout for batch processing
            )
            
            # Close file handles
            for _, (_, file_obj, _) in files:
                file_obj.close()
            
            if response.status_code != 200:
                print(f"   ❌ Error: API returned status code {response.status_code}")
                print(f"   Response: {response.text}")
                continue
            
            results = response.json()
            
            # Process results
            for idx, result in enumerate(results, 1):
                if not result.get('success', False):
                    print(f"   {idx:2d}. {result['filename']:30s} → ERROR: {result.get('error', 'Unknown')}")
                    continue
                
                top_pred = result['top_prediction']
                predicted_class = top_pred['food_name']
                confidence = top_pred['confidence']
                is_correct = predicted_class.lower() == dish_name.lower()
                
                # Store detailed result
                result_row = {
                    'True Dish': dish_name,
                    'Image Number': idx,
                    'Filename': result['filename'],
                    'Predicted Class': predicted_class,
                    'Confidence (%)': confidence,
                    'Correct': '✓' if is_correct else '✗',
                }
                
                # Add top-5 predictions
                for pred in result['all_predictions'][:5]:
                    rank = pred['rank']
                    result_row[f'Top-{rank} Class'] = pred['food_name']
                    result_row[f'Top-{rank} Conf (%)'] = pred['confidence']
                
                all_results.append(result_row)
                
                # Print progress
                status = '✓' if is_correct else '✗'
                print(f"   {idx:2d}. {result['filename']:30s} → {predicted_class:20s} ({confidence:5.2f}%) {status}")
        
        except requests.exceptions.Timeout:
            print(f"   ❌ Error: Request timed out")
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Error: {str(e)}")
        except Exception as e:
            print(f"   ❌ Unexpected error: {str(e)}")
    
    if not all_results:
        print("\n❌ No results collected!")
        return None
    
    # Create DataFrame
    df = pd.DataFrame(all_results)
    return df


def generate_statistics(df: pd.DataFrame) -> pd.DataFrame:
    """Generate statistics by dish"""
    dishes = df['True Dish'].unique()
    stats = []
    
    for dish in dishes:
        dish_df = df[df['True Dish'] == dish]
        correct_count = (dish_df['Correct'] == '✓').sum()
        total_count = len(dish_df)
        accuracy = (correct_count / total_count * 100) if total_count > 0 else 0
        avg_confidence = dish_df['Confidence (%)'].mean()
        
        # Confidence when correct vs incorrect
        correct_conf = dish_df[dish_df['Correct'] == '✓']['Confidence (%)'].mean() if correct_count > 0 else 0
        incorrect_conf = dish_df[dish_df['Correct'] == '✗']['Confidence (%)'].mean() if (total_count - correct_count) > 0 else 0
        
        stats.append({
            'Dish Name': dish,
            'Total Images': total_count,
            'Correct': correct_count,
            'Incorrect': total_count - correct_count,
            'Accuracy (%)': round(accuracy, 2),
            'Avg Confidence (%)': round(avg_confidence, 2),
            'Avg Conf When Correct (%)': round(correct_conf, 2) if correct_count > 0 else 'N/A',
            'Avg Conf When Incorrect (%)': round(incorrect_conf, 2) if (total_count - correct_count) > 0 else 'N/A',
        })
    
    return pd.DataFrame(stats)


def print_results(df: pd.DataFrame, stats_df: pd.DataFrame):
    """Print formatted results"""
    print("\n" + "=" * 80)
    print("📊 OVERALL STATISTICS")
    print("=" * 80)
    
    total_images = len(df)
    total_correct = (df['Correct'] == '✓').sum()
    overall_accuracy = (total_correct / total_images * 100) if total_images > 0 else 0
    overall_confidence = df['Confidence (%)'].mean()
    
    print(f"\nTotal Images Tested: {total_images}")
    print(f"Correct Predictions: {total_correct}")
    print(f"Incorrect Predictions: {total_images - total_correct}")
    print(f"Overall Accuracy: {overall_accuracy:.2f}%")
    print(f"Average Confidence: {overall_confidence:.2f}%")
    
    print("\n" + "=" * 80)
    print("📋 STATISTICS BY DISH")
    print("=" * 80)
    print("\n" + stats_df.to_string(index=False))
    
    print("\n" + "=" * 80)
    print("🔍 DETAILED PREDICTIONS")
    print("=" * 80)
    
    # Show simplified view
    simple_df = df[['True Dish', 'Image Number', 'Filename', 'Predicted Class', 'Confidence (%)', 'Correct']]
    print("\n" + simple_df.to_string(index=False))


def save_results(df: pd.DataFrame, stats_df: pd.DataFrame, output_dir: str = "."):
    """Save results to CSV files"""
    output_path = Path(output_dir)
    
    # Save detailed results
    results_file = output_path / "confidence_test_results.csv"
    df.to_csv(results_file, index=False)
    print(f"\n✅ Detailed results saved to: {results_file}")
    
    # Save statistics
    stats_file = output_path / "confidence_test_statistics.csv"
    stats_df.to_csv(stats_file, index=False)
    print(f"✅ Statistics saved to: {stats_file}")
    
    # Create a pretty summary for presentation
    summary_file = output_path / "confidence_test_summary.txt"
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("MODEL CONFIDENCE TEST RESULTS - TOP 5 DISHES\n")
        f.write("=" * 80 + "\n\n")
        
        # Overall stats
        f.write("OVERALL PERFORMANCE\n")
        f.write("-" * 80 + "\n")
        total_images = len(df)
        total_correct = (df['Correct'] == '✓').sum()
        overall_accuracy = (total_correct / total_images * 100) if total_images > 0 else 0
        overall_confidence = df['Confidence (%)'].mean()
        
        f.write(f"Total Images Tested: {total_images}\n")
        f.write(f"Correct Predictions: {total_correct}\n")
        f.write(f"Overall Accuracy: {overall_accuracy:.2f}%\n")
        f.write(f"Average Confidence: {overall_confidence:.2f}%\n\n")
        
        # Stats by dish
        f.write("PERFORMANCE BY DISH\n")
        f.write("-" * 80 + "\n")
        f.write(stats_df.to_string(index=False))
        f.write("\n\n")
        
        # Detailed results
        f.write("DETAILED PREDICTIONS\n")
        f.write("-" * 80 + "\n")
        f.write(df.to_string(index=False))
    
    print(f"✅ Summary saved to: {summary_file}")


def main():
    """Main function"""
    
    # Configuration
    API_URL = "http://localhost:8000"  # Change if your API runs on different port
    CONFIDENCE_IMAGES_DIR = "Dataset/confidence_images"  # Your images directory
    
    # Top 20 dishes - Based on consensus ranking
    TOP_DISHES = [
        "Chicken Biryani",        # 1. Biryani (all types)
        "Chicken Karahi",         # 2. Karahi (all types)
        "White Chicken Pulao",    # 3. Pulao (all types)
        "Nihari",                 # 4. Nihari
        "Haleem",                 # 5. Haleem (all types)
        "Saag",                   # 6. Saag Dishes
        "Kheer",                  # 7. Kheer
        "Gulaab Jamun",           # 8. Gulab Jamun
        "Chana Chaat",            # 9. Chaat (all types)
        "Chapli Kebab",           # 10. Chapli Kebab
        "Sajji",                  # 11. Sajji
        "Aloo Samosa",            # 12. Samosas
        "Pakora",                 # 13. Pakoras
        "Dahi Baray",             # 14. Dahi Baray / Bhalla
        "Seekh Kebab",            # 15. Seekh Kabab
        "Jalebi",                 # 16. Jalebi
        "Gajar ka Halwa",         # 17. Gajar ka Halwa
        "Kulfi",                  # 18. Kulfi
        "Paratha",                # 19. Paratha
        "Zarda"                   # 20. Zarda
    ]
    
    print("\n🔬 Model Confidence Testing via API")
    print("=" * 80)
    
    # Check if API is running
    try:
        response = requests.get(f"{API_URL}/api/food/health", timeout=5)
        if response.status_code == 200:
            print("✅ API is running and healthy")
        else:
            print(f"⚠️  API returned status code {response.status_code}")
    except requests.exceptions.RequestException:
        print(f"❌ Error: Cannot connect to API at {API_URL}")
        print("   Make sure Docker Desktop is running and the backend is up")
        print("   You can check by visiting: http://localhost:8000/docs")
        return
    
    # Check if confidence images directory exists
    if not Path(CONFIDENCE_IMAGES_DIR).exists():
        print(f"\n❌ Error: Confidence images directory not found!")
        print(f"   Expected: {Path(CONFIDENCE_IMAGES_DIR).absolute()}")
        print(f"\n💡 Please create the directory and organize your images like this:")
        print(f"   {CONFIDENCE_IMAGES_DIR}/")
        for dish in TOP_DISHES:
            print(f"      {dish}/")
            print(f"         image1.jpg")
            print(f"         image2.jpg")
            print(f"         ...")
        return
    
    print(f"✅ Found confidence images directory")
    
    # Test images
    print("\n" + "=" * 80)
    print("Starting confidence testing...")
    print("=" * 80)
    
    df = test_images_via_api(
        api_url=API_URL,
        confidence_images_dir=CONFIDENCE_IMAGES_DIR,
        top_dishes=TOP_DISHES,
        top_k=5
    )
    
    if df is None or len(df) == 0:
        print("\n❌ No results to display")
        return
    
    # Generate statistics
    stats_df = generate_statistics(df)
    
    # Print results
    print_results(df, stats_df)
    
    # Save results to Confidence_testing directory
    script_dir = Path(__file__).parent
    save_results(df, stats_df, output_dir=script_dir)
    
    print("\n" + "=" * 80)
    print("✅ TESTING COMPLETE!")
    print("=" * 80)
    print("\n📊 Check the generated CSV files for detailed results")
    print("💡 You can open confidence_test_results.csv in Excel for better visualization")
    print("\n🌐 Or use Swagger UI at: http://localhost:8000/docs")
    print("   Navigate to POST /api/food/detect/batch to test manually")


if __name__ == "__main__":
    main()
