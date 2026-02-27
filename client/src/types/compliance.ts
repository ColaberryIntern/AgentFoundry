export type CalendarEventType = 'deadline' | 'audit' | 'regulatory_change' | 'review' | 'training';
export type CalendarEventStatus =
  | 'upcoming'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelled';
export type CalendarEventPriority = 'low' | 'medium' | 'high' | 'critical';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  eventType: CalendarEventType;
  date: string;
  endDate: string | null;
  status: CalendarEventStatus;
  priority: CalendarEventPriority;
  regulationId: string | null;
  metadata: Record<string, unknown> | null;
  reminderDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventCreateInput {
  title: string;
  description?: string;
  eventType: CalendarEventType;
  date: string;
  endDate?: string;
  status?: CalendarEventStatus;
  priority?: CalendarEventPriority;
  regulationId?: string;
  metadata?: Record<string, unknown>;
  reminderDays?: number;
}

export interface CalendarEventUpdateInput {
  title?: string;
  description?: string;
  eventType?: CalendarEventType;
  date?: string;
  endDate?: string;
  status?: CalendarEventStatus;
  priority?: CalendarEventPriority;
  regulationId?: string;
  metadata?: Record<string, unknown>;
  reminderDays?: number;
}

export interface CalendarEventsResponse {
  events: CalendarEvent[];
  total: number;
  page: number;
  limit: number;
}

export interface UpcomingDeadlinesResponse {
  events: CalendarEvent[];
  total: number;
}

export interface CalendarEventResponse {
  event: CalendarEvent;
}

export interface MarketSignal {
  date: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  industry: string;
}

export interface MarketSignalsResponse {
  signals: MarketSignal[];
  industry: string;
  analyzedAt: string;
}

export interface TaxonomyCategory {
  id: string;
  name: string;
  description: string;
  similarity: number;
  parentCategory?: string;
  regulations: string[];
}

export interface TaxonomyClassificationResponse {
  categories: TaxonomyCategory[];
  classifiedAt: string;
}

export interface RiskAnalysisResult {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  likelihood: number;
  impact: number;
  riskScore: number;
  category: string;
  regulation?: string;
  suggestedAction?: string;
}

export interface CalendarListParams {
  userId?: string;
  eventType?: CalendarEventType;
  dateFrom?: string;
  dateTo?: string;
  status?: CalendarEventStatus;
  page?: number;
  limit?: number;
}
