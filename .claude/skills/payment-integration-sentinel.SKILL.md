---
name: payment-integration-sentinel
description: Prevents payment integration failures by validating PayFast, Stripe, and other payment provider configurations. Use when integrating payment APIs, debugging payment failures, experiencing signature mismatches, webhook errors, currency issues, or before deploying payment functionality. Catches signature generation errors, missing required fields, currency/amount validation, webhook configuration, and production credential issues.
---

# Payment Integration Sentinel

## Overview

Prevents the 12 most common payment integration failures that cause 100% payment blockage in production. Validates signature generation, required fields, currency handling, webhook configuration, and production credentials before they reach customers.

## When To Use This Skill

**Always use BEFORE:**
- Writing any payment integration code
- Deploying payment functionality to production
- Switching from sandbox to production mode

**Use for debugging:**
- Signature mismatch errors
- Payment webhook failures
- Currency or amount validation errors
- Missing required fields errors

## Workflow Decision Tree

```
┌─────────────────────────────────────┐
│ What stage are you at?              │
└─────────────────────────────────────┘
           │
           ├─→ Planning new integration → Go to "Pre-Integration Checklist"
           │
           ├─→ Code written, not deployed → Go to "Code Review Protocol"
           │
           ├─→ Signature errors in logs → Go to "Signature Debug Process"
           │
           ├─→ About to deploy → Go to "Production Pre-Flight"
           │
           └─→ Payment failing in production → Go to "Emergency Diagnosis"
```

## Pre-Integration Checklist

Run this BEFORE writing any payment code. Prevents 80% of integration failures.

**Step 1: Read Official Specification**
- Load the provider's official docs into context (see references/payment_providers/)
- Identify: required fields, signature algorithm, parameter ordering, webhook structure

**Step 2: Identify Critical Requirements**
Ask and document answers:
1. What is the EXACT signature generation algorithm? (MD5? SHA256? Custom?)
2. What is the EXACT parameter ordering? (Alphabetical? Custom? Specific sequence?)
3. What fields are REQUIRED vs optional?
4. What are minimum/maximum amounts?
5. What currencies are supported?
6. Does it use a passphrase/salt/secret? Where does it go in the signature?

**Step 3: Run Validation Script**
```bash
python scripts/validate_payment_requirements.py --provider payfast --requirements-file requirements.json
```

This generates a checklist of all provider-specific requirements.

## Code Review Protocol

Use when payment code exists but hasn't been deployed.

**Step 1: Signature Generation Audit**

Run the signature validation script:
```bash
python scripts/validate_payfast_signature.py --code-file backend/payments/payfast.ts
```

Script checks:
- Parameter ordering matches provider spec
- Passphrase handling is correct
- URL encoding is applied properly
- Signature algorithm matches docs

**Step 2: Required Fields Check**

```bash
python scripts/check_payment_requirements.py --provider payfast --code-file backend/payments/payfast.ts
```

Validates:
- All required fields are present
- Field names match exactly (case-sensitive)
- Field formats are correct (email validation, name splitting, etc.)

**Step 3: Currency & Amount Validation**

Common gotcha: minimum amounts vary by provider and currency.

```bash
python scripts/validate_amount_currency.py --provider payfast --amount 4.55 --currency USD
```

Output will flag:
- Amount below provider minimum
- Currency not supported
- Currency mismatch (display vs charge)

## Signature Debug Process

Use when you're seeing "signature mismatch" or "invalid signature" errors.

**Step 1: Generate Test Signature**

```bash
python scripts/validate_payfast_signature.py --test-mode \
  --merchant-id "10000100" \
  --merchant-key "46f0cd694581a" \
  --amount "50.00" \
  --item-name "Test Product" \
  --passphrase "jt7NOE43FZPn"
```

This generates:
1. The parameter string (shows ordering)
2. The MD5 hash
3. A curl command to test the signature

**Step 2: Compare With Your Code**

Script outputs:
```
✓ Parameter string: amount=50.00&item_name=Test Product&merchant_id=10000100&merchant_key=46f0cd694581a
✓ MD5 hash: a1b2c3d4e5f6...
✗ Your code generates: x9y8z7w6v5u4...

MISMATCH FOUND!
Likely causes:
1. Parameter ordering differs
2. Passphrase not appended correctly
3. URL encoding issue
```

**Step 3: Test Against Live Endpoint**

```bash
python scripts/test_webhook_endpoint.py --provider payfast --endpoint https://yourapp.com/webhooks/payfast
```

Sends test payloads and validates responses.

## Production Pre-Flight

**MANDATORY** before enabling payments in production.

**Step 1: Credential Verification**

```bash
python scripts/verify_production_credentials.py --provider payfast
```

Checks:
- Production merchant ID is set (not sandbox)
- Production merchant key is set
- Passphrase matches production value
- Webhook URLs use HTTPS
- Webhook URLs are publicly accessible

**Step 2: End-to-End Smoke Test**

```bash
python scripts/run_payment_smoke_test.py --provider payfast --mode production-test
```

This script:
1. Creates a test subscription with minimum amount
2. Generates payment link
3. Validates signature
4. Tests webhook endpoint
5. Verifies database records

**Step 3: Currency Display Validation**

Common gotcha: Display USD, charge ZAR.

Checklist:
- [ ] Frontend displays correct currency to user
- [ ] Backend sends correct currency to payment provider
- [ ] Currency conversion (if applicable) is documented
- [ ] Amount meets provider minimum in charge currency

## Emergency Diagnosis

Use when payments are failing in production RIGHT NOW.

**Quick Diagnostic Script:**

```bash
python scripts/diagnose_payment_failure.py --provider payfast --error-log error.txt
```

Script analyzes error logs for:
1. Signature mismatches → Go to "Signature Debug Process"
2. Missing fields → Check references/common_payment_errors.md
3. Amount errors → Check currency/minimum amount
4. Webhook failures → Check CORS and network access

**Common Emergency Fixes:**

**Issue: "Signature mismatch"**
- Check: Passphrase in .env matches production
- Check: Parameter ordering in code
- Script: `validate_payfast_signature.py --emergency-mode`

**Issue: "Amount below minimum"**
- Check: Currency being sent (USD vs ZAR)
- Fix: See references/currency_handling.md

**Issue: "Webhook not received"**
- Check: CORS configuration allows provider IPs
- Check: Webhook endpoint is publicly accessible
- Script: `test_webhook_endpoint.py --debug`


## Resources

### Scripts
- `validate_payfast_signature.py` - Signature generation validator and debugger
- `check_payment_requirements.py` - Required fields and format validator
- `validate_amount_currency.py` - Currency and amount validator
- `verify_production_credentials.py` - Production credential checker
- `test_webhook_endpoint.py` - Webhook endpoint tester
- `run_payment_smoke_test.py` - End-to-end payment flow tester
- `diagnose_payment_failure.py` - Emergency diagnostic tool

### References
- `payfast_spec.md` - Complete PayFast API specification
- `common_payment_errors.md` - The 12 critical errors and how to prevent them
- `currency_handling.md` - Multi-currency best practices
- `payment_provider_checklist.md` - Generic checklist for any payment provider

### Assets
- `test_payloads/` - Example webhook payloads for testing
