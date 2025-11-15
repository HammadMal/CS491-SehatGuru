#!/usr/bin/env python3
"""
Test Session Invalidation on Password Reset

Verifies that when a user resets their password, all existing sessions
(JWT tokens) are invalidated and they must login again.
"""

import requests
import json
import time

API_URL = "http://localhost:8000/api/auth"
EMAIL = "session-test@example.com"
OLD_PASSWORD = "oldpass123"
NEW_PASSWORD = "newpass456"


def print_section(title: str):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)


def print_response(response: requests.Response):
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
    print(f"Status: {response.status_code}")


def main():
    print_section("Session Invalidation Test")

    # Cleanup
    print("\n0. Cleaning up existing test user...")
    requests.delete(f"{API_URL}/admin/delete-user-by-email/{EMAIL}")

    # Step 1: Register
    print("\n1. Registering user...")
    register_response = requests.post(
        f"{API_URL}/register",
        json={
            "full_name": "Session Test User",
            "email": EMAIL,
            "password": OLD_PASSWORD
        }
    )

    if register_response.status_code != 201:
        print("❌ Registration failed!")
        print_response(register_response)
        return

    print("✅ User registered")

    # Step 2: Login and get tokens
    print("\n2. Logging in with OLD password...")
    login_response = requests.post(
        f"{API_URL}/login",
        json={"email": EMAIL, "password": OLD_PASSWORD}
    )

    if login_response.status_code != 200:
        print("❌ Login failed!")
        print_response(login_response)
        return

    tokens = login_response.json()
    old_access_token = tokens["access_token"]
    print("✅ Login successful")
    print(f"Access Token (first 50 chars): {old_access_token[:50]}...")

    # Step 3: Use token to access /me (should work)
    print("\n3. Testing /me with OLD session (should WORK)...")
    me_response_before = requests.get(
        f"{API_URL}/me",
        headers={"Authorization": f"Bearer {old_access_token}"}
    )

    if me_response_before.status_code == 200:
        print("✅ Old session works (as expected)")
    else:
        print("❌ Old session doesn't work (unexpected!)")
        print_response(me_response_before)
        return

    # Step 4: Request password reset
    print("\n4. Requesting password reset...")
    from app.utils.jwt import create_password_reset_token

    reset_token = create_password_reset_token(EMAIL)
    print(f"Reset token generated: {reset_token[:50]}...")

    # Small delay to ensure timestamp difference
    time.sleep(1)

    # Step 5: Reset password
    print("\n5. Resetting password to NEW password...")
    reset_response = requests.post(
        f"{API_URL}/reset-password",
        json={
            "token": reset_token,
            "new_password": NEW_PASSWORD
        }
    )

    if reset_response.status_code == 200:
        print("✅ Password reset successful")
    else:
        print("❌ Password reset failed!")
        print_response(reset_response)
        return

    # Step 6: Try to use OLD token (should FAIL due to session invalidation)
    print("\n6. Testing /me with OLD session after password reset (should FAIL)...")
    me_response_after = requests.get(
        f"{API_URL}/me",
        headers={"Authorization": f"Bearer {old_access_token}"}
    )

    print_response(me_response_after)

    if me_response_after.status_code == 401:
        detail = me_response_after.json().get("detail", "")
        if "password was changed" in detail.lower():
            print("✅ OLD session correctly invalidated!")
            print("   User must login again with new password")
        else:
            print("⚠️  Session rejected but with different reason")
    else:
        print("❌ BUG: Old session still works after password reset!")
        print("   This is a security issue - old sessions should be invalidated")
        return

    # Step 7: Try login with OLD password (should FAIL)
    print("\n7. Trying to login with OLD password (should FAIL)...")
    old_login_attempt = requests.post(
        f"{API_URL}/login",
        json={"email": EMAIL, "password": OLD_PASSWORD}
    )

    if old_login_attempt.status_code == 401:
        print("✅ Old password correctly rejected")
    else:
        print("❌ Old password still works!")
        print_response(old_login_attempt)
        return

    # Step 8: Login with NEW password (should WORK)
    print("\n8. Logging in with NEW password (should WORK)...")
    new_login_response = requests.post(
        f"{API_URL}/login",
        json={"email": EMAIL, "password": NEW_PASSWORD}
    )

    if new_login_response.status_code == 200:
        new_tokens = new_login_response.json()
        new_access_token = new_tokens["access_token"]
        print("✅ New password works!")
        print(f"New Access Token (first 50 chars): {new_access_token[:50]}...")
    else:
        print("❌ New password doesn't work!")
        print_response(new_login_response)
        return

    # Step 9: Use NEW token to access /me (should WORK)
    print("\n9. Testing /me with NEW session (should WORK)...")
    me_response_new = requests.get(
        f"{API_URL}/me",
        headers={"Authorization": f"Bearer {new_access_token}"}
    )

    if me_response_new.status_code == 200:
        print("✅ New session works!")
    else:
        print("❌ New session doesn't work!")
        print_response(me_response_new)
        return

    # Cleanup
    print("\n10. Cleaning up test user...")
    requests.delete(f"{API_URL}/admin/delete-user-by-email/{EMAIL}")
    print("✅ Test user deleted")

    print_section("✅ ALL SESSION INVALIDATION TESTS PASSED!")
    print("\nSummary:")
    print("  ✅ Old session invalidated after password reset")
    print("  ✅ Old password rejected")
    print("  ✅ New password works")
    print("  ✅ New session works")


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
