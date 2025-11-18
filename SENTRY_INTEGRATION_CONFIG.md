# Sentry Internal Integration - Required Configuration

## Basic Information

**Name**: `PDFLab Elite Guardian`

**Description**:
```
Elite Health Guardian monitoring system integration. Automatically manages Sentry alerts and integrates with autonomous remediation workflows.
```

## Permissions

- **Issue & Events**: Read & Write
- **Projects**: Read
- **Organization**: Read

## Webhook Configuration

**Webhook URL**:
```
https://pdflab.pro/api/sentry/webhook
```

**Webhook Events**:
- [x] issue
- [x] error
- [x] event_alert

## Optional Fields

**Schema**: Leave empty (not needed)

**Authorized JavaScript Origins**: Leave empty (not needed for internal integration)

## After Creation

**Copy Token**: `sntrys_...` (save immediately)

**Add to backend/.env**:
```env
SENTRY_AUTH_TOKEN=sntrys_YOUR_TOKEN_HERE
SENTRY_ORG_SLUG=pdf-lab-pro
SENTRY_PROJECT_SLUG=pdflab-backend
```

**Add to /var/pdflab/.env.monitoring** (production):
```bash
SENTRY_AUTH_TOKEN="sntrys_YOUR_TOKEN_HERE"
SENTRY_ORG="pdf-lab-pro"
SENTRY_PROJECT="pdflab-backend"
```

Done.
