#!/usr/bin/env python3
"""
Test Email Verification Sync
"""

import requests
import json

API_URL = "http://localhost:8000/api/auth"
EMAIL = "verify-test@example.com"
PASSWORD = "test123"


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
    print_section("Email Verification Sync Test")

    # Step 1: Clean up if user exists
    print("\n1. Cleaning up existing test user...")
    requests.delete(f"{API_URL}/admin/delete-user-by-email/{EMAIL}")

    # Step 2: Register user
    print("\n2. Registering test user...")
    register_response = requests.post(
        f"{API_URL}/register",
        json={
            "full_name": "Email Test User",
            "email": EMAIL,
            "password": PASSWORD
        }
    )
    print_response(register_response)

    if register_response.status_code != 201:
        print("❌ Registration failed!")
        return

    user_data = register_response.json()
    uid = user_data.get("uid")
    print(f"✅ User registered with UID: {uid}")
    print(f"Email verified (at registration): {user_data.get('email_verified')}")

    # Step 3: Login and get token
    print("\n3. Logging in to get access token...")
    login_response = requests.post(
        f"{API_URL}/login",
        json={"email": EMAIL, "password": PASSWORD}
    )

    if login_response.status_code != 200:
        print("❌ Login failed!")
        return

    access_token = login_response.json()["access_token"]
    print("✅ Logged in successfully")

    # Step 4: Check /me endpoint BEFORE verification
    print("\n4. Checking /me endpoint BEFORE email verification...")
    me_response_before = requests.get(
        f"{API_URL}/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    print_response(me_response_before)

    if me_response_before.status_code == 200:
        verified_before = me_response_before.json().get("email_verified")
        print(f"Email verified status: {verified_before}")
        if not verified_before:
            print("✅ Correctly shows as NOT verified")
        else:
            print("⚠️ Unexpected: Shows as verified but shouldn't be")

    # Step 5: Manually verify email in Firebase Auth
    print("\n5. Manually verifying email in Firebase Auth...")
    print("(Simulating user clicking verification link)")

    from app.config.firebase import firebase_client
    try:
        firebase_client.update_user(uid, email_verified=True)
        print("✅ Email verified in Firebase Auth")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return

    # Step 6: Check /me endpoint AFTER verification
    print("\n6. Checking /me endpoint AFTER email verification...")
    print("(This should auto-sync the status from Firebase Auth to Firestore)")
    me_response_after = requests.get(
        f"{API_URL}/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    print_response(me_response_after)

    if me_response_after.status_code == 200:
        verified_after = me_response_after.json().get("email_verified")
        print(f"Email verified status: {verified_after}")
        if verified_after:
            print("✅ Correctly synced! Shows as VERIFIED")
        else:
            print("❌ BUG: Still shows as NOT verified")
            return

    # Step 7: Check again to make sure it stays synced
    print("\n7. Checking /me endpoint AGAIN (should be cached in Firestore now)...")
    me_response_again = requests.get(
        f"{API_URL}/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    if me_response_again.status_code == 200:
        verified_again = me_response_again.json().get("email_verified")
        if verified_again:
            print("✅ Status persisted correctly in Firestore")
        else:
            print("❌ Status not persisted")

    # Cleanup
    print("\n8. Cleaning up test user...")
    requests.delete(f"{API_URL}/admin/delete-user-by-email/{EMAIL}")
    print("✅ Test user deleted")

    print_section("✅ Email Verification Sync Test Passed!")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ Could not connect to server!")
        print("Make sure the server is running: python main.py")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
