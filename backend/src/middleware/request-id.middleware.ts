import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

declare global {
  namespace Express {
    interface Request {
      id: string  // Request correlation ID
    }
  }
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Generate or use existing request ID
  req.id = (req.headers['x-request-id'] as string) || uuidv4()

  // Add to response headers for client tracking
  res.setHeader('X-Request-ID', req.id)

  next()
}
