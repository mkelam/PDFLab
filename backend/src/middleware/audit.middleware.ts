import { Request, Response, NextFunction } from 'express'
import { AuditService } from '../services/audit.service'

/**
 * Middleware to automatically log all admin actions
 * Should be applied after auth and admin middleware
 */
export const auditLogMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Only log if user is authenticated
  if (!req.user) {
    next()
    return
  }

  // Store original end function
  const originalEnd = res.end
  const originalJson = res.json.bind(res)

  // Capture response for before/after tracking
  let responseBody: any

  // Override res.json to capture response
  res.json = function (body: any) {
    responseBody = body
    return originalJson(body)
  }

  // Override res.end to log after response
  res.end = function (chunk?: any, encoding?: any, cb?: any) {
    // Log asynchronously after response is sent
    setImmediate(async () => {
      try {
        // Only log successful responses (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const action = `${req.method} ${req.route?.path || req.path}`

          // Determine entity type and ID from route
          const entityType = extractEntityType(req.path)
          const entityId = req.params?.id || req.body?.id

          // Capture changes (before/after)
          const changes = captureChanges(req, responseBody)

          // Determine severity
          const severity = AuditService.determineSeverity(req.method, req.path, entityType)

          await AuditService.createLogAsync({
            admin_user_id: req.user!.id,
            action,
            entity_type: entityType,
            entity_id: entityId,
            changes,
            ip_address: req.ip || req.socket.remoteAddress,
            user_agent: req.get('user-agent'),
            severity
          })
        }
      } catch (error) {
        // Log error but don't fail the request
        console.error('Audit logging failed:', error)
      }
    })

    // Call original end function
    return originalEnd.call(res, chunk, encoding, cb)
  }

  next()
}

/**
 * Extract entity type from route path
 */
function extractEntityType(path: string): string {
  // /api/admin/users/:id -> 'user'
  // /api/admin/conversions/:id -> 'conversion'
  // /api/admin/payments/:id -> 'payment'

  const match = path.match(/\/api\/admin\/([^\/]+)/)
  if (match) {
    const entity = match[1]
    // Singularize (remove trailing 's' if present)
    return entity.endsWith('s') ? entity.slice(0, -1) : entity
  }

  return 'unknown'
}

/**
 * Capture before/after changes from request and response
 */
function captureChanges(req: Request, responseBody: any): object | undefined {
  // For updates, capture the request body as "after" state
  if (req.method === 'PUT' || req.method === 'PATCH') {
    return {
      before: null, // Would need to fetch from DB before update
      after: req.body
    }
  }

  // For deletes, capture what was deleted
  if (req.method === 'DELETE') {
    return {
      before: responseBody?.data || responseBody,
      after: null
    }
  }

  // For creates, capture what was created
  if (req.method === 'POST') {
    return {
      before: null,
      after: responseBody?.data || req.body
    }
  }

  // For reads, no changes
  return undefined
}
