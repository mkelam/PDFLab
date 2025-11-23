import http from 'k6/http'
import { check, sleep } from 'k6'

/**
 * Soak Test: PDFLab API
 *
 * Long-duration test to detect memory leaks and stability issues
 * Tests: System stability over extended period
 * Duration: 30 minutes (can be extended to hours)
 */

const BASE_URL = __ENV.API_URL || 'http://localhost:3006'

export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp up
    { duration: '26m', target: 20 },  // Stay at 20 users for 26 minutes
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function () {
  // Simulate realistic user behavior
  const scenarios = [
    () => {
      // User checks pricing
      const res = http.get(`${BASE_URL}/api/payfast/plans`)
      check(res, { 'plans loaded': (r) => r.status === 200 })
      sleep(5)
    },
    () => {
      // User checks health
      const res = http.get(`${BASE_URL}/api/health`)
      check(res, { 'health check passed': (r) => r.status === 200 })
      sleep(3)
    },
  ]

  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]
  scenario()
  sleep(10)
}
