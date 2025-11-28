import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt, { SignOptions } from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'

dotenv.config()

// Lazy logger import to avoid circular dependencies during startup
const getLogger = () => {
  try {
    return require('../config/logger').default
  } catch {
    return console // Fallback to console if logger not available
  }
}

const SALT_ROUNDS = 12

// JWT_SECRET validation - fail fast in production if missing or weak
const JWT_SECRET_RAW = process.env['JWT_SECRET']
const IS_PRODUCTION = process.env['NODE_ENV'] === 'production'

if (!JWT_SECRET_RAW) {
  if (IS_PRODUCTION) {
    throw new Error('CRITICAL: JWT_SECRET environment variable must be set in production')
  }
  getLogger().warn('JWT_SECRET not set - using insecure default for development only')
}

if (JWT_SECRET_RAW && JWT_SECRET_RAW.length < 32) {
  if (IS_PRODUCTION) {
    throw new Error('CRITICAL: JWT_SECRET must be at least 32 characters in production')
  }
  getLogger().warn('JWT_SECRET is too short - use at least 32 characters for security')
}

// Use configured secret or development fallback (NEVER use fallback in production due to above checks)
const JWT_SECRET = JWT_SECRET_RAW || 'INSECURE_DEV_SECRET_DO_NOT_USE_IN_PRODUCTION'

const JWT_EXPIRATION: string | number = process.env['JWT_EXPIRATION'] || '15m' // Short-lived access token (15 minutes)
const JWT_REFRESH_EXPIRATION: string | number = process.env['JWT_REFRESH_EXPIRATION'] || '30d' // Long-lived refresh token (30 days)

export interface JWTPayload {
  userId: string
  email: string
  plan: string
}

/**
 * Hash a plain text password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify password against hash
 */
export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

/**
 * Generate JWT access token
 */
export const generateAccessToken = (payload: JWTPayload | any, expiresIn?: string): string => {
  const options: SignOptions = {
    expiresIn: (expiresIn || JWT_EXPIRATION) as any
  }
  return jwt.sign(payload, JWT_SECRET, options)
}

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (payload: JWTPayload): string => {
  const options: SignOptions = {
    expiresIn: JWT_REFRESH_EXPIRATION as any
  }
  return jwt.sign(payload, JWT_SECRET, options)
}

/**
 * Generate password reset token (expires in 1 hour)
 */
export const generatePasswordResetToken = (payload: JWTPayload): string => {
  return jwt.sign(
    { ...payload, type: 'password_reset' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

/**
 * Verify and decode JWT token
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 10 characters (NIST recommends at least 8, we use 10 for better security)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not a commonly used password
 */
export const isValidPassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (password.length < 10) {
    errors.push('Password must be at least 10 characters long')
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)')
  }

  // Check for common passwords (basic list - expand in production)
  const commonPasswords = [
    'password123', 'qwerty123', '123456789', 'letmein123', 'welcome123',
    'admin123', 'password1', 'Password1!', 'Password123!', 'Passw0rd!'
  ]
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a more unique password')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Legacy password validation (simple check for backwards compatibility)
 * @deprecated Use isValidPassword() which returns detailed errors
 */
export const isPasswordValid = (password: string): boolean => {
  return isValidPassword(password).valid
}

// ============================================================================
// REFRESH TOKEN MANAGEMENT (Server-Side Storage)
// ============================================================================

/**
 * Hash a refresh token for secure storage
 * We store the hash, not the raw token, in the database
 */
export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Generate a new refresh token with server-side storage support
 * Returns both the JWT token (to send to client) and the hash (to store in DB)
 */
export const generateRefreshTokenWithStorage = (
  payload: JWTPayload,
  familyId?: string
): { token: string; tokenHash: string; familyId: string; expiresAt: Date } => {
  // Generate or use existing family ID
  const tokenFamilyId = familyId || uuidv4()

  // Create JWT with family ID embedded
  const options: SignOptions = {
    expiresIn: JWT_REFRESH_EXPIRATION as any
  }
  const token = jwt.sign(
    { ...payload, familyId: tokenFamilyId, type: 'refresh' },
    JWT_SECRET,
    options
  )

  // Calculate expiration date
  const expiresAt = new Date()
  const expirationMs = typeof JWT_REFRESH_EXPIRATION === 'string'
    ? parseExpirationString(JWT_REFRESH_EXPIRATION)
    : JWT_REFRESH_EXPIRATION * 1000
  expiresAt.setTime(expiresAt.getTime() + expirationMs)

  return {
    token,
    tokenHash: hashRefreshToken(token),
    familyId: tokenFamilyId,
    expiresAt
  }
}

/**
 * Parse expiration string like '30d' or '7d' into milliseconds
 */
const parseExpirationString = (expiration: string): number => {
  const match = expiration.match(/^(\d+)([smhd])$/)
  if (!match) {
    return 30 * 24 * 60 * 60 * 1000 // Default: 30 days
  }

  const value = parseInt(match[1])
  const unit = match[2]

  switch (unit) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    case 'd': return value * 24 * 60 * 60 * 1000
    default: return 30 * 24 * 60 * 60 * 1000
  }
}

/**
 * Verify refresh token and extract payload including family ID
 */
export const verifyRefreshToken = (token: string): (JWTPayload & { familyId?: string; type?: string }) | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload & { familyId?: string; type?: string }

    // Verify this is actually a refresh token
    if (decoded.type !== 'refresh') {
      return null
    }

    return decoded
  } catch (error) {
    return null
  }
}
