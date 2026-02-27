import { Request, Response, NextFunction, Router } from 'express';

/**
 * Supported API versions. Currently all versions map to the same handlers.
 * When new versions are introduced, version-specific routing can be added here.
 */
const SUPPORTED_VERSIONS = ['v1'] as const;
const DEFAULT_VERSION = 'v1';

/**
 * Extend Express Request to carry the resolved API version.
 */
declare module 'express-serve-static-core' {
  interface Request {
    apiVersion?: string;
  }
}

/**
 * Middleware that resolves the API version from:
 * 1. The URL path prefix `/api/v1/...`
 * 2. The `X-API-Version` request header
 * 3. Falls back to the default version (`v1`)
 *
 * Sets `req.apiVersion` and adds `X-API-Version` to the response headers.
 */
export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check the X-API-Version header first
  const headerVersion = req.headers['x-api-version'] as string | undefined;

  if (
    headerVersion &&
    SUPPORTED_VERSIONS.includes(headerVersion as (typeof SUPPORTED_VERSIONS)[number])
  ) {
    req.apiVersion = headerVersion;
  } else {
    req.apiVersion = DEFAULT_VERSION;
  }

  // Always echo the resolved version back in the response
  res.setHeader('X-API-Version', req.apiVersion);
  next();
}

/**
 * Create a router that strips the `/api/v1` prefix and rewrites to `/api`.
 *
 * Example: GET /api/v1/users  ->  GET /api/users
 *
 * This allows existing `/api/*` routes to handle versioned requests
 * without duplication.  When breaking changes are introduced in v2,
 * a separate handler set can be mounted.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyApp = any;

/**
 * Create a router that strips the `/api/v1` prefix and rewrites to `/api`.
 *
 * Example: GET /api/v1/users  ->  GET /api/users
 *
 * This allows existing `/api/*` routes to handle versioned requests
 * without duplication.  When breaking changes are introduced in v2,
 * a separate handler set can be mounted.
 *
 * The `application` parameter is the Express app instance. We use `AnyApp`
 * because the internal `handle()` method is not exposed in the public
 * type definitions, but exists at runtime.
 */
export function createVersionRouter(application: AnyApp): Router {
  const versionRouter = Router();

  // Match any path under /api/v1/* and forward to the main app
  // by rewriting the URL so the existing /api/* routes match.
  versionRouter.all('/*', (req: Request, res: Response, next: NextFunction) => {
    // Rewrite: /api/v1/users -> /api/users
    // The original URL when this handler fires is relative to the mount point,
    // e.g. if mounted at /api/v1 the req.url is /users.
    // We prepend /api so the main app's routes match.
    req.url = `/api${req.url}`;
    req.apiVersion = 'v1';
    res.setHeader('X-API-Version', 'v1');
    application.handle(req, res, next);
  });

  return versionRouter;
}
