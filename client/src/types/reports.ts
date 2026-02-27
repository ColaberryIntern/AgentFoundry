export interface ReportSection {
  type: 'summary' | 'chart' | 'table' | 'text';
  title: string;
  chartType?: 'bar' | 'line' | 'pie';
  columns?: string[];
}

export interface ReportTemplate {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  reportType: string;
  defaultParameters: Record<string, unknown> | null;
  sections: ReportSection[] | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledReport {
  id: string;
  userId: string;
  reportType: string;
  templateId: string | null;
  parameters: Record<string, unknown> | null;
  format: 'pdf' | 'csv';
  schedule: string;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  reportType: string;
  defaultParameters?: Record<string, unknown>;
  sections?: ReportSection[];
  isPublic?: boolean;
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string;
  reportType?: string;
  defaultParameters?: Record<string, unknown>;
  sections?: ReportSection[];
  isPublic?: boolean;
}

export interface CreateSchedulePayload {
  reportType: string;
  templateId?: string;
  parameters?: Record<string, unknown>;
  format: 'pdf' | 'csv';
  schedule: string;
  isActive?: boolean;
}

export interface UpdateSchedulePayload {
  reportType?: string;
  templateId?: string;
  parameters?: Record<string, unknown>;
  format?: 'pdf' | 'csv';
  schedule?: string;
  isActive?: boolean;
}

export interface TemplatesListResponse {
  templates: ReportTemplate[];
  total: number;
  page: number;
  limit: number;
}

export interface SchedulesListResponse {
  schedules: ScheduledReport[];
  total: number;
  page: number;
  limit: number;
}

export interface MetricsUpdate {
  complianceRate: number;
  openIssues: number;
  alertsCount: number;
  timestamp: string;
}

export interface ActivityUpdate {
  id: string;
  type: string;
  status: string;
  description: string;
  timestamp: string;
}
