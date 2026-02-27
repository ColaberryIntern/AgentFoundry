import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  getPermissionsForRole,
  Permission,
} from '../config/permissions';

describe('Permissions configuration', () => {
  describe('PERMISSIONS constant', () => {
    it('defines all expected permission strings', () => {
      expect(PERMISSIONS.VIEW_DASHBOARD).toBe('view_dashboard');
      expect(PERMISSIONS.GENERATE_REPORTS).toBe('generate_reports');
      expect(PERMISSIONS.CREATE_STACKS).toBe('create_stacks');
      expect(PERMISSIONS.MONITOR_ALERTS).toBe('monitor_alerts');
      expect(PERMISSIONS.DEPLOY_AGENTS).toBe('deploy_agents');
      expect(PERMISSIONS.CONFIGURE_SETTINGS).toBe('configure_settings');
      expect(PERMISSIONS.MANAGE_USERS).toBe('manage_users');
      expect(PERMISSIONS.MANAGE_API_KEYS).toBe('manage_api_keys');
      expect(PERMISSIONS.VIEW_AUDIT_LOGS).toBe('view_audit_logs');
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('c_suite has only view_dashboard and generate_reports', () => {
      expect(ROLE_PERMISSIONS.c_suite).toEqual(
        expect.arrayContaining(['view_dashboard', 'generate_reports']),
      );
      expect(ROLE_PERMISSIONS.c_suite).toHaveLength(2);
    });

    it('c_suite does NOT have manage_users', () => {
      expect(ROLE_PERMISSIONS.c_suite).not.toContain('manage_users');
    });

    it('compliance_officer has view_dashboard, generate_reports, create_stacks, monitor_alerts', () => {
      expect(ROLE_PERMISSIONS.compliance_officer).toEqual(
        expect.arrayContaining([
          'view_dashboard',
          'generate_reports',
          'create_stacks',
          'monitor_alerts',
        ]),
      );
      expect(ROLE_PERMISSIONS.compliance_officer).toHaveLength(4);
    });

    it('it_admin has all admin-level permissions', () => {
      const expected = [
        'view_dashboard',
        'generate_reports',
        'deploy_agents',
        'configure_settings',
        'manage_users',
        'manage_api_keys',
        'view_audit_logs',
      ];
      expect(ROLE_PERMISSIONS.it_admin).toEqual(expect.arrayContaining(expected));
      expect(ROLE_PERMISSIONS.it_admin).toHaveLength(expected.length);
    });
  });

  describe('hasPermission', () => {
    it('returns true for a valid role-permission pair', () => {
      expect(hasPermission('c_suite', 'view_dashboard')).toBe(true);
      expect(hasPermission('it_admin', 'manage_users')).toBe(true);
      expect(hasPermission('compliance_officer', 'monitor_alerts')).toBe(true);
    });

    it('returns false for an invalid role-permission pair', () => {
      expect(hasPermission('c_suite', 'manage_users')).toBe(false);
      expect(hasPermission('compliance_officer', 'deploy_agents')).toBe(false);
    });

    it('returns false for an unknown role', () => {
      expect(hasPermission('nonexistent_role', 'view_dashboard')).toBe(false);
    });

    it('returns false for an unknown permission on a valid role', () => {
      expect(hasPermission('it_admin', 'nonexistent_permission' as Permission)).toBe(false);
    });
  });

  describe('getPermissionsForRole', () => {
    it('returns correct array for c_suite', () => {
      expect(getPermissionsForRole('c_suite')).toEqual(['view_dashboard', 'generate_reports']);
    });

    it('returns correct array for compliance_officer', () => {
      expect(getPermissionsForRole('compliance_officer')).toEqual([
        'view_dashboard',
        'generate_reports',
        'create_stacks',
        'monitor_alerts',
      ]);
    });

    it('returns correct array for it_admin', () => {
      expect(getPermissionsForRole('it_admin')).toEqual([
        'view_dashboard',
        'generate_reports',
        'deploy_agents',
        'configure_settings',
        'manage_users',
        'manage_api_keys',
        'view_audit_logs',
      ]);
    });

    it('returns empty array for unknown role', () => {
      expect(getPermissionsForRole('nonexistent_role')).toEqual([]);
    });
  });
});
