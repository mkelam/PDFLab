import { User as CustomUser } from '../models/User'

declare global {
  namespace Express {
    interface User extends CustomUser {}
  }
}

export {}
