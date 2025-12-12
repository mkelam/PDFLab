# 🔍 How to Find PayFast Passphrase Setting

## Step-by-Step Instructions

### 1. Login to PayFast
- **URL**: https://www.payfast.co.za
- **Email**: [your PayFast account email]
- **Password**: [your PayFast password]

### 2. Navigate to Settings
Click on **"Settings"** in the top right menu

### 3. Go to Integration Settings
Click on **"Integration"** in the left sidebar menu

### 4. Look for Passphrase Section

You should see multiple tabs or sections:
- **General**
- **Security**
- **Advanced**

### 5. Check Each Location

**Location A: Security Tab**
- Click **"Security"** tab
- Look for field labeled: **"Passphrase"** or **"Security Passphrase"**
- This field might be blank or have a value

**Location B: Integration Settings**
- Under Integration, look for **"Payment Notification"** section
- Check for **"Passphrase"** field

**Location C: Advanced Settings**
- Some PayFast accounts have passphrase under **"Advanced"**

### 6. What to Look For

The passphrase field will look like:
```
┌─────────────────────────────────────────┐
│ Passphrase                              │
│ ┌─────────────────────────────────────┐ │
│ │ [value here or blank]               │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 7. Possible Scenarios

**Scenario A: Field is completely BLANK**
→ Passphrase is not set
→ Leave PAYFAST_PASSPHRASE= (empty) in .env
→ Something else is causing the signature mismatch

**Scenario B: Field has a VALUE**
→ Copy that EXACT value (case-sensitive)
→ We'll set PAYFAST_PASSPHRASE=that_value in .env

**Scenario C: Field is DISABLED or HIDDEN**
→ Your account type might not support passphrase
→ Passphrase should remain empty

---

## Alternative: Check via PayFast Support

If you can't find the passphrase setting:

### Contact PayFast Support
- **Email**: support@payfast.co.za
- **Phone**: +27 21 447 7952
- **Hours**: Mon-Fri 08:00-17:00 SAST

**Ask them:**
> "I'm getting 'Generated signature does not match' error.
> My merchant ID is 25263515.
> Do I have a passphrase configured on my account?
> If yes, what is it?
> If no, why would signatures not match?"

---

## Screenshots to Take

Please take screenshots of:

1. **Settings → Integration** page (full page)
2. **Security** section (if exists)
3. **Any field mentioning "passphrase"**

This will help me identify the exact issue.

---

## Common PayFast Dashboard Layouts

### Layout 1: Old Dashboard
```
Settings
├── My Account
├── Integration
│   ├── General
│   ├── Payment Methods
│   └── Security ← Check here for "Passphrase"
└── Billing
```

### Layout 2: New Dashboard
```
Settings
├── Profile
├── Security ← Check here
│   ├── Authentication ID: 26fb70800bd5f72c65f7561e30a4b8c0
│   └── Passphrase: [???]
└── Integrations
    └── API Settings ← Also check here
```

### Layout 3: Merchant Dashboard
```
Dashboard
└── Settings (gear icon)
    └── Integration Settings
        ├── Merchant Details
        ├── Return URLs
        ├── ITN (Instant Transaction Notification)
        └── Security
            └── Passphrase ← Check here
```

---

## What We're Looking For

**The passphrase setting for SIGNATURE GENERATION**, not:
- ❌ Authentication ID (that's for API)
- ❌ API Key (that's for API)
- ❌ Merchant Key (that's <PAYFAST_MERCHANT_KEY>)
- ✅ **Passphrase** or **Security Passphrase** (for MD5 signatures)

---

## If You Still Can't Find It

Try this:

1. Go to: https://www.payfast.co.za/integration/security
2. Or search PayFast documentation for "passphrase"
3. Or contact PayFast support directly

The passphrase is OPTIONAL for PayFast, but if it's set in the dashboard, it MUST be in the .env file.

---

**Next Steps:**
1. Check your PayFast dashboard thoroughly
2. Take screenshots if unsure
3. Tell me what you find in the Passphrase field
