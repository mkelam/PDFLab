#!/bin/bash
#############################################################################
# Seed Staging Database via API
# Creates test users by calling the registration API directly
#############################################################################

API_URL="http://141.136.44.168:3007"

echo "🌱 Seeding staging database via API..."
echo "API URL: $API_URL"
echo ""

# Function to register a user
register_user() {
  local email=$1
  local name=$2
  echo "Creating user: $email"

  response=$(curl -s -X POST "$API_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"TestPass123!\",\"name\":\"$name\"}")

  if echo "$response" | grep -q '"token"'; then
    echo "   ✓ $email created successfully"
    return 0
  else
    echo "   ⚠ $email may already exist or registration failed"
    echo "      Response: $(echo $response | head -c 100)"
    return 1
  fi
}

echo "📝 Creating test users..."
echo ""

# Create test users
register_user "testuser-seed@pdflab.com" "Test User Seed"
register_user "pro-user-seed@test.com" "Pro User Seed"
register_user "enterprise-user-seed@test.com" "Enterprise User Seed"
register_user "beta-user-seed@test.com" "Beta User Seed"

echo ""
echo "✅ Seeding complete!"
echo ""
echo "🔑 Test Credentials:"
echo "   Email: testuser-seed@pdflab.com"
echo "   Password: TestPass123!"
echo ""
echo "Note: Users are created with FREE plan by default."
echo "Admin must manually upgrade plans via admin panel."
