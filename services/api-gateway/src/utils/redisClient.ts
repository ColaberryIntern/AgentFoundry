import Redis from 'ioredis';

let redisClient: Redis | null = null;
let connectionFailed = false;
let testOverrideEnabled = false;

/**
 * Returns a Redis client singleton.
 *
 * Reads connection details from the `REDIS_URL` environment variable
 * (defaults to `redis://localhost:6379`). If the connection fails the
 * client is destroyed and `null` is returned — callers must handle
 * the absence gracefully (e.g. fall back to in-memory cache).
 *
 * In test mode (`NODE_ENV=test`), returns `null` by default to avoid
 * open handles. Tests that mock ioredis can call `enableTestOverride()`
 * to bypass this guard.
 */
export function getRedisClient(): Redis | null {
  // In test mode, skip Redis unless explicitly overridden by tests that mock ioredis
  if (process.env.NODE_ENV === 'test' && !testOverrideEnabled) return null;

  if (connectionFailed) return null;

  if (!redisClient) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      redisClient = new Redis(url, {
        maxRetriesPerRequest: 1,
        retryStrategy(times: number) {
          if (times > 3) {
            // eslint-disable-next-line no-console
            console.warn('[redis] Max reconnection attempts reached — giving up');
            return null; // stop retrying
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
        enableOfflineQueue: false,
      });

      redisClient.on('error', (err) => {
        // eslint-disable-next-line no-console
        console.warn('[redis] Connection error:', (err as Error).message);
      });

      redisClient.on('close', () => {
        // eslint-disable-next-line no-console
        console.warn('[redis] Connection closed');
      });

      // Attempt eager connect but don't crash if it fails
      redisClient.connect().catch(() => {
        // eslint-disable-next-line no-console
        console.warn('[redis] Initial connection failed — falling back to in-memory cache');
        connectionFailed = true;
        if (redisClient) {
          redisClient.disconnect();
          redisClient = null;
        }
      });
    } catch {
      // eslint-disable-next-line no-console
      console.warn('[redis] Failed to create client — falling back to in-memory cache');
      connectionFailed = true;
      redisClient = null;
    }
  }

  return redisClient;
}

/**
 * Disconnect and reset the Redis client. Useful for tests and
 * graceful shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      // Ignore errors during disconnect
    }
    redisClient = null;
  }
  connectionFailed = false;
}

/**
 * Reset module-level state — intended for tests only.
 */
export function resetRedisState(): void {
  redisClient = null;
  connectionFailed = false;
}

/**
 * Allow tests with mocked ioredis to enable Redis client creation
 * even in test mode. Call this before `getRedisClient()`.
 */
export function enableTestOverride(): void {
  testOverrideEnabled = true;
}

/**
 * Disable the test override — restores default test mode behavior.
 */
export function disableTestOverride(): void {
  testOverrideEnabled = false;
}
