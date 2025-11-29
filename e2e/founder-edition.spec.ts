import { test, expect } from '@playwright/test'

const API_URL = 'https://pdflab.pro'

test.describe('Founder Edition API Tests', () => {
  test('GET /api/founder/spots returns available spots', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/founder/spots`)

    expect(response.ok()).toBeTruthy()
    const data = await response.json()

    expect(data).toHaveProperty('spots_remaining')
    expect(data).toHaveProperty('total_spots')
    expect(data).toHaveProperty('is_available')
    expect(data.total_spots).toBe(100)
    expect(typeof data.spots_remaining).toBe('number')
    expect(data.spots_remaining).toBeLessThanOrEqual(100)
  })

  test('GET /api/founder/progress without auth returns 401', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/founder/progress`)

    expect(response.status()).toBe(401)
    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  test('POST /api/founder/feedback without auth returns 401', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/founder/feedback`, {
      data: {
        use_case: 'Test use case',
        friction_points: 'Test friction points',
        would_pay: true
      }
    })

    expect(response.status()).toBe(401)
  })

  test('Founder registration flow', async ({ request }) => {
    const uniqueEmail = `founder-e2e-${Date.now()}@test.com`

    // Register as founder
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: uniqueEmail,
        password: 'Test123!',
        founder_edition: true
      }
    })

    expect(registerResponse.ok()).toBeTruthy()
    const registerData = await registerResponse.json()

    // Verify founder status
    expect(registerData.user.founder_status).toBe('active')
    expect(registerData.user.plan).toBe('pro')
    expect(registerData.user.founder_progress).toBeDefined()
    expect(registerData.user.founder_progress.conversions).toBe(0)
    expect(registerData.user.founder_progress.feedbackSubmitted).toBe(false)
    expect(registerData.founder_edition).toBeDefined()
    expect(registerData.founder_edition.enrolled).toBe(true)

    const token = registerData.token

    // Check progress endpoint
    const progressResponse = await request.get(`${API_URL}/api/founder/progress`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    expect(progressResponse.ok()).toBeTruthy()
    const progressData = await progressResponse.json()

    expect(progressData.founder_status).toBe('active')
    expect(progressData.progress.conversions).toBe(0)
    expect(progressData.progress.conversions_required).toBe(10)
    expect(progressData.progress.feedback_submitted).toBe(false)
    expect(progressData.progress.days_remaining).toBeLessThanOrEqual(14)
    expect(progressData.progress.is_complete).toBe(false)
  })

  test('Founder feedback submission via regular feedback endpoint', async ({ request }) => {
    const uniqueEmail = `founder-feedback-${Date.now()}@test.com`

    // Register as founder
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: uniqueEmail,
        password: 'Test123!',
        founder_edition: true
      }
    })

    const registerData = await registerResponse.json()
    const token = registerData.token

    // Verify feedback not submitted initially
    expect(registerData.user.founder_progress.feedbackSubmitted).toBe(false)

    // Submit feedback via regular feedback endpoint
    const feedbackResponse = await request.post(`${API_URL}/api/feedback`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: 'general',
        message: 'E2E test feedback for founder edition testing',
        page_url: 'https://pdflab.pro/test'
      }
    })

    expect(feedbackResponse.ok()).toBeTruthy()
    const feedbackData = await feedbackResponse.json()

    // Verify founder feedback was marked
    expect(feedbackData.founder_feedback_marked).toBe(true)
    expect(feedbackData.message).toContain('Founder Challenge')

    // Check progress to confirm feedback_submitted is now true
    const progressResponse = await request.get(`${API_URL}/api/founder/progress`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const progressData = await progressResponse.json()
    expect(progressData.progress.feedback_submitted).toBe(true)
  })

  test('Non-founder registration does not set founder status to active', async ({ request }) => {
    const uniqueEmail = `regular-user-${Date.now()}@test.com`

    // Register without founder_edition flag
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: uniqueEmail,
        password: 'Test123!'
      }
    })

    expect(registerResponse.ok()).toBeTruthy()
    const registerData = await registerResponse.json()

    // Verify not a founder (status is 'none' or undefined)
    const founderStatus = registerData.user.founder_status
    expect(founderStatus === 'none' || founderStatus === undefined).toBeTruthy()
    expect(registerData.founder_edition).toBeUndefined()
  })

  test('Spots decrease after founder registration', async ({ request }) => {
    // Get initial spots
    const initialResponse = await request.get(`${API_URL}/api/founder/spots`)
    const initialData = await initialResponse.json()
    const initialSpots = initialData.spots_remaining

    // Register a founder
    const uniqueEmail = `founder-spots-${Date.now()}@test.com`
    await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: uniqueEmail,
        password: 'Test123!',
        founder_edition: true
      }
    })

    // Check spots decreased (allow for race conditions with other tests)
    const afterResponse = await request.get(`${API_URL}/api/founder/spots`)
    const afterData = await afterResponse.json()

    // Spots should be less than or equal to initial (other concurrent tests may also create founders)
    expect(afterData.spots_remaining).toBeLessThan(initialSpots)
  })
})

test.describe('Founder Admin Panel Tests', () => {
  test.skip('Admin founders page loads', async ({ page }) => {
    // Skip browser tests - requires npx playwright install to be run first
    // Navigate to admin founders page
    await page.goto(`${API_URL}/admin/founders`)

    // Page should either show the founders page or redirect to login
    // If not logged in, it should redirect
    const url = page.url()

    // Either we're on the page or redirected to login
    expect(url).toMatch(/\/(admin\/founders|login)/)
  })
})
