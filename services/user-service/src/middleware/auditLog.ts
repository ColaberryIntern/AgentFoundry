import { Request, Response, NextFunction } from 'express';

/**
 * Audit logging middleware factory.
 *
 * Records an audit log entry after the response has been sent.
 * Uses the `finish` event on the response to capture the result
 * without blocking the request pipeline.
 *
 * Only logs on successful responses (2xx status codes).
 *
 * Must be placed after `authenticate` middleware so req.user is available.
 *
 * Usage:
 *   router.put('/users/:id', authenticate, auditLog('role.assign', 'user'), handler);
 */
export function auditLog(action: string, resource: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Capture details after response is sent
    res.on('finish', () => {
      // Only log successful responses (2xx)
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return;
      }

      // Fire-and-forget: import and create asynchronously without awaiting
      (async () => {
        try {
          // Dynamically import AuditLog to avoid circular dependencies
          const { AuditLog } = await import('../models/AuditLog');

          const userId = req.user?.userId ?? null;
          const rawId = req.params?.id;
          const resourceId = typeof rawId === 'string' ? rawId : (rawId?.[0] ?? null);

          await AuditLog.create({
            userId,
            action,
            resource,
            resourceId,
            details: {
              method: req.method,
              path: req.originalUrl,
              statusCode: res.statusCode,
            },
            ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
            userAgent: req.get('user-agent') ?? null,
          });
        } catch (err) {
          // Audit logging failures must not break the request flow.
          // Log the error but do not propagate it.
          console.error('[audit-log] Failed to record audit entry:', err);
        }
      })();
    });

    next();
  };
}
