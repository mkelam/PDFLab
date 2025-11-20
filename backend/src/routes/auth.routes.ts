import { Router } from 'express'
import { register, login, getProfile, updateProfile, refreshToken, forgotPassword, resetPassword } from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { authLimiter } from '../middleware/ratelimit.middleware'
import { trackSignup } from '../middleware/analytics.middleware'

const router = Router()

// Public routes (with rate limiting)
router.post('/register', authLimiter, trackSignup, register)
router.post('/login', authLimiter, login)
router.post('/refresh', refreshToken)
router.post('/forgot-password', authLimiter, forgotPassword)
router.post('/reset-password', authLimiter, resetPassword)

// Protected routes
router.get('/profile', authMiddleware, getProfile)
router.put('/profile', authMiddleware, updateProfile)

export default router
