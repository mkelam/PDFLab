// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-secret-key-do-not-use-in-production'

  // Suppress console logs during tests (optional)
  // jest.spyOn(console, 'log').mockImplementation(() => {})
  // jest.spyOn(console, 'warn').mockImplementation(() => {})
  // jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterAll(async () => {
  // Cleanup - give time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 500))
})
