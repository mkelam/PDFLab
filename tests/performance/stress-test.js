import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

/**
 * Stress Test: PDFLab API
 *
 * Pushes the system to its limits
 * Tests: Maximum concurrent users, breaking point, recovery
 * Duration: 10 minutes
 */

const errorRate = new Rate('errors')
const BASE_URL = __ENV.API_URL || 'http://localhost:3006'

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users (stress)
    { duration: '2m', target: 300 },  // Ramp up to 300 users (breaking point)
    { duration: '2m', target: 0 },    // Ramp down to 0 (recovery)
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2 seconds during stress
    http_req_failed: ['rate<0.05'],     // Error rate < 5% acceptable during stress
  },
}

export default function () {
  // Test API health endpoint
  const res = http.get(`${BASE_URL}/api/health`)

  const success = check(res, {
    'health check status is 200': (r) => r.status === 200,
    'health check has uptime': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.uptime !== undefined
      } catch {
        return false
      }
    },
  })

  errorRate.add(!success)
  sleep(0.5)
}
