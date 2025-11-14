import bcrypt from 'bcrypt'
import jwt, { SignOptions } from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const SALT_ROUNDS = 12
const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key-change-this-in-production'
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
 * Requirements: min 8 characters, at least one letter and one number
 */
export const isValidPassword = (password: string): boolean => {
  if (password.length < 8) return false

  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /\d/.test(password)

  return hasLetter && hasNumber
}
