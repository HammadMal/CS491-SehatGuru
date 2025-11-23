#!/usr/bin/env python3
"""
Test script for food detection API

Usage:
    python test_food_detection.py <image_path>
    python test_food_detection.py <image_path> --detailed
    python test_food_detection.py <image_path> --url http://localhost:8000

Examples:
    python test_food_detection.py food_image.jpg
    python test_food_detection.py pizza.png --detailed
"""

import requests
import sys
import os
from pathlib import Path
import argparse


def test_food_detection(image_path: str, base_url: str = "http://localhost:8000", detailed: bool = False):
    """
    Test the food detection endpoint with an image file

    Args:
        image_path: Path to the image file
        base_url: Base URL of the API
        detailed: Whether to use the detailed endpoint
    """
    # Validate image path
    if not os.path.exists(image_path):
        print(f"❌ Error: Image file not found: {image_path}")
        return False

    # Determine endpoint
    endpoint = f"{base_url}/api/food/detect/detailed" if detailed else f"{base_url}/api/food/detect"

    print(f"\n🔍 Testing Food Detection")
    print(f"   Image: {image_path}")
    print(f"   Endpoint: {endpoint}")
    print(f"   Mode: {'Detailed' if detailed else 'Simple'}")
    print("-" * 60)

    try:
        # Open and send the image
        with open(image_path, 'rb') as f:
            files = {'file': (os.path.basename(image_path), f, 'image/jpeg')}

            print("\n⏳ Uploading image and running detection...")
            response = requests.post(endpoint, files=files)

        # Check response
        if response.status_code == 200:
            result = response.json()

            print("\n✅ Detection Successful!")
            print("=" * 60)

            if detailed:
                # Show detailed results
                print(f"\n🏆 Top Prediction:")
                top = result['top_prediction']
                confidence_emoji = "✅" if not top['is_low_confidence'] else "⚠️"
                print(f"   {confidence_emoji} Food: {top['food_name']}")
                print(f"   📊 Confidence: {top['confidence']:.2%}")
                if top['is_low_confidence']:
                    print(f"   ⚠️  Low confidence warning!")

                print(f"\n📋 All Predictions:")
                for i, pred in enumerate(result['predictions'], 1):
                    confidence_emoji = "✅" if not pred['is_low_confidence'] else "⚠️"
                    print(f"   {i}. {confidence_emoji} {pred['food_name']} ({pred['confidence']:.2%})")
            else:
                # Show simple results
                confidence_emoji = "✅" if not result['is_low_confidence'] else "⚠️"
                print(f"\n   {confidence_emoji} Food: {result['food_name']}")
                print(f"   📊 Confidence: {result['confidence']:.2%}")

                if result['is_low_confidence']:
                    print(f"\n   ⚠️  Low Confidence Warning!")
                    print(f"   The model is not very confident about this prediction.")
                    print(f"   Consider retaking the photo or using the detailed endpoint.")

            print("\n" + "=" * 60)
            return True

        else:
            print(f"\n❌ Error: {response.status_code}")
            print(f"   {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print(f"\n❌ Connection Error!")
        print(f"   Could not connect to {base_url}")
        print(f"   Make sure the API server is running:")
        print(f"   cd backend && python main.py")
        return False

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return False


def test_health_check(base_url: str = "http://localhost:8000"):
    """Test the health check endpoint"""
    try:
        response = requests.get(f"{base_url}/api/food/health")
        if response.status_code == 200:
            print("✅ Food detection service is healthy")
            return True
        else:
            print(f"⚠️  Food detection service returned status: {response.status_code}")
            print(f"   {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to {base_url}")
        print(f"   Make sure the API server is running")
        return False
    except Exception as e:
        print(f"❌ Health check failed: {str(e)}")
        return False


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description="Test food detection API with an image file",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python test_food_detection.py food.jpg
  python test_food_detection.py pizza.png --detailed
  python test_food_detection.py burger.jpg --url http://localhost:8000
        """
    )

    parser.add_argument(
        'image_path',
        nargs='?',
        help='Path to the image file to test'
    )

    parser.add_argument(
        '--url',
        default='http://localhost:8000',
        help='Base URL of the API (default: http://localhost:8000)'
    )

    parser.add_argument(
        '--detailed',
        action='store_true',
        help='Use detailed endpoint with top-k predictions'
    )

    parser.add_argument(
        '--health',
        action='store_true',
        help='Check health status only'
    )

    args = parser.parse_args()

    # Print header
    print("\n" + "=" * 60)
    print("   SehatGuru Food Detection API Test")
    print("=" * 60)

    # Health check
    if args.health:
        print(f"\n🏥 Checking service health at {args.url}...")
        test_health_check(args.url)
        return

    # Require image path if not health check
    if not args.image_path:
        print("\n❌ Error: Image path is required")
        parser.print_help()
        sys.exit(1)

    # First, do a health check
    print(f"\n🏥 Checking service health...")
    if not test_health_check(args.url):
        print("\n⚠️  Service is not healthy, but attempting detection anyway...")

    # Run detection test
    success = test_food_detection(args.image_path, args.url, args.detailed)

    if success:
        print("\n✅ Test completed successfully!")
    else:
        print("\n❌ Test failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
