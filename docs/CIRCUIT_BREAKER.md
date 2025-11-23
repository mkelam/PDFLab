# Circuit Breaker Pattern - PDFLab

## Overview

Protects PDFLab from cascade failures when CloudConvert API is down or slow.

## How It Works

Circuit breaker has 3 states:

1. **CLOSED** (normal): All requests go through to CloudConvert
2. **OPEN** (failure): Requests immediately fail without calling CloudConvert
3. **HALF-OPEN** (testing): Allow 1 request to test if service recovered

## Configuration

### CloudConvert Circuit Breaker

- **Timeout**: 5 minutes (large files can be slow)
- **Error Threshold**: 60% (open circuit if >60% requests fail)
- **Reset Timeout**: 2 minutes (try to close circuit after 2 min)
- **Volume Threshold**: 3 requests minimum before opening

### Why These Values?

- **High timeout**: CloudConvert legitimately takes 1-3 minutes for 50MB files
- **60% threshold**: CloudConvert can be flaky; don't open circuit too aggressively
- **2-minute reset**: Give CloudConvert time to recover from issues
- **Low volume**: Small user base, don't need many samples

## Monitoring

### Admin Endpoint

```bash
GET /api/admin/system/circuit-breakers
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2025-11-23T12:00:00.000Z",
  "circuitBreakers": {
    "cloudconvert": {
      "convert": {
        "fires": 100,
        "successes": 85,
        "failures": 10,
        "rejects": 5,
        "timeouts": 0,
        "state": "closed",
        "isOpen": false,
        "percentiles": {
          "p50": 15000,
          "p95": 45000,
          "p99": 60000
        }
      },
      "merge": { ... },
      "compress": { ... },
      "download": { ... }
    }
  }
}
```

### Health Check Endpoint

```bash
GET /api/admin/system/circuit-breakers/health
```

Returns:
```json
{
  "healthy": true,
  "status": "healthy",
  "timestamp": "2025-11-23T12:00:00.000Z",
  "details": {
    "convert": "closed",
    "merge": "closed",
    "compress": "closed",
    "download": "closed"
  }
}
```

### Prometheus Metrics

- `pdflab_circuit_breaker_state{name="cloudconvert-convert"}` - 0=closed, 1=open, 2=half-open
- `pdflab_circuit_breaker_calls_total{name="...", result="..."}` - Total calls by result

### Logs

```bash
# Watch circuit breaker events
docker logs -f pdflab-backend-prod | grep "Circuit breaker"
```

## User Experience

### When Circuit is CLOSED (Normal)
- User uploads PDF → CloudConvert converts → User gets file
- Normal latency (10s - 3min depending on size)

### When Circuit is OPEN (CloudConvert Down)
- User uploads PDF → Immediate error: "CloudConvert service unavailable. Please try again later."
- **No waiting** for timeout (fast fail)
- **No queue buildup** (prevents system overload)

### Benefits
- Users get immediate feedback instead of waiting 5 minutes for timeout
- Backend doesn't get overwhelmed with hanging requests
- System stays responsive even when CloudConvert is down

## Tuning

If seeing too many false positives (circuit opens unnecessarily):
- Increase `errorThresholdPercentage` (e.g., 60 → 70)
- Increase `volumeThreshold` (e.g., 3 → 5)

If circuit should open faster:
- Decrease `errorThresholdPercentage` (e.g., 60 → 50)
- Decrease `resetTimeout` (e.g., 120000 → 60000)

Edit values in: `backend/src/config/circuit-breaker.ts`

## Implementation Details

### Wrapped Operations

All CloudConvert operations are protected by circuit breakers:

1. **convertFile** - PDF to PPTX/DOCX/XLSX/Images
2. **mergePDFs** - Merge multiple PDFs
3. **compressPDF** - Optimize PDF file size
4. **downloadConvertedFile** - Download result from CloudConvert

### Fallback Behavior

When circuit is open, requests return:
```json
{
  "success": false,
  "error": "CloudConvert service unavailable. Please try again later."
}
```

### Code Location

- **Configuration**: `backend/src/config/circuit-breaker.ts`
- **Factory**: `backend/src/utils/circuit-breaker.factory.ts`
- **Service**: `backend/src/services/cloudconvert.service.ts`
- **Routes**: `backend/src/routes/system.circuit-breaker.routes.ts`
- **Metrics**: `backend/src/config/metrics.ts`

## Testing

See `backend/test-circuit-breaker.ts` for testing scenarios.

## Troubleshooting

### Circuit keeps opening
- Check CloudConvert API status
- Review error logs for patterns
- Increase error threshold if false positives

### Circuit stuck open
- Check if CloudConvert recovered
- Circuit will automatically retry after reset timeout
- Can restart service to force reset (not recommended)

### Metrics not updating
- Check Prometheus is scraping metrics endpoint
- Verify circuit breaker events in logs
- Check metrics endpoint: `GET /metrics`
