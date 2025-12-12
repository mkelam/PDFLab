import type { User as DbUser, UserPlan, UserRole } from '../models/User'

declare global {
  namespace Express {
    interface User extends DbUser {}

    interface Request {
      userId?: string
      userPlan?: UserPlan
      userRole?: UserRole
    }
  }
}

export {}

