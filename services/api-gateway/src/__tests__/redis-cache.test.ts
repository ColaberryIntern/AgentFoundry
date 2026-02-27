/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';

// ---------------------------------------------------------------------------
// Mock ioredis BEFORE importing any module that uses it
// ---------------------------------------------------------------------------
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDel = jest.fn();
const mockFlushdb = jest.fn();
const mockQuit = jest.fn();
const mockDisconnect = jest.fn();
const mockConnect = jest.fn();
const mockOn = jest.fn();
const mockCall = jest.fn();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: mockGet,
    set: mockSet,
    del: mockDel,
    flushdb: mockFlushdb,
    quit: mockQuit,
    disconnect: mockDisconnect,
    connect: mockConnect.mockResolvedValue(undefined),
    on: mockOn,
    call: mockCall,
    status: 'ready',
  }));
});

import {
  getRedisClient,
  disconnectRedis,
  resetRedisState,
  enableTestOverride,
  disableTestOverride,
} from '../utils/redisClient';
import { cache, memoryFallback } from '../utils/cache';

// ---------------------------------------------------------------------------
// RedisClient tests
// ---------------------------------------------------------------------------
describe('RedisClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRedisState();
    enableTestOverride();
  });

  afterEach(async () => {
    await disconnectRedis();
    disableTestOverride();
  });

  it('returns a Redis client instance when REDIS_URL is set', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const client = getRedisClient();
    expect(client).not.toBeNull();
    delete process.env.REDIS_URL;
  });

  it('returns the same client on repeated calls (singleton)', () => {
    const first = getRedisClient();
    const second = getRedisClient();
    expect(first).toBe(second);
  });

  it('registers error and close event handlers', () => {
    getRedisClient();
    const eventNames = mockOn.mock.calls.map((c: any[]) => c[0]);
    expect(eventNames).toContain('error');
    expect(eventNames).toContain('close');
  });

  it('disconnectRedis resets the client', async () => {
    const client = getRedisClient();
    expect(client).not.toBeNull();
    await disconnectRedis();
    // After reset, a new call should produce a new instance
    resetRedisState();
    const newClient = getRedisClient();
    expect(newClient).not.toBe(client);
  });

  it('returns null when test override is disabled', () => {
    disableTestOverride();
    resetRedisState();
    const client = getRedisClient();
    expect(client).toBeNull();
    enableTestOverride(); // restore for cleanup
  });
});

// ---------------------------------------------------------------------------
// Cache tests (with Redis mock available)
// ---------------------------------------------------------------------------
describe('Cache — Redis-backed operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRedisState();
    enableTestOverride();
    memoryFallback.clear();
  });

  afterEach(async () => {
    await disconnectRedis();
    disableTestOverride();
  });

  describe('get()', () => {
    it('returns parsed JSON from Redis on cache hit', async () => {
      // Ensure we have a Redis client
      getRedisClient();
      const data = { foo: 'bar', num: 42 };
      mockGet.mockResolvedValueOnce(JSON.stringify(data));

      const result = await cache.get('test-key');
      expect(result).toEqual(data);
      expect(mockGet).toHaveBeenCalledWith('test-key');
    });

    it('returns null on Redis cache miss', async () => {
      getRedisClient();
      mockGet.mockResolvedValueOnce(null);

      const result = await cache.get('missing');
      expect(result).toBeNull();
    });

    it('falls back to in-memory cache when Redis get() throws', async () => {
      getRedisClient();
      mockGet.mockRejectedValueOnce(new Error('connection lost'));

      // Populate in-memory fallback
      memoryFallback.set('fallback-key', { inmem: true }, 60);

      const result = await cache.get('fallback-key');
      expect(result).toEqual({ inmem: true });
    });
  });

  describe('set()', () => {
    it('stores JSON string in Redis with EX ttl', async () => {
      getRedisClient();
      mockSet.mockResolvedValueOnce('OK');

      await cache.set('k', { a: 1 }, 120);
      expect(mockSet).toHaveBeenCalledWith('k', JSON.stringify({ a: 1 }), 'EX', 120);
    });

    it('falls back to in-memory when Redis set() throws', async () => {
      getRedisClient();
      mockSet.mockRejectedValueOnce(new Error('READONLY'));

      await cache.set('mem-key', { fallback: true }, 30);

      // Verify in-memory has the value
      const val = memoryFallback.get('mem-key');
      expect(val).toEqual({ fallback: true });
    });
  });

  describe('del()', () => {
    it('deletes key from Redis', async () => {
      getRedisClient();
      mockDel.mockResolvedValueOnce(1);

      await cache.del('to-delete');
      expect(mockDel).toHaveBeenCalledWith('to-delete');
    });

    it('falls back to in-memory del when Redis throws', async () => {
      getRedisClient();
      mockDel.mockRejectedValueOnce(new Error('fail'));

      memoryFallback.set('to-del', 'value', 60);
      await cache.del('to-del');

      expect(memoryFallback.get('to-del')).toBeNull();
    });
  });

  describe('clear()', () => {
    it('calls flushdb on Redis', async () => {
      getRedisClient();
      mockFlushdb.mockResolvedValueOnce('OK');

      await cache.clear();
      expect(mockFlushdb).toHaveBeenCalled();
    });

    it('falls back to in-memory clear when Redis throws', async () => {
      getRedisClient();
      mockFlushdb.mockRejectedValueOnce(new Error('fail'));

      memoryFallback.set('a', 1, 60);
      memoryFallback.set('b', 2, 60);
      await cache.clear();

      expect(memoryFallback.get('a')).toBeNull();
      expect(memoryFallback.get('b')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Cache tests — in-memory fallback (no Redis)
// ---------------------------------------------------------------------------
describe('Cache — in-memory fallback (no Redis)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRedisState();
    enableTestOverride();
    memoryFallback.clear();

    // Simulate Redis being completely unavailable — every operation throws
    mockGet.mockRejectedValue(new Error('ECONNREFUSED'));
    mockSet.mockRejectedValue(new Error('ECONNREFUSED'));
    mockDel.mockRejectedValue(new Error('ECONNREFUSED'));
    mockFlushdb.mockRejectedValue(new Error('ECONNREFUSED'));
  });

  afterEach(() => {
    disableTestOverride();
  });

  it('stores and retrieves values from memory when Redis unavailable', async () => {
    // getRedisClient returns a mock that will throw on every operation,
    // so cache.set/get will fall through to the in-memory fallback
    getRedisClient();

    await cache.set('mem-only', { memory: true }, 60);
    const result = await cache.get('mem-only');
    expect(result).toEqual({ memory: true });
  });

  it('returns null for missing keys in memory fallback', async () => {
    getRedisClient();

    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('deletes keys from memory fallback', async () => {
    getRedisClient();

    // Populate memory directly
    memoryFallback.set('to-remove', 'val', 60);
    await cache.del('to-remove');
    const result = await cache.get('to-remove');
    expect(result).toBeNull();
  });

  it('clears all keys from memory fallback', async () => {
    getRedisClient();

    memoryFallback.set('x', 1, 60);
    memoryFallback.set('y', 2, 60);
    await cache.clear();
    expect(memoryFallback.get('x')).toBeNull();
    expect(memoryFallback.get('y')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// JSON serialization / deserialization
// ---------------------------------------------------------------------------
describe('Cache — JSON serialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRedisState();
    enableTestOverride();
  });

  afterEach(async () => {
    await disconnectRedis();
    disableTestOverride();
  });

  it('correctly serializes complex objects', async () => {
    getRedisClient();
    mockSet.mockResolvedValueOnce('OK');

    const complex = {
      nested: { deep: { value: [1, 2, 3] } },
      date: '2026-01-01T00:00:00.000Z',
      nullVal: null,
      boolVal: true,
    };

    await cache.set('complex', complex, 60);
    expect(mockSet).toHaveBeenCalledWith('complex', JSON.stringify(complex), 'EX', 60);
  });

  it('correctly deserializes stored JSON', async () => {
    getRedisClient();

    const stored = { items: [{ id: 1 }, { id: 2 }], total: 2 };
    mockGet.mockResolvedValueOnce(JSON.stringify(stored));

    const result = await cache.get('stored');
    expect(result).toEqual(stored);
  });
});

// ---------------------------------------------------------------------------
// TTL expiration (in-memory)
// ---------------------------------------------------------------------------
describe('Cache — TTL expiration (in-memory)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRedisState();
    memoryFallback.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null after TTL expires in memory fallback', () => {
    memoryFallback.set('expires-soon', 'data', 5); // 5 second TTL

    // Before expiry
    expect(memoryFallback.get('expires-soon')).toBe('data');

    // Advance time past TTL
    jest.advanceTimersByTime(6000);

    expect(memoryFallback.get('expires-soon')).toBeNull();
  });

  it('returns value before TTL expires in memory fallback', () => {
    memoryFallback.set('still-valid', 'data', 10);

    jest.advanceTimersByTime(5000);
    expect(memoryFallback.get('still-valid')).toBe('data');
  });
});
