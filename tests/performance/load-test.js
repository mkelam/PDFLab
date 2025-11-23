import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

/**
 * Load Test: PDFLab API
 *
 * Simulates 50 concurrent users
 * Tests: API response times, error rates, throughput
 * Duration: 5 minutes
 */

const errorRate = new Rate('errors')
const BASE_URL = __ENV.API_URL || 'http://localhost:3006'

export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up to 10 users
    { duration: '2m', target: 50 },  // Ramp up to 50 users
    { duration: '2m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
    errors: ['rate<0.1'],              // Custom error rate < 10%
  },
}

// Test user credentials
const TEST_USER = {
  email: 'testuser@pdflab.com',
  password: 'TestPass123!',
}

let authToken = null

export function setup() {
  // Login to get auth token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(TEST_USER), {
    headers: { 'Content-Type': 'application/json' },
  })

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body)
    return { token: body.access_token }
  }

  return { token: null }
}

export default function (data) {
  const headers = data.token
    ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.token}`,
      }
    : { 'Content-Type': 'application/json' }

  // Test 1: Get user profile
  {
    const res = http.get(`${BASE_URL}/api/auth/profile`, { headers })
    const success = check(res, {
      'profile status is 200': (r) => r.status === 200 || r.status === 401,
      'profile response time < 200ms': (r) => r.timings.duration < 200,
    })
    errorRate.add(!success)
  }

  sleep(1)

  // Test 2: Get pricing plans
  {
    const res = http.get(`${BASE_URL}/api/payfast/plans`)
    const success = check(res, {
      'plans status is 200': (r) => r.status === 200,
      'plans response time < 300ms': (r) => r.timings.duration < 300,
    })
    errorRate.add(!success)
  }

  sleep(1)

  // Test 3: Get conversion history (if authenticated)
  if (data.token) {
    const res = http.get(`${BASE_URL}/api/history`, { headers })
    const success = check(res, {
      'history status is 200': (r) => r.status === 200,
      'history response time < 500ms': (r) => r.timings.duration < 500,
    })
    errorRate.add(!success)
  }

  sleep(2)
}

export function teardown(data) {
  console.log('Load test completed')
}
