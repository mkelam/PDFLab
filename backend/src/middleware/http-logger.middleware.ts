import { Request, Response, NextFunction } from 'express'
import logger from '../config/logger'

export function httpLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now()

  // Log request
  logger.http('Incoming request', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id,
    referer: req.get('referer')
  })

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start

    const logLevel = res.statusCode >= 500 ? 'error'
                   : res.statusCode >= 400 ? 'warn'
                   : 'http'

    logger.log(logLevel, 'Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: (req as any).user?.id,
      contentLength: res.get('content-length')
    })
  })

  next()
}
