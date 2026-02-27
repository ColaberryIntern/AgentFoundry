import api from './api';

export interface DashboardData {
  complianceRate: number;
  openIssues: number;
  alertsCount: number;
  recentUpdates: ComplianceRecord[];
  trend: TrendPoint[];
}

export interface ComplianceRecord {
  id: number;
  userId: number;
  complianceType: string;
  status: 'compliant' | 'non_compliant' | 'pending' | 'review';
  regulationId: string | null;
  dataSource: string | null;
  lastChecked: string | null;
  details: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrendPoint {
  date: string;
  rate: number;
}

export interface ComplianceSummary {
  complianceRate: number;
  totalRecords: number;
  byStatus: Record<string, number>;
  byType: Record<string, Record<string, number>>;
  recentUpdates: ComplianceRecord[];
}

export const dashboardApi = {
  getDashboard: () => api.get<{ dashboard: DashboardData }>('/dashboard'),
  getComplianceSummary: () => api.get<{ summary: ComplianceSummary }>('/compliance/summary'),
  createMonitor: (data: {
    regulation_id: string;
    data_source: string;
    threshold?: number;
    compliance_type: string;
  }) => api.post<ComplianceRecord>('/compliance/monitor', data),
};
