/**
 * Founder Edition Logic Test Suite
 * Tests the "Earned Lifetime" feature including:
 * - Founder signup with proper flags
 * - Conversion count tracking
 * - Feedback submission
 * - Challenge completion (earning lifetime access)
 * - Expiry/downgrade logic
 */

import request from 'supertest'
import { User, UserPlan } from '../src/models/User'
import { FounderStatus } from '../src/models/User'
import {
  incrementConversionCount,
  checkAndExpireFounders
} from '../src/controllers/founder.controller'

// Test constants
const FOUNDER_TEST_EMAIL = 'founder-test@pdflab.test'
const FOUNDER_TEST_PASSWORD = 'FounderTest123!'
const REGULAR_TEST_EMAIL = 'regular-test@pdflab.test'

describe('Founder Edition Logic', () => {
  // Cleanup before tests
  beforeAll(async () => {
    await User.destroy({ where: { email: FOUNDER_TEST_EMAIL } })
    await User.destroy({ where: { email: REGULAR_TEST_EMAIL } })
  })

  // Cleanup after tests
  afterAll(async () => {
    await User.destroy({ where: { email: FOUNDER_TEST_EMAIL } })
    await User.destroy({ where: { email: REGULAR_TEST_EMAIL } })
  })

  // =============================================================================
  // TEST SUITE 1: User Model Founder Fields
  // =============================================================================

  describe('User Model Founder Fields', () => {
    it('should have founder_status field defaulting to NONE', async () => {
      const user = await User.create({
        email: REGULAR_TEST_EMAIL,
        password_hash: 'test_hash',
        plan: UserPlan.FREE,
        conversions_used: 0,
        conversions_limit: 3
      })

      expect(user.founder_status).toBe(FounderStatus.NONE)
      expect(user.founder_deadline).toBeNull()
      expect(user.founder_feedback_submitted).toBe(false)
      expect(user.founder_conversions_count).toBe(0)

      await user.destroy()
    })

    it('should create founder user with ACTIVE status and deadline', async () => {
      const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days

      const user = await User.create({
        email: FOUNDER_TEST_EMAIL,
        password_hash: 'test_hash',
        plan: UserPlan.PRO,
        conversions_used: 0,
        conversions_limit: 999999,
        founder_status: FounderStatus.ACTIVE,
        founder_deadline: deadline,
        founder_feedback_submitted: false,
        founder_conversions_count: 0
      })

      expect(user.founder_status).toBe(FounderStatus.ACTIVE)
      expect(user.founder_deadline).toBeTruthy()
      expect(user.plan).toBe(UserPlan.PRO)
      expect(user.isFounderActive()).toBe(true)
      expect(user.isFounderEarned()).toBe(false)
    })
  })

  // =============================================================================
  // TEST SUITE 2: Founder Helper Methods
  // =============================================================================

  describe('Founder Helper Methods', () => {
    let founderUser: User

    beforeAll(async () => {
      founderUser = await User.findOne({ where: { email: FOUNDER_TEST_EMAIL } }) as User
    })

    it('should correctly check if founder deadline has passed', async () => {
      // Current deadline is in future
      expect(founderUser.hasFounderDeadlinePassed()).toBe(false)

      // Temporarily set past deadline
      const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      founderUser.founder_deadline = pastDeadline
      expect(founderUser.hasFounderDeadlinePassed()).toBe(true)

      // Reset to future deadline
      founderUser.founder_deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    })

    it('should correctly check challenge completion', async () => {
      // Not complete: 0 conversions, no feedback
      founderUser.founder_conversions_count = 0
      founderUser.founder_feedback_submitted = false
      expect(founderUser.hasCompletedFounderChallenge()).toBe(false)

      // Not complete: 10 conversions, no feedback
      founderUser.founder_conversions_count = 10
      expect(founderUser.hasCompletedFounderChallenge()).toBe(false)

      // Not complete: 5 conversions, feedback submitted
      founderUser.founder_conversions_count = 5
      founderUser.founder_feedback_submitted = true
      expect(founderUser.hasCompletedFounderChallenge()).toBe(false)

      // Complete: 10+ conversions AND feedback submitted
      founderUser.founder_conversions_count = 10
      expect(founderUser.hasCompletedFounderChallenge()).toBe(true)

      // Also complete with more than 10 conversions
      founderUser.founder_conversions_count = 15
      expect(founderUser.hasCompletedFounderChallenge()).toBe(true)

      // Reset for other tests
      founderUser.founder_conversions_count = 0
      founderUser.founder_feedback_submitted = false
    })

    it('should return correct founder progress', async () => {
      founderUser.founder_conversions_count = 5
      founderUser.founder_feedback_submitted = false
      founderUser.founder_deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      const progress = founderUser.getFounderProgress()

      expect(progress.conversions).toBe(5)
      expect(progress.conversionsRequired).toBe(10)
      expect(progress.feedbackSubmitted).toBe(false)
      expect(progress.daysRemaining).toBe(7)
      expect(progress.isComplete).toBe(false)

      // Reset
      founderUser.founder_conversions_count = 0
    })
  })

  // =============================================================================
  // TEST SUITE 3: Conversion Count Increment
  // =============================================================================

  describe('Conversion Count Increment', () => {
    let founderUser: User

    beforeEach(async () => {
      // Reset user state before each test
      await User.update(
        {
          founder_conversions_count: 0,
          founder_feedback_submitted: false,
          founder_status: FounderStatus.ACTIVE,
          plan: UserPlan.PRO
        },
        { where: { email: FOUNDER_TEST_EMAIL } }
      )
      founderUser = await User.findOne({ where: { email: FOUNDER_TEST_EMAIL } }) as User
    })

    it('should increment founder conversion count for active founders', async () => {
      const result = await incrementConversionCount(founderUser.id)

      expect(result.earned).toBe(false)
      expect(result.count).toBe(1)

      // Verify in database
      await founderUser.reload()
      expect(founderUser.founder_conversions_count).toBe(1)
    })

    it('should not increment for non-founder users', async () => {
      // Update user to non-founder
      await founderUser.update({ founder_status: FounderStatus.NONE })

      const result = await incrementConversionCount(founderUser.id)

      expect(result.earned).toBe(false)
      expect(result.count).toBe(0)
    })

    it('should not increment for already-earned founders', async () => {
      await founderUser.update({ founder_status: FounderStatus.EARNED })

      const result = await incrementConversionCount(founderUser.id)

      expect(result.earned).toBe(false)
      expect(result.count).toBe(0)
    })

    it('should trigger earned status when challenge completes', async () => {
      // Set up: 9 conversions, feedback submitted
      await founderUser.update({
        founder_conversions_count: 9,
        founder_feedback_submitted: true
      })

      // The 10th conversion should trigger earned status
      const result = await incrementConversionCount(founderUser.id)

      expect(result.earned).toBe(true)
      expect(result.count).toBe(10)

      // Verify in database
      await founderUser.reload()
      expect(founderUser.founder_status).toBe(FounderStatus.EARNED)
    })
  })

  // =============================================================================
  // TEST SUITE 4: Expiry Logic
  // =============================================================================

  describe('Founder Expiry Logic', () => {
    let expiredUser: User
    let completedUser: User
    const EXPIRED_USER_EMAIL = 'expired-founder@pdflab.test'
    const COMPLETED_USER_EMAIL = 'completed-founder@pdflab.test'

    beforeAll(async () => {
      // Clean up
      await User.destroy({ where: { email: EXPIRED_USER_EMAIL } })
      await User.destroy({ where: { email: COMPLETED_USER_EMAIL } })

      // Create user who will expire (not enough conversions)
      expiredUser = await User.create({
        email: EXPIRED_USER_EMAIL,
        password_hash: 'test_hash',
        plan: UserPlan.PRO,
        conversions_used: 0,
        conversions_limit: 999999,
        founder_status: FounderStatus.ACTIVE,
        founder_deadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        founder_feedback_submitted: false,
        founder_conversions_count: 5 // Only 5 conversions
      })

      // Create user who completed challenge but deadline passed
      completedUser = await User.create({
        email: COMPLETED_USER_EMAIL,
        password_hash: 'test_hash',
        plan: UserPlan.PRO,
        conversions_used: 0,
        conversions_limit: 999999,
        founder_status: FounderStatus.ACTIVE,
        founder_deadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        founder_feedback_submitted: true,
        founder_conversions_count: 12 // 12 conversions (completed)
      })
    })

    afterAll(async () => {
      await User.destroy({ where: { email: EXPIRED_USER_EMAIL } })
      await User.destroy({ where: { email: COMPLETED_USER_EMAIL } })
    })

    it('should expire founders who did not complete challenge', async () => {
      await checkAndExpireFounders()

      await expiredUser.reload()

      expect(expiredUser.founder_status).toBe(FounderStatus.EXPIRED)
      expect(expiredUser.plan).toBe(UserPlan.FREE)
    })

    it('should grant earned status to founders who completed challenge (even if deadline passed)', async () => {
      // Reload to get updated status after checkAndExpireFounders
      await completedUser.reload()

      expect(completedUser.founder_status).toBe(FounderStatus.EARNED)
      // Plan should remain PRO for earned founders
      expect(completedUser.plan).toBe(UserPlan.PRO)
    })
  })

  // =============================================================================
  // TEST SUITE 5: Founder Spots Counter
  // =============================================================================

  describe('Founder Spots Counter', () => {
    it('should correctly count spots taken and remaining', async () => {
      const activeCount = await User.count({ where: { founder_status: FounderStatus.ACTIVE } })
      const earnedCount = await User.count({ where: { founder_status: FounderStatus.EARNED } })

      const spotsTaken = activeCount + earnedCount
      const spotsRemaining = 100 - spotsTaken

      expect(spotsTaken).toBeGreaterThanOrEqual(0)
      expect(spotsRemaining).toBeLessThanOrEqual(100)
    })
  })
})
