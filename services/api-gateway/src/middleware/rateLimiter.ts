import rateLimit from 'express-rate-limit';

/**
 * Default rate limiter — 100 requests per 1-minute window per IP.
 *
 * Returns HTTP 429 with a clear JSON message when the limit is exceeded.
 */
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please try again after 1 minute.',
      details: null,
    },
  },
});
