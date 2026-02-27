import { sequelize } from '../config/database';
import { User } from '../models/User';
import { ApiKey } from '../models/ApiKey';
import bcrypt from 'bcryptjs';

// Force test environment
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

afterEach(async () => {
  await ApiKey.destroy({ where: {}, truncate: true });
  await User.destroy({ where: {}, truncate: true });
});

describe('ApiKey model', () => {
  const validUserAttrs = {
    email: 'apikey-user@example.com',
    passwordHash: '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12',
    role: 'it_admin' as const,
  };

  async function createUserWithApiKey(overrides: Record<string, unknown> = {}) {
    const user = await User.create(validUserAttrs);
    const rawKey = 'af_k1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
    const keyHash = await bcrypt.hash(rawKey, 10);
    const apiKey = await ApiKey.create({
      userId: user.id,
      keyHash,
      name: 'My Integration Key',
      prefix: rawKey.substring(0, 8),
      ...overrides,
    });
    return { user, apiKey, rawKey };
  }

  describe('creation', () => {
    it('creates an API key with valid attributes', async () => {
      const { apiKey } = await createUserWithApiKey();

      expect(apiKey.id).toBeDefined();
      expect(apiKey.name).toBe('My Integration Key');
      expect(apiKey.prefix).toBe('af_k1b2c');
      expect(apiKey.isActive).toBe(true);
      expect(apiKey.lastUsedAt ?? null).toBeNull();
      expect(apiKey.expiresAt ?? null).toBeNull();
      expect(apiKey.createdAt).toBeInstanceOf(Date);
      expect(apiKey.updatedAt).toBeInstanceOf(Date);
    });

    it('stores keyHash (not plaintext key)', async () => {
      const { apiKey, rawKey } = await createUserWithApiKey();

      // keyHash should NOT equal the raw key
      expect(apiKey.keyHash).not.toBe(rawKey);
      // keyHash should be a valid bcrypt hash
      expect(apiKey.keyHash).toMatch(/^\$2[aby]?\$/);
      // bcrypt compare should succeed
      const isMatch = await bcrypt.compare(rawKey, apiKey.keyHash);
      expect(isMatch).toBe(true);
    });

    it('defaults isActive to true', async () => {
      const { apiKey } = await createUserWithApiKey();
      expect(apiKey.isActive).toBe(true);
    });
  });

  describe('associations', () => {
    it('associates API key with user (belongsTo)', async () => {
      const { user, apiKey } = await createUserWithApiKey();

      expect(apiKey.userId).toBe(user.id);

      // Fetch fresh from DB with include
      const found = await ApiKey.findByPk(apiKey.id);
      expect(found).not.toBeNull();
      expect(found!.userId).toBe(user.id);
    });

    it('user can have multiple API keys', async () => {
      const user = await User.create(validUserAttrs);
      const keyHash = await bcrypt.hash('key1', 10);

      await ApiKey.create({
        userId: user.id,
        keyHash,
        name: 'Key One',
        prefix: 'af_key01',
      });
      await ApiKey.create({
        userId: user.id,
        keyHash,
        name: 'Key Two',
        prefix: 'af_key02',
      });

      const keys = await ApiKey.findAll({ where: { userId: user.id } });
      expect(keys).toHaveLength(2);
    });
  });

  describe('deactivation', () => {
    it('can be deactivated by setting isActive to false', async () => {
      const { apiKey } = await createUserWithApiKey();

      await apiKey.update({ isActive: false });
      await apiKey.reload();

      expect(apiKey.isActive).toBe(false);
    });
  });

  describe('expiration', () => {
    it('can have an expiration date set', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const { apiKey } = await createUserWithApiKey({ expiresAt });

      expect(apiKey.expiresAt).not.toBeNull();
      expect(new Date(apiKey.expiresAt!).getTime()).toBeCloseTo(expiresAt.getTime(), -3);
    });

    it('stores an already-expired date', async () => {
      const expiresAt = new Date(Date.now() - 1000); // in the past
      const { apiKey } = await createUserWithApiKey({ expiresAt });

      expect(apiKey.expiresAt).not.toBeNull();
      expect(new Date(apiKey.expiresAt!).getTime()).toBeLessThan(Date.now());
    });
  });

  describe('prefix generation', () => {
    it('stores the prefix correctly', async () => {
      const { apiKey } = await createUserWithApiKey();
      expect(apiKey.prefix).toHaveLength(8);
      expect(typeof apiKey.prefix).toBe('string');
    });
  });
});
