# Worker Concurrency Configuration

## Current Setting: 3 concurrent workers

### Calculation

VPS Resources:
- Total RAM: 4GB
- OS overhead: ~500MB
- MySQL: ~512MB (limited)
- Redis: ~256MB (limited)
- Frontend: ~512MB (limited)
- Available for Backend: ~1GB

Backend Memory per Conversion:
- Base memory: ~200MB
- Per conversion: ~100MB
- 5 conversions: 200MB + (5 × 100MB) = 700MB ✅ OK in theory
- BUT: Spikes to 500MB during large files

Safe Concurrency:
- 3 conversions: 200MB + (3 × 100MB) = 500MB ✅ Safe
- 4 conversions: 200MB + (4 × 100MB) = 600MB ⚠️ Tight
- 5 conversions: 200MB + (5 × 100MB) = 700MB ❌ Risk of spikes

### Decision

Set to 3 for safety margin. Can increase to 4 after Phase 2 (VPS upgrade to 8GB).

### How to Change

1. Update WORKER_CONCURRENCY in .env.production
2. Restart backend: `docker restart pdflab-backend-prod`
3. Monitor: `docker stats pdflab-backend-prod`

### Performance Impact

- Throughput: 3 conversions × 30s avg = 6 conversions/min
- Queue wait time: Minimal (most users don't queue)
- Resource utilization: ~50% backend memory (safe)
