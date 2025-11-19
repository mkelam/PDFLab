import { Request, Response, NextFunction } from 'express';
import SecurityBlockerService from '../services/security-blocker.service';
import logger from '../config/logger';

/**
 * IP Blocker Middleware
 * Checks if incoming request is from a blocked IP
 */
export const ipBlockerMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get client IP (handle proxy/forwarded cases)
    const clientIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.headers['x-real-ip'] as string
      || req.socket.remoteAddress
      || req.ip;

    if (!clientIP) {
      return next();
    }

    // Check if IP is blocked
    const isBlocked = await SecurityBlockerService.isIPBlocked(clientIP);

    if (isBlocked) {
      logger.warn(`Blocked request from IP: ${clientIP}`);
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address has been temporarily blocked due to suspicious activity. Please contact support if you believe this is an error.'
      });
    }

    next();
  } catch (error) {
    logger.error('IP blocker middleware error:', error);
    // Fail open - don't block on error
    next();
  }
};
