# PDFLab Partner Portal

Professional partner portal for PDFLab influencers and affiliates built with Next.js 14.

## Overview

Separate Next.js application that provides partners with:
- **Dedicated landing page** with benefits and commission tiers
- **Partner dashboard** (`/[slug]`) with earnings calculator, tier progress, and analytics
- **Professional navigation** with glassmorphic dark theme
- **Real-time metrics** via shared backend API

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + OKLCH color space
- **UI Components**: Radix UI (shadcn/ui)
- **Theme**: Glassmorphic dark with circuit board background
- **Backend**: Shared Express.js API (port 3006)

## Project Structure

```
partners-portal/
├── app/
│   ├── layout.tsx           # Root layout with navigation
│   ├── page.tsx             # Landing page with benefits/tiers
│   ├── [slug]/page.tsx      # Partner dashboard (1002 lines)
│   ├── not-found.tsx        # Custom 404 page
│   └── globals.css          # Global styles (glassmorphism)
├── components/
│   ├── PartnerNav.tsx       # Navigation component
│   └── ui/                  # Radix UI components
├── lib/
│   └── utils.ts             # Utility functions
├── public/
│   └── images/
│       └── circuit-board-bg.png  # Background image
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Development

### Prerequisites
- Node.js 20 LTS
- npm 10.9.2
- Backend API running on port 3006

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

Server starts on **http://localhost:3001**

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

## Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3006
```

For production:
```env
NEXT_PUBLIC_API_URL=https://pdflab.pro
```

## URLs

### Local Development
- **Landing Page**: http://localhost:3001
- **Partner Dashboard**: http://localhost:3001/[slug]
- **Backend API**: http://localhost:3006

### Production
- **Landing Page**: https://partners.pdflab.pro
- **Partner Dashboard**: https://partners.pdflab.pro/[slug]
- **Backend API**: Internal (port 3006)

## Features

### Landing Page (`/`)
- Hero section with value proposition
- 6 benefit cards (commissions, analytics, dashboard, tiers, calculator, payouts)
- Commission tier breakdown (Bronze/Silver/Gold/Platinum)
- CTA section for becoming a partner

### Partner Dashboard (`/[slug]`)
- **Key Metrics**: Signups, conversions, revenue, earnings
- **Earning Calculator**: Interactive slider + editable follower count (TOP OF PAGE)
- **Tier Progress**: Visual progress bar to next tier
- **Referral Tools**: Link + promo codes with copy functionality
- **Referrals Table**: Filterable list with pagination
- **Commission Tracking**: Pending/paid breakdown

### Navigation
- Responsive mobile menu
- Links to home, main site, pricing
- Glassmorphic sticky header

### 404 Page
- Custom error page matching theme
- Links back to home and support

## Styling

### Theme
- **Dark background**: oklch(0.05 0 0)
- **Light text**: oklch(0.95 0 0)
- **Primary (Teal)**: oklch(0.6 0.1 180)
- **Circuit board background**: /images/circuit-board-bg.png

### Glass Effects
- `.glass-strong`: 50% black with 15% white borders
- `.glass-subtle`: Lighter transparency
- `.glass-nav`: Sticky navigation with backdrop blur

## Deployment

### Deploy to VPS (Production)

1. **Build locally**:
   ```bash
   npm run build
   ```

2. **Upload to VPS**:
   ```bash
   scp -r . root@141.136.44.168:/root/pdflab/partners-portal/
   ```

3. **Install dependencies on VPS**:
   ```bash
   ssh root@141.136.44.168
   cd /root/pdflab/partners-portal
   npm install --production
   ```

4. **Start with PM2**:
   ```bash
   PORT=3001 pm2 start npm --name "partners-portal" -- start
   pm2 save
   ```

5. **Verify**:
   ```bash
   pm2 list
   curl -I https://partners.pdflab.pro
   ```

### Automated Deployment

Use the deployment script from parent directory:
```bash
cd ..
./deploy-partner-portal.sh
```

## Infrastructure

### DNS
- **Subdomain**: partners.pdflab.pro
- **A Record**: Points to 141.136.44.168

### Nginx
- **Config**: `/etc/nginx/sites-available/partners.pdflab.pro`
- **Routes**: HTTPS traffic to localhost:3001
- **SSL**: Let's Encrypt (auto-renewing)

### Backend CORS
Backend allows:
- `http://localhost:3001` (local dev)
- `https://partners.pdflab.pro` (production)

## Port Configuration

| Service | Port | URL |
|---------|------|-----|
| Partner Portal | 3001 | https://partners.pdflab.pro |
| Main App | 3000 | https://pdflab.pro |
| Backend API | 3006 | Internal only |

## Troubleshooting

### Page not loading
- Check PM2 status: `pm2 list`
- Check port 3001: `netstat -tlnp | grep 3001`
- View logs: `pm2 logs partners-portal`

### Styling not applied
- Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
- Check background image exists: `ls public/images/circuit-board-bg.png`
- Rebuild: `npm run build && npm start`

### API not connecting
- Verify backend running: `curl http://localhost:3006/health`
- Check CORS in backend: `backend/src/server.ts`
- Check `.env.local` has correct API URL

### Hot reload not working
- Check only one dev server running: `ps aux | grep "next dev"`
- Kill duplicate processes: `pkill -f "next dev"`
- Restart: `npm run dev`

## Documentation

See parent directory for:
- `PARTNER_PORTAL_COMPLETE.md` - Full implementation guide
- `PARTNER_PORTAL_SUMMARY.md` - Quick overview
- `deploy-partner-portal.sh` - Deployment script
- `PARTNER_SUBDOMAIN_SETUP.md` - Infrastructure setup

## License

Proprietary - PDFLab

## Support

For issues or questions:
- Technical: Check documentation in parent directory
- Partner inquiries: https://pdflab.pro/contact
- Dashboard access: Use your unique partner link

---

**Version**: 1.0.0
**Last Updated**: 2025-11-14
**Status**: Production Ready
