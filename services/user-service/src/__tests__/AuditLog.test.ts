import { sequelize } from '../config/database';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';

// Force test environment
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

afterEach(async () => {
  await AuditLog.destroy({ where: {}, truncate: true });
  await User.destroy({ where: {}, truncate: true });
});

describe('AuditLog model', () => {
  const validUserAttrs = {
    email: 'audit-user@example.com',
    passwordHash: '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12',
    role: 'it_admin' as const,
  };

  describe('creation', () => {
    it('creates an audit log entry with all fields', async () => {
      const user = await User.create(validUserAttrs);

      const log = await AuditLog.create({
        userId: user.id,
        action: 'user.register',
        resource: 'user',
        resourceId: String(user.id),
        details: { email: 'audit-user@example.com', role: 'it_admin' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      });

      expect(log.id).toBeDefined();
      expect(log.userId).toBe(user.id);
      expect(log.action).toBe('user.register');
      expect(log.resource).toBe('user');
      expect(log.resourceId).toBe(String(user.id));
      expect(log.ipAddress).toBe('192.168.1.1');
      expect(log.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      expect(log.createdAt).toBeInstanceOf(Date);
    });

    it('verifies all fields are stored and retrievable correctly', async () => {
      const user = await User.create(validUserAttrs);
      const details = { oldRole: 'compliance_officer', newRole: 'it_admin' };

      await AuditLog.create({
        userId: user.id,
        action: 'role.assign',
        resource: 'user',
        resourceId: '42',
        details,
        ipAddress: '10.0.0.1',
        userAgent: 'TestAgent/1.0',
      });

      const found = await AuditLog.findOne({ where: { action: 'role.assign' } });
      expect(found).not.toBeNull();
      expect(found!.action).toBe('role.assign');
      expect(found!.resource).toBe('user');
      expect(found!.resourceId).toBe('42');
      expect(found!.details).toEqual(details);
      expect(found!.ipAddress).toBe('10.0.0.1');
      expect(found!.userAgent).toBe('TestAgent/1.0');
    });
  });

  describe('nullable userId (system actions)', () => {
    it('allows null userId for system-generated actions', async () => {
      const log = await AuditLog.create({
        userId: null,
        action: 'system.startup',
        resource: 'system',
        details: { version: '1.0.0' },
      });

      expect(log.id).toBeDefined();
      expect(log.userId).toBeNull();
      expect(log.action).toBe('system.startup');
      expect(log.resource).toBe('system');
    });
  });

  describe('JSON details field', () => {
    it('stores and retrieves complex JSON details', async () => {
      const complexDetails = {
        changes: [
          { field: 'role', from: 'c_suite', to: 'it_admin' },
          { field: 'isVerified', from: false, to: true },
        ],
        metadata: { triggeredBy: 'admin-action' },
      };

      const log = await AuditLog.create({
        userId: null,
        action: 'user.update',
        resource: 'user',
        resourceId: '99',
        details: complexDetails,
      });

      const found = await AuditLog.findByPk(log.id);
      expect(found!.details).toEqual(complexDetails);
    });

    it('allows null details', async () => {
      const log = await AuditLog.create({
        userId: null,
        action: 'user.login',
        resource: 'session',
      });

      expect(log.details ?? null).toBeNull();
    });
  });
});
