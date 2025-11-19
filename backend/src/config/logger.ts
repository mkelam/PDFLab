/**
 * Simple logger configuration
 * Wraps console methods for consistent logging
 */

const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  debug: (...args: any[]) => console.log('[DEBUG]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};

export default logger;
