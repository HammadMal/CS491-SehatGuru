#!/usr/bin/env python3
"""
Test Password Reset Flow
"""

import requests
import json
import re

API_URL = "http://localhost:8000/api/auth"
EMAIL = "test@example.com"
OLD_PASSWORD = "oldpass123"
NEW_PASSWORD = "newpass456"


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


def extract_reset_token_from_link(link: str) -> str:
    """Extract token from reset link"""
    match = re.search(r'token=([^&]+)', link)
    if match:
        return match.group(1)
    return None


def main():
    print_section("Password Reset Flow Test")

    # Step 1: Register user with old password
    print("\n1. Registering test user...")
    register_response = requests.post(
        f"{API_URL}/register",
        json={
            "full_name": "Password Test User",
            "email": EMAIL,
            "password": OLD_PASSWORD
        }
    )

    if register_response.status_code == 500:
        # User might already exist, delete first
        print("User exists, deleting...")
        requests.delete(f"{API_URL}/admin/delete-user-by-email/{EMAIL}")
        # Try registering again
        register_response = requests.post(
            f"{API_URL}/register",
            json={
                "full_name": "Password Test User",
                "email": EMAIL,
                "password": OLD_PASSWORD
            }
        )

    print_response(register_response)

    if register_response.status_code != 201:
        print("❌ Registration failed!")
        return

    print("✅ User registered successfully!")

    # Step 2: Login with old password
    print("\n2. Testing login with OLD password...")
    old_login_response = requests.post(
        f"{API_URL}/login",
        json={"email": EMAIL, "password": OLD_PASSWORD}
    )
    print_response(old_login_response)

    if old_login_response.status_code == 200:
        print("✅ Login with old password works!")
    else:
        print("❌ Login with old password failed!")
        return

    # Step 3: Request password reset
    print("\n3. Requesting password reset...")
    forgot_response = requests.post(
        f"{API_URL}/forgot-password",
        json={"email": EMAIL}
    )
    print_response(forgot_response)

    if forgot_response.status_code == 200:
        print("✅ Password reset email would be sent")
        print("NOTE: Check server logs or email for reset link")
    else:
        print("❌ Password reset request failed!")
        return

    # Step 4: Simulate getting token from email
    # In real scenario, user gets this from email link
    # For testing, we'll generate the token manually
    print("\n4. Generating password reset token...")
    from app.utils.jwt import create_password_reset_token
    reset_token = create_password_reset_token(EMAIL)
    print(f"Reset Token: {reset_token[:50]}...")

    # Step 5: Reset password
    print("\n5. Resetting password to NEW password...")
    reset_response = requests.post(
        f"{API_URL}/reset-password",
        json={
            "token": reset_token,
            "new_password": NEW_PASSWORD
        }
    )
    print_response(reset_response)

    if reset_response.status_code == 200:
        print("✅ Password reset successful!")
    else:
        print("❌ Password reset failed!")
        return

    # Step 6: Try login with OLD password (should fail)
    print("\n6. Testing login with OLD password (should FAIL)...")
    old_login_fail_response = requests.post(
        f"{API_URL}/login",
        json={"email": EMAIL, "password": OLD_PASSWORD}
    )
    print_response(old_login_fail_response)

    if old_login_fail_response.status_code == 401:
        print("✅ Old password correctly rejected!")
    else:
        print("❌ Old password still works - BUG!")
        return

    # Step 7: Try login with NEW password (should work)
    print("\n7. Testing login with NEW password (should WORK)...")
    new_login_response = requests.post(
        f"{API_URL}/login",
        json={"email": EMAIL, "password": NEW_PASSWORD}
    )
    print_response(new_login_response)

    if new_login_response.status_code == 200:
        print("✅ New password works!")
    else:
        print("❌ New password doesn't work - BUG!")
        return

    # Cleanup
    print("\n8. Cleaning up test user...")
    requests.delete(f"{API_URL}/admin/delete-user-by-email/{EMAIL}")
    print("✅ Test user deleted")

    print_section("✅ All Password Reset Tests Passed!")


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
