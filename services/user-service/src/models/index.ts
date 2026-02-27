/**
 * Model registry and association setup.
 *
 * Import this module once (typically in index.ts) to ensure all models
 * are registered with Sequelize and associations are established.
 */
import { User } from './User';
import { ApiKey } from './ApiKey';
import { AuditLog } from './AuditLog';
import { UserPreference } from './UserPreference';
import { OnboardingProgress } from './OnboardingProgress';
import { ConsentRecord } from './ConsentRecord';

// ─────────────────────────────────────────────────────────
// Associations
// ─────────────────────────────────────────────────────────

// A user has many API keys
User.hasMany(ApiKey, { foreignKey: 'userId', as: 'apiKeys' });
ApiKey.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// A user has many audit log entries
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// A user has one set of preferences
User.hasOne(UserPreference, { foreignKey: 'userId', as: 'preferences' });
UserPreference.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// A user has one onboarding progress record
User.hasOne(OnboardingProgress, { foreignKey: 'userId', as: 'onboardingProgress' });
OnboardingProgress.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// A user has many consent records
User.hasMany(ConsentRecord, { foreignKey: 'userId', as: 'consentRecords' });
ConsentRecord.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export { User, ApiKey, AuditLog, UserPreference, OnboardingProgress, ConsentRecord };
