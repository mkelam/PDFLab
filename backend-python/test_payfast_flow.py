"""
Test script for PayFast payment flow.

Tests the complete payment flow:
1. Create test user and login
2. Initialize payment for a plan
3. Simulate PayFast ITN webhook
4. Verify subscription activation

Usage:
    poetry run python test_payfast_flow.py
"""

import requests
import json
import hashlib
from urllib.parse import urlencode
import time
import os

# Configuration
API_URL = "http://localhost:3007"
PAYFAST_MERCHANT_ID = "25263515"
PAYFAST_MERCHANT_KEY = os.environ.get("PAYFAST_MERCHANT_KEY", "")
PAYFAST_PASSPHRASE = ""  # Empty as per settings

# Test user credentials
TEST_EMAIL = f"payfast_test_{int(time.time())}@example.com"
TEST_PASSWORD = "TestPass123!"
TEST_NAME = "PayFast Test User"


def print_section(title):
    """Print a formatted section header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def generate_signature(data, passphrase=""):
    """Generate MD5 signature for PayFast."""
    # Create parameter string
    param_string = urlencode(sorted(data.items()))

    # Add passphrase if provided
    if passphrase:
        param_string += f"&passphrase={passphrase}"

    # Generate MD5 hash
    return hashlib.md5(param_string.encode()).hexdigest()


def test_user_registration():
    """Step 1: Register a new test user."""
    print_section("STEP 1: User Registration")

    response = requests.post(
        f"{API_URL}/api/auth/register",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        }
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 201:
        print("[OK] User registered successfully")
        return response.json()
    else:
        print("[FAIL] Registration failed")
        raise Exception(f"Registration failed: {response.text}")


def manually_verify_user(email):
    """Manually verify user email in database (for testing)."""
    print_section("STEP 1.5: Manual Email Verification")

    import asyncio
    from sqlalchemy import select, update
    import sys
    sys.path.insert(0, ".")

    async def verify():
        from app.database import AsyncSessionLocal
        from app.models import User

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).where(User.email == email)
            )
            user = result.scalars().first()

            if user:
                user.email_verified = True
                user.verification_token = None
                user.verification_token_expires = None
                await session.commit()
                print(f"[OK] User {email} verified in database")
                return True
            else:
                print(f"[FAIL] User {email} not found")
                return False

    return asyncio.run(verify())


def test_user_login():
    """Step 2: Login with test user."""
    print_section("STEP 2: User Login")

    response = requests.post(
        f"{API_URL}/api/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
    )

    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"[OK] Login successful")
        print(f"Access Token: {data['access_token'][:50]}...")
        print(f"Refresh Token: {data['refresh_token'][:50]}...")
        return data['access_token']
    else:
        print(f"[FAIL] Login failed")
        print(f"Response: {response.text}")
        raise Exception(f"Login failed: {response.text}")


def test_get_plans(auth_token):
    """Step 3: Get available payment plans."""
    print_section("STEP 3: Get Available Plans")

    response = requests.get(
        f"{API_URL}/api/payfast/plans",
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    print(f"Status: {response.status_code}")
    print(f"Available Plans:")

    if response.status_code == 200:
        data = response.json()
        plans = data.get('plans', [])
        for plan in plans:
            conversions = "Unlimited" if plan['conversions_limit'] == -1 else plan['conversions_limit']
            print(f"  - {plan['name']}: ${plan['price']}/month ({conversions} conversions)")
        print(f"[OK] Plans retrieved successfully")
        return plans
    else:
        print(f"[FAIL] Failed to get plans")
        print(f"Response: {response.text}")
        return []


def test_initialize_payment(auth_token, plan="starter"):
    """Step 4: Initialize PayFast payment."""
    print_section("STEP 4: Initialize Payment")

    print(f"Initializing payment for plan: {plan}")

    response = requests.post(
        f"{API_URL}/api/payfast/initialize",
        json={"plan": plan},
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"[OK] Payment initialized successfully")
        print(f"\nPayment URL: {data.get('payment_url', 'N/A')}")
        print(f"\nPayment Data:")
        print(json.dumps(data.get('payment_data', {}), indent=2))
        return data
    else:
        print(f"[FAIL] Payment initialization failed")
        print(f"Response: {response.text}")
        raise Exception(f"Payment initialization failed: {response.text}")


def test_payfast_webhook(payment_data):
    """Step 5: Simulate PayFast ITN webhook (successful payment)."""
    print_section("STEP 5: Simulate PayFast ITN Webhook")

    # Create ITN notification data (simulating PayFast)
    itn_data = {
        "m_payment_id": payment_data.get("payment_data", {}).get("m_payment_id", "test-payment-123"),
        "pf_payment_id": "1234567",
        "payment_status": "COMPLETE",
        "item_name": payment_data.get("payment_data", {}).get("item_name", "Starter Plan"),
        "item_description": payment_data.get("payment_data", {}).get("item_description", "Monthly subscription"),
        "amount_gross": payment_data.get("payment_data", {}).get("amount", "9.99"),
        "amount_fee": "0.50",
        "amount_net": "9.49",
        "custom_str1": payment_data.get("payment_data", {}).get("custom_str1", ""),  # user_id
        "custom_str2": payment_data.get("payment_data", {}).get("custom_str2", "starter"),  # plan
        "name_first": TEST_NAME.split()[0],
        "name_last": TEST_NAME.split()[-1],
        "email_address": TEST_EMAIL,
        "merchant_id": PAYFAST_MERCHANT_ID,
        "token": "test-token-" + str(int(time.time())),
        "billing_date": "2025-11-30",
    }

    # Generate signature
    itn_data["signature"] = generate_signature(itn_data, PAYFAST_PASSPHRASE)

    print("Sending ITN data:")
    print(json.dumps(itn_data, indent=2))

    # Send webhook
    response = requests.post(
        f"{API_URL}/api/payfast/webhook",
        data=itn_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )

    print(f"\nStatus: {response.status_code}")
    print(f"Response: {response.text}")

    if response.status_code == 200:
        print("[OK] Webhook processed successfully")
        return True
    else:
        print("[FAIL] Webhook processing failed")
        return False


def test_verify_subscription(auth_token):
    """Step 6: Verify subscription was activated."""
    print_section("STEP 6: Verify Subscription Activation")

    response = requests.get(
        f"{API_URL}/api/auth/profile",
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        profile = response.json()
        print(f"\nUser Profile:")
        print(f"  Email: {profile.get('email')}")
        print(f"  Plan: {profile.get('plan')}")
        print(f"  Subscription Status: {profile.get('subscription_status')}")
        print(f"  Conversions Used: {profile.get('conversions_used')}")
        print(f"  Conversions Limit: {profile.get('conversions_limit')}")

        if profile.get('plan') == 'starter' and profile.get('subscription_status') == 'active':
            print("\n[OK] Subscription activated successfully!")
            return True
        else:
            print("\n[FAIL] Subscription not activated (plan or status mismatch)")
            return False
    else:
        print(f"[FAIL] Failed to get user profile")
        print(f"Response: {response.text}")
        return False


def main():
    """Run complete PayFast payment flow test."""
    print("\n" + "="*60)
    print("  PAYFAST PAYMENT FLOW TEST")
    print("="*60)
    print(f"\nTest User: {TEST_EMAIL}")
    print(f"API URL: {API_URL}")
    print(f"Merchant ID: {PAYFAST_MERCHANT_ID}")

    try:
        # Step 1: Register user
        user_data = test_user_registration()

        # Step 1.5: Manually verify email (bypass email verification for testing)
        manually_verify_user(TEST_EMAIL)

        # Step 2: Login
        auth_token = test_user_login()

        # Step 3: Get available plans
        plans = test_get_plans(auth_token)

        # Step 4: Initialize payment for starter plan
        payment_data = test_initialize_payment(auth_token, plan="starter")

        # Step 5: Simulate successful payment webhook
        webhook_success = test_payfast_webhook(payment_data)

        # Small delay to let webhook process
        time.sleep(2)

        # Step 6: Verify subscription activation
        subscription_active = test_verify_subscription(auth_token)

        # Final summary
        print_section("TEST SUMMARY")

        if subscription_active:
            print("[OK] ALL TESTS PASSED!")
            print("\nPayFast payment flow is working correctly:")
            print("  1. [OK] User registration")
            print("  2. [OK] User login")
            print("  3. [OK] Payment initialization")
            print("  4. [OK] ITN webhook processing")
            print("  5. [OK] Subscription activation")
            return 0
        else:
            print("[FAIL] SOME TESTS FAILED")
            print("\nPlease check the output above for details.")
            return 1

    except Exception as e:
        print_section("TEST FAILED")
        print(f"[FAIL] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
