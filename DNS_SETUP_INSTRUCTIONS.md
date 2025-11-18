# DNS Setup Instructions for staging.pdflab.pro

**Goal**: Point staging.pdflab.pro to your VPS (141.136.44.168)
**Time Required**: 5 minutes (+ 5-30 min DNS propagation)

---

## Step-by-Step Instructions

### 1. Log into Hostinger

1. Go to https://www.hostinger.com
2. Click "Login" (top right)
3. Enter your credentials
4. Navigate to your dashboard

### 2. Access DNS Zone Editor

1. In the dashboard, find your domain: **pdflab.pro**
2. Click on it to manage
3. Look for **DNS / Name Servers** or **DNS Zone Editor**
4. Click to open DNS management

### 3. Add A Record

You should see a list of existing DNS records. You'll add a new one:

**Click "Add New Record" or "Add DNS Record"**

Fill in these exact values:

| Field | Value | Notes |
|-------|-------|-------|
| **Type** | `A` | Select from dropdown |
| **Name/Host** | `staging` | Just the subdomain part |
| **Points To / Value** | `141.136.44.168` | Your VPS IP address |
| **TTL** | `14400` or default | 4 hours (can leave default) |

**Visual Example**:
```
Type: A Record
Name: staging
Points to: 141.136.44.168
TTL: 14400 (or Auto/Default)
```

### 4. Save Changes

1. Click **"Add Record"** or **"Save"**
2. You should see the new record in your DNS list:
   ```
   staging.pdflab.pro    A    141.136.44.168    14400
   ```

### 5. Wait for DNS Propagation

DNS changes can take 5-30 minutes to propagate globally.

**Check propagation**:
```bash
# On Windows (Command Prompt):
nslookup staging.pdflab.pro

# Expected result after propagation:
Name:    staging.pdflab.pro
Address: 141.136.44.168
```

**Alternative online check**:
- Visit: https://www.whatsmydns.net/#A/staging.pdflab.pro
- Should show 141.136.44.168 from multiple locations

---

## Troubleshooting

### Issue: "Record already exists"
- Check if `staging` A record already exists
- If yes, edit it to point to 141.136.44.168
- Delete any conflicting CNAME records for `staging`

### Issue: "Invalid IP address"
- Double-check: `141.136.44.168` (no typos)
- Don't include `http://` or any prefix
- Just the IP numbers separated by dots

### Issue: DNS not propagating
- Wait longer (can take up to 48 hours, usually 5-30 minutes)
- Clear your local DNS cache:
  ```bash
  # Windows:
  ipconfig /flushdns
  ```

---

## After DNS is Live

Once `nslookup staging.pdflab.pro` returns `141.136.44.168`, come back and I'll:

1. ✅ Install Let's Encrypt SSL certificate (automated)
2. ✅ Update frontend/partners to use HTTPS URLs
3. ✅ Test the full HTTPS staging environment
4. ✅ Achieve 100% production parity!

---

## Quick Reference

**What we're creating**:
```
staging.pdflab.pro → 141.136.44.168 → VPS → Nginx → Docker containers
```

**DNS Record Summary**:
- **Type**: A
- **Host**: staging
- **Value**: 141.136.44.168
- **TTL**: 14400 (or default)

**Verification Command**:
```bash
nslookup staging.pdflab.pro
# Should return: 141.136.44.168
```

---

**Next Steps**:
1. Add the DNS record (above instructions)
2. Verify DNS propagation (nslookup)
3. Let me know when DNS is live
4. I'll complete the SSL setup (automated)

---

**Questions?**
- Hostinger Support: https://www.hostinger.com/contact
- DNS Propagation Checker: https://www.whatsmydns.net/
- Contact me if you get stuck at any step
