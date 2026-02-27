/**
 * Static permissions configuration for the RBAC system.
 *
 * Roles are already defined as ENUM on the User model ('c_suite',
 * 'compliance_officer', 'it_admin'). This module maps each role
 * to its allowed permissions without requiring a database table.
 */

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  GENERATE_REPORTS: 'generate_reports',
  CREATE_STACKS: 'create_stacks',
  MONITOR_ALERTS: 'monitor_alerts',
  DEPLOY_AGENTS: 'deploy_agents',
  CONFIGURE_SETTINGS: 'configure_settings',
  MANAGE_USERS: 'manage_users',
  MANAGE_API_KEYS: 'manage_api_keys',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  c_suite: ['view_dashboard', 'generate_reports'],
  compliance_officer: ['view_dashboard', 'generate_reports', 'create_stacks', 'monitor_alerts'],
  it_admin: [
    'view_dashboard',
    'generate_reports',
    'deploy_agents',
    'configure_settings',
    'manage_users',
    'manage_api_keys',
    'view_audit_logs',
  ],
};

/**
 * Checks whether a given role has a specific permission.
 *
 * @param role  - The user role string (e.g. 'c_suite', 'it_admin').
 * @param permission - The permission to check.
 * @returns true if the role has the permission, false otherwise.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return false;
  }
  return permissions.includes(permission);
}

/**
 * Returns the full list of permissions granted to a role.
 *
 * @param role - The user role string.
 * @returns An array of permissions, or an empty array for unknown roles.
 */
export function getPermissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
