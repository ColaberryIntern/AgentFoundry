import { sequelize } from '../config/database';
import { Report } from './Report';
import { ReportTemplate } from './ReportTemplate';
import { ScheduledReport } from './ScheduledReport';

// Associations
ReportTemplate.hasMany(ScheduledReport, {
  foreignKey: 'templateId',
  as: 'scheduledReports',
});

ScheduledReport.belongsTo(ReportTemplate, {
  foreignKey: 'templateId',
  as: 'template',
});

/**
 * Initialize all models and sync the database.
 * In test mode this creates in-memory SQLite tables.
 */
async function initModels(options?: { force?: boolean }): Promise<void> {
  await sequelize.sync(options);
}

export { sequelize, Report, ReportTemplate, ScheduledReport, initModels };
