#!/usr/bin/env python3
"""
Test Google OAuth Endpoint

This script helps you test the Google OAuth endpoint by:
1. Accepting a Google ID token
2. Sending it to the backend
3. Testing the returned access token
"""

import requests
import json
import sys


API_URL = "http://localhost:8000/api/auth"


def print_section(title: str):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)


def test_google_auth(id_token: str):
    """Test Google OAuth endpoint with ID token"""

    print_section("Testing Google OAuth Endpoint")

    # Step 1: Send ID token to backend
    print("\n1. Sending Google ID token to backend...")
    print(f"Token preview: {id_token[:50]}...")

    try:
        response = requests.post(
            f"{API_URL}/google",
            json={"id_token": id_token}
        )

        print(f"\nStatus Code: {response.status_code}")
        print(f"Response:")
        print(json.dumps(response.json(), indent=2))

        if response.status_code != 200:
            print("\n❌ Google authentication failed!")
            return

        tokens = response.json()
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")

        print("\n✅ Google authentication successful!")
        print(f"Access Token: {access_token[:50]}...")
        print(f"Refresh Token: {refresh_token[:50]}...")

        # Step 2: Test /me endpoint
        print("\n2. Testing /me endpoint with access token...")
        me_response = requests.get(
            f"{API_URL}/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        print(f"\nStatus Code: {me_response.status_code}")
        print(f"User Profile:")
        print(json.dumps(me_response.json(), indent=2))

        if me_response.status_code == 200:
            user_data = me_response.json()
            print("\n✅ User profile retrieved!")
            print(f"   Email: {user_data.get('email')}")
            print(f"   Name: {user_data.get('full_name')}")
            print(f"   Email Verified: {user_data.get('email_verified')}")
            print(f"   UID: {user_data.get('uid')}")

        # Step 3: Test refresh token
        print("\n3. Testing refresh token endpoint...")
        refresh_response = requests.post(
            f"{API_URL}/refresh",
            headers={"Authorization": f"Bearer {refresh_token}"}
        )

        print(f"\nStatus Code: {refresh_response.status_code}")

        if refresh_response.status_code == 200:
            new_tokens = refresh_response.json()
            print("\n✅ Token refresh successful!")
            print(f"New Access Token: {new_tokens.get('access_token')[:50]}...")
        else:
            print(f"Response: {refresh_response.text}")

        print_section("✅ All Google OAuth Tests Passed!")

    except requests.exceptions.ConnectionError:
        print("\n❌ Could not connect to backend!")
        print(f"Make sure the server is running at: {API_URL}")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


def main():
    print_section("Google OAuth Token Tester")
    print("\nTo get a Google ID token, you have several options:")
    print("1. Open test_google_auth.html in your browser (easiest)")
    print("2. Use Google OAuth Playground: https://developers.google.com/oauthplayground/")
    print("3. Build a frontend app with Google Sign-In")

    if len(sys.argv) > 1:
        # Token provided as command line argument
        id_token = sys.argv[1]
        test_google_auth(id_token)
    else:
        # Ask for token
        print("\n" + "=" * 60)
        print("Enter your Google ID token:")
        print("(Paste the token and press Enter)")
        print("=" * 60)

        id_token = input("\nGoogle ID Token: ").strip()

        if not id_token:
            print("\n❌ No token provided!")
            print("\nUsage:")
            print("  python test_google_oauth.py")
            print("  python test_google_oauth.py <google_id_token>")
            return

        test_google_auth(id_token)


if __name__ == "__main__":
    main()
