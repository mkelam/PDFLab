import { Request, Response } from 'express'
import { updateUser } from '../../../src/controllers/admin.controller'
import { User } from '../../../src/models/User'

// Mock the User model
jest.mock('../../../src/models/User')
jest.mock('../../../src/config/logger', () => ({
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}))

describe('Admin Controller - updateUser', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockUser: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Mock user instance
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      plan: 'free',
      role: 'user',
      conversions_limit: 3,
      conversions_used: 0,
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined)
    }

    // Mock request
    mockRequest = {
      params: {
        id: 'test-user-id'
      },
      body: {}
    }

    // Mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }

    // Mock User.findByPk to return our mock user
    ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)
    ;(User.findOne as jest.Mock).mockResolvedValue(null)
  })

  describe('Plan and Quota Updates', () => {
    it('should update conversions_limit when plan is changed from free to pro', async () => {
      // Arrange
      mockRequest.body = {
        plan: 'pro'
      }

      // Update the mock to simulate the actual update behavior
      mockUser.update = jest.fn().mockImplementation((updates: any) => {
        Object.assign(mockUser, updates)
        return Promise.resolve()
      })

      // Act
      await updateUser(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(User.findByPk).toHaveBeenCalledWith('test-user-id')
      expect(mockUser.update).toHaveBeenCalledWith({
        plan: 'pro',
        conversions_limit: -1 // Unlimited for pro
      })
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User updated successfully',
        user: expect.objectContaining({
          id: 'test-user-id',
          plan: 'pro',
          conversions_limit: -1,
          conversions_used: 0
        })
      })
    })

    it('should update conversions_limit when plan is changed from free to starter', async () => {
      // Arrange
      mockRequest.body = {
        plan: 'starter'
      }

      mockUser.update = jest.fn().mockImplementation((updates: any) => {
        Object.assign(mockUser, updates)
        return Promise.resolve()
      })

      // Act
      await updateUser(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(mockUser.update).toHaveBeenCalledWith({
        plan: 'starter',
        conversions_limit: 100
      })
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User updated successfully',
        user: expect.objectContaining({
          plan: 'starter',
          conversions_limit: 100
        })
      })
    })

    it('should update conversions_limit when plan is changed from pro to free', async () => {
      // Arrange
      mockUser.plan = 'pro'
      mockUser.conversions_limit = -1
      mockRequest.body = {
        plan: 'free'
      }

      mockUser.update = jest.fn().mockImplementation((updates: any) => {
        Object.assign(mockUser, updates)
        return Promise.resolve()
      })

      // Act
      await updateUser(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(mockUser.update).toHaveBeenCalledWith({
        plan: 'free',
        conversions_limit: 3
      })
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User updated successfully',
        user: expect.objectContaining({
          plan: 'free',
          conversions_limit: 3
        })
      })
    })

    it('should update conversions_limit when plan is changed to enterprise', async () => {
      // Arrange
      mockRequest.body = {
        plan: 'enterprise'
      }

      mockUser.update = jest.fn().mockImplementation((updates: any) => {
        Object.assign(mockUser, updates)
        return Promise.resolve()
      })

      // Act
      await updateUser(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(mockUser.update).toHaveBeenCalledWith({
        plan: 'enterprise',
        conversions_limit: -1 // Unlimited for enterprise
      })
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User updated successfully',
        user: expect.objectContaining({
          plan: 'enterprise',
          conversions_limit: -1
        })
      })
    })

    it('should NOT update conversions_limit when only name is changed', async () => {
      // Arrange
      mockRequest.body = {
        name: 'Updated Name'
      }

      mockUser.update = jest.fn().mockImplementation((updates: any) => {
        Object.assign(mockUser, updates)
        return Promise.resolve()
      })

      // Act
      await updateUser(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(mockUser.update).toHaveBeenCalledWith({
        name: 'Updated Name'
      })
      // Should not include conversions_limit in the update
      expect(mockUser.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ conversions_limit: expect.anything() })
      )
    })

    it('should update both plan and name together with quota sync', async () => {
      // Arrange
      mockRequest.body = {
        name: 'Updated Name',
        plan: 'pro'
      }

      mockUser.update = jest.fn().mockImplementation((updates: any) => {
        Object.assign(mockUser, updates)
        return Promise.resolve()
      })

      // Act
      await updateUser(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(mockUser.update).toHaveBeenCalledWith({
        name: 'Updated Name',
        plan: 'pro',
        conversions_limit: -1
      })
    })
  })

  describe('Error Handling', () => {
    it('should return 404 if user not found', async () => {
      // Arrange
      ;(User.findByPk as jest.Mock).mockResolvedValue(null)
      mockRequest.body = { plan: 'pro' }

      // Act
      await updateUser(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not found'
      })
    })

    it('should return 400 if email already exists', async () => {
      // Arrange
      const existingUser = { id: 'different-id', email: 'existing@example.com' }
      ;(User.findOne as jest.Mock).mockResolvedValue(existingUser)
      mockRequest.body = {
        email: 'existing@example.com'
      }

      // Act
      await updateUser(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Email already exists',
        message: 'Another user is already using this email address'
      })
    })
  })

  describe('Response Format', () => {
    it('should include conversions_limit and conversions_used in response', async () => {
      // Arrange
      mockRequest.body = {
        plan: 'pro'
      }

      mockUser.update = jest.fn().mockImplementation((updates: any) => {
        Object.assign(mockUser, updates)
        return Promise.resolve()
      })

      // Act
      await updateUser(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User updated successfully',
        user: {
          id: expect.any(String),
          email: expect.any(String),
          name: expect.any(String),
          role: expect.any(String),
          plan: 'pro',
          conversions_limit: -1,
          conversions_used: 0
        }
      })
    })
  })
})
