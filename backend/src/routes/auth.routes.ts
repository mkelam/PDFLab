import { Router } from 'express'
import { register, login, getProfile, refreshToken, forgotPassword, resetPassword } from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { authLimiter } from '../middleware/ratelimit.middleware'

const router = Router()

// Public routes (with rate limiting)
router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.post('/refresh', refreshToken)
router.post('/forgot-password', authLimiter, forgotPassword)
router.post('/reset-password', authLimiter, resetPassword)

// Protected routes
router.get('/profile', authMiddleware, getProfile)

export default router
