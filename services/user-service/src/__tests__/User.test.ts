import { sequelize } from '../config/database';
import { User } from '../models/User';

// Force test environment
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

afterEach(async () => {
  await User.destroy({ where: {}, truncate: true });
});

describe('User model', () => {
  const validAttrs = {
    email: 'test@example.com',
    passwordHash: '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12',
    role: 'compliance_officer' as const,
  };

  describe('creation', () => {
    it('creates a user with valid attributes', async () => {
      const user = await User.create(validAttrs);

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).toBe(validAttrs.passwordHash);
      expect(user.role).toBe('compliance_officer');
      expect(user.isVerified).toBe(false);
      expect(user.verificationToken ?? null).toBeNull();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('defaults role to compliance_officer', async () => {
      const user = await User.create({
        email: 'default@example.com',
        passwordHash: validAttrs.passwordHash,
        role: 'compliance_officer',
      });
      expect(user.role).toBe('compliance_officer');
    });

    it('defaults isVerified to false', async () => {
      const user = await User.create(validAttrs);
      expect(user.isVerified).toBe(false);
    });

    it('allows setting verificationToken', async () => {
      const user = await User.create({
        ...validAttrs,
        email: 'verify@example.com',
        verificationToken: 'abc-token-123',
      });
      expect(user.verificationToken).toBe('abc-token-123');
    });
  });

  describe('validation', () => {
    it('rejects invalid email format', async () => {
      await expect(User.create({ ...validAttrs, email: 'not-an-email' })).rejects.toThrow();
    });

    it('rejects null email', async () => {
      await expect(
        User.create({ ...validAttrs, email: null as unknown as string }),
      ).rejects.toThrow();
    });

    it('rejects null passwordHash', async () => {
      await expect(
        User.create({ ...validAttrs, passwordHash: null as unknown as string }),
      ).rejects.toThrow();
    });

    it('enforces unique email constraint', async () => {
      await User.create(validAttrs);
      await expect(
        User.create({ ...validAttrs, passwordHash: 'different-hash' }),
      ).rejects.toThrow();
    });
  });

  describe('roles', () => {
    it('accepts c_suite role', async () => {
      const user = await User.create({
        ...validAttrs,
        email: 'csuite@example.com',
        role: 'c_suite',
      });
      expect(user.role).toBe('c_suite');
    });

    it('accepts compliance_officer role', async () => {
      const user = await User.create({
        ...validAttrs,
        email: 'compliance@example.com',
        role: 'compliance_officer',
      });
      expect(user.role).toBe('compliance_officer');
    });

    it('accepts it_admin role', async () => {
      const user = await User.create({
        ...validAttrs,
        email: 'itadmin@example.com',
        role: 'it_admin',
      });
      expect(user.role).toBe('it_admin');
    });
  });

  describe('toSafeJSON', () => {
    it('excludes passwordHash from output', async () => {
      const user = await User.create(validAttrs);
      const safe = user.toSafeJSON();

      expect(safe).not.toHaveProperty('passwordHash');
      expect(safe).not.toHaveProperty('password_hash');
    });

    it('excludes verificationToken from output', async () => {
      const user = await User.create({
        ...validAttrs,
        email: 'safe@example.com',
        verificationToken: 'secret-token',
      });
      const safe = user.toSafeJSON();

      expect(safe).not.toHaveProperty('verificationToken');
      expect(safe).not.toHaveProperty('verification_token');
    });

    it('includes id, email, role, isVerified, createdAt, updatedAt', async () => {
      const user = await User.create(validAttrs);
      const safe = user.toSafeJSON();

      expect(safe).toHaveProperty('id');
      expect(safe).toHaveProperty('email', 'test@example.com');
      expect(safe).toHaveProperty('role', 'compliance_officer');
      expect(safe).toHaveProperty('isVerified', false);
      expect(safe).toHaveProperty('createdAt');
      expect(safe).toHaveProperty('updatedAt');
    });
  });
});
