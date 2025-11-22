#!/bin/bash

# SehatGuru Auth Testing Script

API_URL="http://localhost:8000/api/auth"
EMAIL="test@example.com"
PASSWORD="correct123"

echo "================================"
echo "SehatGuru Auth Test"
echo "================================"
echo ""

# 1. Login
echo "1. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "Login Response:"
echo "$LOGIN_RESPONSE" | python -m json.tool
echo ""

# Extract tokens
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin)['refresh_token'])" 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Login failed! Check your credentials."
    exit 1
fi

echo "✅ Login successful!"
echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo "Refresh Token: ${REFRESH_TOKEN:0:50}..."
echo ""

# 2. Test /me endpoint with access token
echo "2. Testing GET /me with access token..."
ME_RESPONSE=$(curl -s -X GET "$API_URL/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Me Response:"
echo "$ME_RESPONSE" | python -m json.tool
echo ""

# 3. Test refresh endpoint with refresh token
echo "3. Testing POST /refresh with refresh token..."
REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/refresh" \
  -H "Authorization: Bearer $REFRESH_TOKEN")

echo "Refresh Response:"
echo "$REFRESH_RESPONSE" | python -m json.tool
echo ""

# Extract new tokens
NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

if [ -z "$NEW_ACCESS_TOKEN" ]; then
    echo "❌ Refresh failed!"
    exit 1
fi

echo "✅ Refresh successful!"
echo "New Access Token: ${NEW_ACCESS_TOKEN:0:50}..."
echo ""

# 4. Test logout with access token
echo "4. Testing POST /logout with access token..."
LOGOUT_RESPONSE=$(curl -s -X POST "$API_URL/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Logout Response:"
echo "$LOGOUT_RESPONSE" | python -m json.tool
echo ""

# 5. Try using logged out token
echo "5. Testing GET /me with logged-out token (should fail)..."
FAILED_ME_RESPONSE=$(curl -s -X GET "$API_URL/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response after logout:"
echo "$FAILED_ME_RESPONSE" | python -m json.tool
echo ""

echo "================================"
echo "✅ All tests completed!"
echo "================================"
