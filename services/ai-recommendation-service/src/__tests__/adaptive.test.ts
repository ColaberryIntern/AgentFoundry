// Force test environment
process.env.NODE_ENV = 'test';

const JWT_SECRET = 'changeme';
process.env.JWT_SECRET = JWT_SECRET;

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize } from '../config/database';
import { UserInteraction } from '../models/UserInteraction';

function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const testUser = {
  userId: '550e8400-e29b-41d4-a716-446655440001',
  email: 'test@test.com',
  role: 'it_admin',
};

let token: string;

describe('Adaptive Preferences API', () => {
  beforeAll(async () => {
    require('../models');
    await sequelize.sync({ force: true });
    token = generateToken(testUser);
  });

  afterEach(async () => {
    await UserInteraction.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // =======================================================================
  // GET /api/adaptive/preferences/:userId
  // =======================================================================

  describe('GET /api/adaptive/preferences/:userId', () => {
    it('should return 200 with default preferences for a new user', async () => {
      const res = await request(app)
        .get('/api/adaptive/preferences/brand-new-user')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe('brand-new-user');
      expect(res.body.dashboardLayout).toEqual([
        'compliance_overview',
        'metrics_cards',
        'recent_activity',
        'compliance_trend',
        'ai_recommendations',
        'live_feed',
      ]);
      expect(res.body.preferredComplianceAreas).toEqual([]);
      expect(res.body.preferredReportTypes).toEqual([]);
      expect(res.body.topFeatures).toEqual([]);
      expect(res.body.activityLevel.total).toBe(0);
      expect(res.body.activityLevel.avgPerDay).toBe(0);
      expect(res.body.activityLevel.peakHour).toBeNull();
      expect(res.body.lastUpdated).toBeDefined();
    });

    it('should return 200 with computed preferences based on interactions', async () => {
      // Seed interactions
      await UserInteraction.bulkCreate([
        // Dashboard widget clicks
        {
          userId: testUser.userId,
          interactionType: 'dashboard_widget_click',
          target: 'ai_recommendations',
        },
        {
          userId: testUser.userId,
          interactionType: 'dashboard_widget_click',
          target: 'ai_recommendations',
        },
        {
          userId: testUser.userId,
          interactionType: 'dashboard_widget_click',
          target: 'compliance_trend',
        },
        // Searches with compliance area references
        {
          userId: testUser.userId,
          interactionType: 'search',
          target: 'GDPR data retention',
          metadata: { query: 'GDPR compliance status' },
        },
        {
          userId: testUser.userId,
          interactionType: 'search',
          target: 'HIPAA review',
          metadata: { query: 'HIPAA assessment' },
        },
        {
          userId: testUser.userId,
          interactionType: 'search',
          target: 'GDPR audit',
          metadata: { query: 'GDPR audit results' },
        },
        // Recommendation clicks
        {
          userId: testUser.userId,
          interactionType: 'recommendation_click',
          target: 'SOC2 gap analysis',
          metadata: { category: 'SOC2' },
        },
        // Report generations
        {
          userId: testUser.userId,
          interactionType: 'report_generate',
          target: 'compliance_summary',
        },
        {
          userId: testUser.userId,
          interactionType: 'report_generate',
          target: 'risk_assessment',
        },
        {
          userId: testUser.userId,
          interactionType: 'report_generate',
          target: 'compliance_summary',
        },
        // Feature uses
        {
          userId: testUser.userId,
          interactionType: 'feature_use',
          target: 'search',
        },
        {
          userId: testUser.userId,
          interactionType: 'feature_use',
          target: 'export',
        },
      ]);

      const res = await request(app)
        .get(`/api/adaptive/preferences/${testUser.userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(testUser.userId);

      // Dashboard layout — ai_recommendations should be first (2 clicks)
      expect(res.body.dashboardLayout[0]).toBe('ai_recommendations');
      expect(res.body.dashboardLayout[1]).toBe('compliance_trend');
      // Remaining defaults should follow
      expect(res.body.dashboardLayout).toContain('compliance_overview');
      expect(res.body.dashboardLayout).toContain('metrics_cards');

      // Preferred compliance areas
      expect(res.body.preferredComplianceAreas).toContain('GDPR');
      expect(res.body.preferredComplianceAreas).toContain('HIPAA');
      expect(res.body.preferredComplianceAreas).toContain('SOC2');
      // GDPR should be first (most mentions)
      expect(res.body.preferredComplianceAreas[0]).toBe('GDPR');

      // Preferred report types
      expect(res.body.preferredReportTypes).toContain('compliance_summary');
      expect(res.body.preferredReportTypes).toContain('risk_assessment');
      // compliance_summary should be first (2 generations)
      expect(res.body.preferredReportTypes[0]).toBe('compliance_summary');

      // Top features
      expect(res.body.topFeatures.length).toBeGreaterThan(0);
      expect(res.body.topFeatures[0]).toHaveProperty('name');
      expect(res.body.topFeatures[0]).toHaveProperty('score');
      expect(res.body.topFeatures[0].score).toBeLessThanOrEqual(1);
      expect(res.body.topFeatures[0].score).toBeGreaterThan(0);

      // Activity level
      expect(res.body.activityLevel.total).toBe(12);
      expect(res.body.activityLevel.avgPerDay).toBeGreaterThan(0);
      expect(typeof res.body.activityLevel.peakHour).toBe('number');

      expect(res.body.lastUpdated).toBeDefined();
    });

    it('should return only user-specific data, not data from other users', async () => {
      await UserInteraction.bulkCreate([
        {
          userId: testUser.userId,
          interactionType: 'page_view',
          target: 'dashboard',
        },
        {
          userId: 'other-user-id',
          interactionType: 'page_view',
          target: 'settings',
        },
      ]);

      const res = await request(app)
        .get(`/api/adaptive/preferences/${testUser.userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.activityLevel.total).toBe(1);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get(`/api/adaptive/preferences/${testUser.userId}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });
});
