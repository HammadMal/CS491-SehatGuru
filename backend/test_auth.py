#!/usr/bin/env python3
"""
SehatGuru Auth Testing Script (Python)
Tests all authentication endpoints
"""

import requests
import json
from typing import Dict

API_URL = "http://localhost:8000/api/auth"
EMAIL = "test@example.com"
PASSWORD = "correct123"


def print_section(title: str):
    print("\n" + "=" * 50)
    print(title)
    print("=" * 50)


def print_response(response: requests.Response):
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
    print(f"Status: {response.status_code}")


def main():
    print_section("SehatGuru Authentication Tests")

    # 1. Login
    print("\n1. Testing Login...")
    login_response = requests.post(
        f"{API_URL}/login",
        json={"email": EMAIL, "password": PASSWORD}
    )
    print_response(login_response)

    if login_response.status_code != 200:
        print("\n❌ Login failed! Check your credentials.")
        return

    tokens = login_response.json()
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    print(f"\n✅ Login successful!")
    print(f"Access Token: {access_token[:50]}...")
    print(f"Refresh Token: {refresh_token[:50]}...")

    # 2. Test /me with access token
    print("\n2. Testing GET /me with access token...")
    me_response = requests.get(
        f"{API_URL}/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    print_response(me_response)

    if me_response.status_code == 200:
        print("✅ /me endpoint works!")
    else:
        print("❌ /me endpoint failed!")

    # 3. Test refresh with refresh token
    print("\n3. Testing POST /refresh with refresh token...")
    refresh_response = requests.post(
        f"{API_URL}/refresh",
        headers={"Authorization": f"Bearer {refresh_token}"}
    )
    print_response(refresh_response)

    if refresh_response.status_code == 200:
        print("✅ Refresh endpoint works!")
        new_tokens = refresh_response.json()
        new_access_token = new_tokens["access_token"]
        print(f"New Access Token: {new_access_token[:50]}...")
    else:
        print("❌ Refresh endpoint failed!")
        return

    # 4. Test logout
    print("\n4. Testing POST /logout with access token...")
    logout_response = requests.post(
        f"{API_URL}/logout",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    print_response(logout_response)

    if logout_response.status_code == 200:
        print("✅ Logout successful!")
    else:
        print("❌ Logout failed!")

    # 5. Try using logged-out token
    print("\n5. Testing GET /me with logged-out token (should fail)...")
    failed_me_response = requests.get(
        f"{API_URL}/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    print_response(failed_me_response)

    if failed_me_response.status_code == 401:
        print("✅ Token correctly invalidated after logout!")
    else:
        print("❌ Token should have been invalidated!")

    print_section("All Tests Completed! ✅")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ Could not connect to server!")
        print("Make sure the server is running: python main.py")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
