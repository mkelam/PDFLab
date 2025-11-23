# Performance Tests with k6

## Installation

### Windows
```bash
# Using Chocolatey
choco install k6

# Or download from https://k6.io/docs/getting-started/installation/
```

### macOS
```bash
brew install k6
```

### Linux
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Running Tests

### Load Test (50 concurrent users)
```bash
k6 run tests/performance/load-test.js
```

### Stress Test (up to 300 users)
```bash
k6 run tests/performance/stress-test.js
```

### Spike Test (sudden traffic spikes)
```bash
k6 run tests/performance/spike-test.js
```

### Soak Test (30-minute stability test)
```bash
k6 run tests/performance/soak-test.js
```

## Custom Configuration

### Override API URL
```bash
k6 run -e API_URL=http://localhost:3006 tests/performance/load-test.js
```

### Generate HTML Report
```bash
k6 run --out json=results.json tests/performance/load-test.js
```

## Thresholds

All tests include thresholds for:
- **Response Time**: 95th percentile < 500ms (normal), < 2s (stress)
- **Error Rate**: < 1% (normal), < 5% (stress)
- **Custom Metrics**: Error rate tracking

## Interpreting Results

### Good Results
- ✅ All checks pass (green)
- ✅ Error rate < 1%
- ✅ p95 response time < 500ms
- ✅ No failed requests

### Warning Signs
- ⚠️ Error rate 1-5%
- ⚠️ p95 response time 500ms-1s
- ⚠️ Some failed requests

### Critical Issues
- ❌ Error rate > 5%
- ❌ p95 response time > 1s
- ❌ Many failed requests
- ❌ Thresholds not met

## Test Coverage

1. **load-test.js** - Simulates 50 concurrent users over 5 minutes
2. **stress-test.js** - Pushes system to 300 users to find breaking point
3. **spike-test.js** - Tests sudden traffic increases (10 → 200 → 10 users)
4. **soak-test.js** - 30-minute test to detect memory leaks

## Next Steps

After running tests:
1. Review metrics and identify bottlenecks
2. Check database query performance
3. Review Redis cache hit rates
4. Monitor server resource usage
5. Optimize slow endpoints
