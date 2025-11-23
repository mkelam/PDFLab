import http from 'k6/http'
import { check, sleep } from 'k6'

/**
 * Spike Test: PDFLab API
 *
 * Simulates sudden traffic spikes
 * Tests: System behavior under sudden load increase
 * Duration: 5 minutes
 */

const BASE_URL = __ENV.API_URL || 'http://localhost:3006'

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Normal load
    { duration: '30s', target: 200 },  // Sudden spike!
    { duration: '1m', target: 200 },   // Sustained spike
    { duration: '30s', target: 10 },   // Drop back to normal
    { duration: '1m', target: 10 },    // Recovery period
    { duration: '30s', target: 300 },  // Second spike!
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<3000'], // 99% under 3s during spikes
    http_req_failed: ['rate<0.1'],     // < 10% errors during spikes
  },
}

export default function () {
  const endpoints = [
    '/api/health',
    '/api/payfast/plans',
  ]

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)]
  const res = http.get(`${BASE_URL}${endpoint}`)

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time acceptable': (r) => r.timings.duration < 3000,
  })

  sleep(Math.random() * 2) // Random sleep 0-2 seconds
}
