"""
End-to-End Testing Script for PDFLab Python Backend

Tests all major API endpoints and functionality.
"""
import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3008"
TEST_EMAIL = f"e2etest_{int(time.time())}@pdflab.com"
TEST_PASSWORD = "TestPass123"
TEST_NAME = "E2E Test User"

# Test results
results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(name, passed, message="", response=None):
    """Log test result"""
    results["total"] += 1
    if passed:
        results["passed"] += 1
        status = "[PASS]"
    else:
        results["failed"] += 1
        status = "[FAIL]"

    result = {
        "name": name,
        "status": status,
        "message": message,
        "response_status": response.status_code if response else None
    }
    results["tests"].append(result)
    print(f"{status}: {name}")
    if message:
        print(f"   {message}")
    if response and not passed:
        print(f"   Response: {response.text[:200]}")

# Store tokens and IDs for subsequent tests
tokens = {}
user_data = {}

print("="*80)
print("PDFLab Python Backend - End-to-End Testing")
print("="*80)
print(f"Base URL: {BASE_URL}")
print(f"Test Email: {TEST_EMAIL}")
print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("="*80)
print()

# ============================================================================
# TEST 1: Root Endpoint
# ============================================================================
print("TEST GROUP 1: Health & Information Endpoints")
print("-" * 80)

try:
    response = requests.get(f"{BASE_URL}/")
    data = response.json()
    log_test(
        "GET / - Root endpoint",
        response.status_code == 200 and "name" in data,
        f"Version: {data.get('version', 'unknown')}",
        response
    )
except Exception as e:
    log_test("GET / - Root endpoint", False, str(e))

# ============================================================================
# TEST 2: Health Endpoint
# ============================================================================
try:
    response = requests.get(f"{BASE_URL}/health")
    data = response.json()
    log_test(
        "GET /health - Health check",
        response.status_code == 200 and data.get("status") == "OK",
        f"Status: {data.get('status')}",
        response
    )
except Exception as e:
    log_test("GET /health - Health check", False, str(e))

print()

# ============================================================================
# TEST GROUP 2: Authentication
# ============================================================================
print("TEST GROUP 2: Authentication Endpoints")
print("-" * 80)

# TEST 3: User Registration
try:
    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": TEST_NAME
    }
    response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
    data = response.json()

    if response.status_code == 201:
        user_data = data
        log_test(
            "POST /api/auth/register - User registration",
            True,
            f"User ID: {data.get('id', 'N/A')}",
            response
        )
    else:
        log_test(
            "POST /api/auth/register - User registration",
            False,
            data.get("detail", "Unknown error"),
            response
        )
except Exception as e:
    log_test("POST /api/auth/register - User registration", False, str(e))

# TEST 4: User Login
try:
    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
    data = response.json()

    if response.status_code == 200 and "access_token" in data:
        tokens["access"] = data["access_token"]
        tokens["refresh"] = data["refresh_token"]
        log_test(
            "POST /api/auth/login - User login",
            True,
            f"Token type: {data.get('token_type')}, Expires in: {data.get('expires_in')}s",
            response
        )
    else:
        log_test(
            "POST /api/auth/login - User login",
            False,
            data.get("detail", "Unknown error"),
            response
        )
except Exception as e:
    log_test("POST /api/auth/login - User login", False, str(e))

# TEST 5: Get User Profile
if "access" in tokens:
    try:
        headers = {"Authorization": f"Bearer {tokens['access']}"}
        response = requests.get(f"{BASE_URL}/api/auth/profile", headers=headers)
        data = response.json()

        log_test(
            "GET /api/auth/profile - Get profile (authenticated)",
            response.status_code == 200 and data.get("email") == TEST_EMAIL,
            f"Plan: {data.get('plan')}, Quota: {data.get('conversions_used')}/{data.get('conversions_limit')}",
            response
        )
    except Exception as e:
        log_test("GET /api/auth/profile - Get profile", False, str(e))
else:
    log_test("GET /api/auth/profile - Get profile", False, "No access token available")

# TEST 6: Get Profile Without Auth (should fail)
try:
    response = requests.get(f"{BASE_URL}/api/auth/profile")
    log_test(
        "GET /api/auth/profile - Unauthorized access (should fail)",
        response.status_code == 403,
        "Correctly rejected unauthorized request",
        response
    )
except Exception as e:
    log_test("GET /api/auth/profile - Unauthorized access", False, str(e))

print()

# ============================================================================
# TEST GROUP 3: PayFast Payment
# ============================================================================
print("TEST GROUP 3: PayFast Payment Endpoints")
print("-" * 80)

# TEST 7: Get Pricing Plans
try:
    response = requests.get(f"{BASE_URL}/api/payfast/plans")
    data = response.json()

    log_test(
        "GET /api/payfast/plans - Get pricing plans (public)",
        response.status_code == 200 and "plans" in data,
        f"Plans available: {len(data.get('plans', []))}",
        response
    )
except Exception as e:
    log_test("GET /api/payfast/plans - Get pricing plans", False, str(e))

# TEST 8: Initialize Payment (requires auth)
if "access" in tokens:
    try:
        headers = {"Authorization": f"Bearer {tokens['access']}"}
        payload = {
            "plan": "starter",
            "subscription": True
        }
        response = requests.post(f"{BASE_URL}/api/payfast/initialize", json=payload, headers=headers)
        data = response.json()

        log_test(
            "POST /api/payfast/initialize - Initialize payment (authenticated)",
            response.status_code == 200 and "payment_url" in data,
            f"Transaction ID: {data.get('transaction_id', 'N/A')}",
            response
        )
    except Exception as e:
        log_test("POST /api/payfast/initialize - Initialize payment", False, str(e))
else:
    log_test("POST /api/payfast/initialize - Initialize payment", False, "No access token available")

# TEST 9: Initialize Payment Without Auth (should fail)
try:
    payload = {
        "plan": "pro",
        "subscription": True
    }
    response = requests.post(f"{BASE_URL}/api/payfast/initialize", json=payload)
    log_test(
        "POST /api/payfast/initialize - Unauthorized (should fail)",
        response.status_code == 403,
        "Correctly rejected unauthorized request",
        response
    )
except Exception as e:
    log_test("POST /api/payfast/initialize - Unauthorized", False, str(e))

print()

# ============================================================================
# TEST GROUP 4: Error Handling
# ============================================================================
print("TEST GROUP 4: Error Handling & Edge Cases")
print("-" * 80)

# TEST 10: Duplicate Registration (should fail)
try:
    payload = {
        "email": TEST_EMAIL,  # Same email
        "password": TEST_PASSWORD,
        "name": "Duplicate User"
    }
    response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
    log_test(
        "POST /api/auth/register - Duplicate email (should fail)",
        response.status_code == 400,
        "Correctly rejected duplicate email",
        response
    )
except Exception as e:
    log_test("POST /api/auth/register - Duplicate email", False, str(e))

# TEST 11: Invalid Login Credentials
try:
    payload = {
        "email": TEST_EMAIL,
        "password": "WrongPassword123"
    }
    response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
    log_test(
        "POST /api/auth/login - Invalid password (should fail)",
        response.status_code == 401,
        "Correctly rejected invalid credentials",
        response
    )
except Exception as e:
    log_test("POST /api/auth/login - Invalid password", False, str(e))

# TEST 12: Invalid Payment Plan
if "access" in tokens:
    try:
        headers = {"Authorization": f"Bearer {tokens['access']}"}
        payload = {
            "plan": "invalid_plan",
            "subscription": True
        }
        response = requests.post(f"{BASE_URL}/api/payfast/initialize", json=payload, headers=headers)
        log_test(
            "POST /api/payfast/initialize - Invalid plan (should fail)",
            response.status_code == 400,
            "Correctly rejected invalid plan",
            response
        )
    except Exception as e:
        log_test("POST /api/payfast/initialize - Invalid plan", False, str(e))

# TEST 13: Weak Password
try:
    payload = {
        "email": f"weak_{int(time.time())}@test.com",
        "password": "weak",  # Too short
        "name": "Weak Password Test"
    }
    response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
    log_test(
        "POST /api/auth/register - Weak password (should fail)",
        response.status_code == 422,
        "Correctly rejected weak password",
        response
    )
except Exception as e:
    log_test("POST /api/auth/register - Weak password", False, str(e))

print()

# ============================================================================
# TEST SUMMARY
# ============================================================================
print("="*80)
print("TEST SUMMARY")
print("="*80)
print(f"Total Tests: {results['total']}")
print(f"Passed: {results['passed']}")
print(f"Failed: {results['failed']}")
print(f"Success Rate: {(results['passed']/results['total']*100):.1f}%" if results['total'] > 0 else "N/A")
print("="*80)

if results['failed'] > 0:
    print("\nFailed Tests:")
    for test in results['tests']:
        if "[FAIL]" in test['status']:
            print(f"  - {test['name']}")
            if test['message']:
                print(f"    {test['message']}")

print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("="*80)

# Exit with appropriate code
exit(0 if results['failed'] == 0 else 1)
