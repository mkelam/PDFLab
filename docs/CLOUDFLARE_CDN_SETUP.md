# Cloudflare CDN Setup - PDFLab Phase 2

## Overview

Configure Cloudflare as a Content Delivery Network (CDN) to cache static assets, reduce server load, and improve global performance.

## Benefits

- **Faster Load Times**: Assets served from edge locations near users
- **Reduced Server Load**: Static files cached at CDN, not VPS
- **DDoS Protection**: Cloudflare's network blocks malicious traffic
- **Free SSL**: Automatic HTTPS with free certificate
- **Global Performance**: 200+ data centers worldwide
- **Cost Savings**: Reduced bandwidth usage on VPS

## Setup Steps

### 1. Add Domain to Cloudflare

1. Go to https://dash.cloudflare.com
2. Click **"Add a Site"**
3. Enter: `pdflab.pro`
4. Select **Free Plan** ($0/month)
5. Click **"Add Site"**

### 2. Update Name Servers

Cloudflare will provide 2 nameservers like:
```
anaya.ns.cloudflare.com
boyd.ns.cloudflare.com
```

Update at your domain registrar (where you bought pdflab.pro):
1. Log into domain registrar
2. Find DNS/Nameserver settings
3. Replace existing nameservers with Cloudflare's
4. Save changes

**Propagation time**: 2-24 hours (usually < 2 hours)

### 3. DNS Records

Add these DNS records in Cloudflare dashboard:

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | @ | 141.136.44.168 | Proxied (orange cloud) | Auto |
| A | www | 141.136.44.168 | Proxied (orange cloud) | Auto |
| CNAME | api | pdflab.pro | Proxied (orange cloud) | Auto |

**Important**: "Proxied" (orange cloud) enables CDN caching. "DNS only" (gray cloud) bypasses Cloudflare.

### 4. SSL/TLS Configuration

**Navigate to**: SSL/TLS tab

**Settings**:
- **Encryption mode**: Full (strict)
  - Requires valid SSL on origin server (VPS)
  - Most secure option

- **Always Use HTTPS**: ON
  - Redirects http:// → https://

- **Automatic HTTPS Rewrites**: ON
  - Fixes mixed content warnings

- **Minimum TLS Version**: 1.2
  - Modern browsers only

**Edge Certificates**:
- Universal SSL: Enabled (automatic)
- Certificate status: Active (may take 15 minutes)

### 5. Caching Rules

**Navigate to**: Rules → Page Rules

Create rules in this order (top to bottom):

#### Rule 1: API Bypass (Highest Priority)

```
URL: *pdflab.pro/api/*

Settings:
- Cache Level: Bypass
```

**Why**: API responses are dynamic and user-specific. Never cache them via CDN.

#### Rule 2: Next.js Static Assets (Long Cache)

```
URL: *pdflab.pro/_next/static/*

Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 year
- Browser Cache TTL: 1 year
```

**Why**: Next.js static assets have content hashes in filenames. Safe to cache forever.

#### Rule 3: Public Static Files

```
URL: *pdflab.pro/static/*

Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 week
```

#### Rule 4: Static File Extensions

```
URL: *pdflab.pro/*.(jpg|jpeg|png|gif|ico|svg|webp|css|js|woff|woff2|ttf|eot)

Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 week
```

**Free plan limit**: 3 page rules (use Rules Engine for more complex setups)

### 6. Performance Settings

**Navigate to**: Speed → Optimization

**Auto Minify** (reduce file size):
- [x] JavaScript
- [x] CSS
- [x] HTML

**Brotli**: ON (better compression than gzip)

**HTTP/2 to Origin**: ON (faster backend connection)

**HTTP/3 (QUIC)**: ON (next-gen protocol)

**Rocket Loader**: OFF
- ⚠️ Can break React/Next.js apps
- Only enable if tested thoroughly

**Early Hints**: ON (improve page load)

### 7. Security Settings

**Navigate to**: Security → Settings

**Security Level**: Medium
- Low: Minimal challenge
- Medium: **Recommended** - Balance security/UX
- High: Challenge more visitors
- I'm Under Attack: All visitors challenged

**Challenge Passage**: 30 minutes
- How long a passed challenge is remembered

**Browser Integrity Check**: ON
- Blocks known bad browsers/bots

**Privacy Pass Support**: ON

**Email Address Obfuscation**: ON
- Protects emails from scrapers

### 8. Firewall Rules

**Navigate to**: Security → WAF

Create custom rule to block malicious upload attempts:

**Rule 1: Upload Endpoint Protection**
```
Field: URI Path
Operator: contains
Value: /api/upload

AND

Field: Threat Score
Operator: Greater than
Value: 10

Action: Challenge (CAPTCHA)
```

**Rule 2: Rate Limiting for Conversions**
```
Field: URI Path
Operator: equals
Value: /api/convert

AND

Field: Request Rate
Operator: Greater than
Value: 10 requests per 60 seconds

Action: Block
```

**Free plan limit**: 5 firewall rules

### 9. Speed Settings

**Navigate to**: Speed → Optimization

**Polish** (image optimization):
- Lossy: Maximum compression
- WebP: ON (serve WebP to supported browsers)
- Avif: ON (newest format, best compression)

**Mirage**: ON (lazy load images)

**Image Resizing**: Available on paid plans

### 10. Analytics & Monitoring

**Navigate to**: Analytics & Logs

**Web Analytics**:
- Real-time visitor stats
- Page views, unique visitors
- Top pages, referrers
- Geographic distribution

**Cache Analytics**:
- Cache hit rate (should be > 80%)
- Bandwidth saved
- Requests by country

## Verification

### Test DNS Propagation

```bash
# Check DNS resolution
dig pdflab.pro
nslookup pdflab.pro

# Should show Cloudflare IPs (not your VPS IP)
```

### Test CDN Caching

```bash
# Test static asset
curl -I https://pdflab.pro/_next/static/chunks/main.js

# Look for these headers:
# cf-cache-status: HIT (cached) or MISS (not cached yet)
# cf-ray: [ID] (proves Cloudflare is serving)
# server: cloudflare
```

### Test SSL

```bash
# Check HTTPS
curl -I https://pdflab.pro

# Should return: 200 OK with SSL headers

# Check redirect
curl -I http://pdflab.pro

# Should return: 301/302 redirect to https://
```

### Test Performance

Use tools:
- Google PageSpeed Insights: https://pagespeed.web.dev/
- GTmetrix: https://gtmetrix.com/
- WebPageTest: https://www.webpagetest.org/

**Expected Results**:
- First Contentful Paint (FCP): < 1.5s
- Time to Interactive (TTI): < 3.5s
- Speed Index: < 3.0s

## Monitoring

### Cache Hit Rate

**Navigate to**: Analytics & Logs → Performance

**Target**: > 80% cache hit rate

**If low (<60%)**:
- Check page rules are correct
- Verify "Cache Everything" is set
- Ensure Browser Cache TTL is reasonable

### Bandwidth Savings

**Navigate to**: Analytics & Logs → Traffic

**Metrics**:
- Total requests
- Cached requests (%)
- Bandwidth saved (GB)

**Expected savings**: 60-80% of bandwidth

### Security Events

**Navigate to**: Security → Events

Monitor:
- Blocked requests
- Challenge solve rate
- Threat types (bot, malicious user, etc.)

## Troubleshooting

### Issue: Cache Not Working

**Symptoms**: cf-cache-status: BYPASS or DYNAMIC

**Solutions**:
1. Check page rules (API bypass rule might be too broad)
2. Verify Cache Level is "Cache Everything"
3. Check response headers from origin (Cache-Control: no-cache prevents caching)
4. Purge cache: **Caching → Configuration → Purge Everything**

### Issue: Mixed Content Warnings

**Symptoms**: Browser shows "not secure" or blocks assets

**Solutions**:
1. Enable "Automatic HTTPS Rewrites"
2. Update hardcoded http:// URLs to https://
3. Use protocol-relative URLs: //example.com/asset.js

### Issue: Website Down (520 Error)

**Symptoms**: "Error 520: Web server returned an unknown error"

**Solutions**:
1. Check VPS is running: `ssh root@141.136.44.168`
2. Check nginx/backend containers: `docker ps`
3. Check VPS firewall allows Cloudflare IPs
4. Temporarily set DNS to "DNS only" (gray cloud) to bypass Cloudflare

### Issue: Slow TTFB (Time to First Byte)

**Symptoms**: Waiting time in browser DevTools is high

**Solutions**:
1. Enable Argo Smart Routing (paid feature)
2. Optimize backend response time (database queries)
3. Use Worker caching for dynamic content (paid feature)

## Advanced Configuration

### Custom Cache Keys

For more granular caching control:

**Navigate to**: Rules → Cache Rules

Create custom cache key rules based on:
- Query strings
- Headers
- Cookies
- Geographic location

### Workers (Serverless Functions)

Run code at the edge for:
- A/B testing
- Personalization
- API response transformation
- Custom authentication

**Note**: Workers require paid plan ($5/month)

### Load Balancing

Distribute traffic across multiple origin servers:

**Navigate to**: Traffic → Load Balancing

**Use case**: Multiple VPS instances, multi-region deployment

**Note**: Requires Business plan ($200/month)

## Cost Analysis

### Free Plan (Current)

**Included**:
- Unlimited bandwidth (for website)
- DDoS protection
- Universal SSL
- 3 page rules
- 5 firewall rules
- Basic analytics

**Limits**:
- No Argo Smart Routing
- No Workers (serverless)
- No Image Optimization
- No advanced caching rules

**Cost**: $0/month

### When to Upgrade

**Pro Plan ($20/month)**:
- Image optimization (Polish)
- 20 page rules
- Web Application Firewall (WAF)
- Mobile optimization

**Business Plan ($200/month)**:
- Argo Smart Routing (30% faster)
- Load balancing
- Advanced DDoS protection
- PCI compliance

**For PDFLab**: Free plan is sufficient for 10,000 users

## Next Steps

1. [ ] Add pdflab.pro to Cloudflare
2. [ ] Update nameservers at registrar
3. [ ] Wait for DNS propagation (2-24 hours)
4. [ ] Configure DNS records (A, CNAME)
5. [ ] Set SSL mode to Full (strict)
6. [ ] Create page rules (API bypass, static caching)
7. [ ] Enable performance optimizations
8. [ ] Configure firewall rules
9. [ ] Test CDN caching with curl
10. [ ] Monitor cache hit rate (target > 80%)
11. [ ] Celebrate faster site! 🎉

## References

- Cloudflare Documentation: https://developers.cloudflare.com/
- Page Rules Guide: https://developers.cloudflare.com/rules/page-rules/
- Cache Configuration: https://developers.cloudflare.com/cache/
- DNS Setup: https://developers.cloudflare.com/dns/
