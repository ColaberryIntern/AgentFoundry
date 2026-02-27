/**
 * OpenAPI 3.0 specification for the Agent Foundry API Gateway.
 *
 * Covers all proxied microservice endpoints and gateway-native routes.
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Agent Foundry API',
    version: '1.0.0',
    description:
      'Unified API Gateway for Agent Foundry — proxies requests to User, Compliance, Reporting, AI Recommendation, and Notification microservices while providing search, analytics, and feedback capabilities.',
    contact: {
      name: 'Agent Foundry Team',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'User authentication and API key management' },
    { name: 'Users', description: 'User management endpoints' },
    { name: 'Compliance', description: 'Compliance records and regulations' },
    { name: 'Reports', description: 'Reporting service endpoints' },
    {
      name: 'AI Recommendations',
      description: 'AI-powered recommendations, inference, and adaptive preferences',
    },
    { name: 'Notifications', description: 'Notification delivery and management' },
    { name: 'Webhooks', description: 'Webhook registration and event delivery' },
    { name: 'Search', description: 'Unified search across services' },
    { name: 'Analytics', description: 'Engagement event tracking and statistics' },
    { name: 'Feedback', description: 'User feedback collection and statistics' },
    { name: 'Health', description: 'Health and liveness probes' },
  ],

  // ---------------------------------------------------------------------------
  // Security schemes
  // ---------------------------------------------------------------------------
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http' as const,
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from the authentication endpoint',
      },
      apiKeyAuth: {
        type: 'apiKey' as const,
        in: 'header' as const,
        name: 'X-API-Key',
        description: 'API key issued via the /api/keys endpoint',
      },
    },

    // -------------------------------------------------------------------------
    // Reusable schemas
    // -------------------------------------------------------------------------
    schemas: {
      // -- Generic --
      ErrorResponse: {
        type: 'object' as const,
        properties: {
          error: {
            type: 'object' as const,
            properties: {
              code: { type: 'string' as const, example: 'VALIDATION_ERROR' },
              message: { type: 'string' as const, example: 'Bad request' },
              details: { type: 'object' as const, nullable: true },
            },
            required: ['code', 'message'],
          },
        },
        required: ['error'],
      },

      PaginationParams: {
        type: 'object' as const,
        properties: {
          page: { type: 'integer' as const, minimum: 1, default: 1 },
          limit: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        },
      },

      // -- Users --
      User: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          email: { type: 'string' as const, format: 'email' },
          firstName: { type: 'string' as const },
          lastName: { type: 'string' as const },
          role: { type: 'string' as const, enum: ['user', 'manager', 'it_admin'] },
          isActive: { type: 'boolean' as const },
          createdAt: { type: 'string' as const, format: 'date-time' },
          updatedAt: { type: 'string' as const, format: 'date-time' },
        },
        required: ['id', 'email', 'role'],
      },

      LoginRequest: {
        type: 'object' as const,
        properties: {
          email: { type: 'string' as const, format: 'email' },
          password: { type: 'string' as const, minLength: 8 },
        },
        required: ['email', 'password'],
      },

      LoginResponse: {
        type: 'object' as const,
        properties: {
          token: { type: 'string' as const },
          user: { $ref: '#/components/schemas/User' },
        },
        required: ['token', 'user'],
      },

      // -- Roles --
      Role: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          name: { type: 'string' as const },
          permissions: {
            type: 'array' as const,
            items: { type: 'string' as const },
          },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
        required: ['id', 'name', 'permissions'],
      },

      // -- API Keys --
      ApiKey: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          name: { type: 'string' as const },
          prefix: { type: 'string' as const },
          tier: { type: 'string' as const, enum: ['free', 'standard', 'enterprise'] },
          isActive: { type: 'boolean' as const },
          expiresAt: { type: 'string' as const, format: 'date-time', nullable: true },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
        required: ['id', 'name', 'prefix'],
      },

      // -- Compliance --
      ComplianceRecord: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          title: { type: 'string' as const },
          description: { type: 'string' as const },
          status: {
            type: 'string' as const,
            enum: ['compliant', 'non_compliant', 'pending', 'review'],
          },
          regulationId: { type: 'string' as const },
          assignedTo: { type: 'string' as const, format: 'uuid' },
          dueDate: { type: 'string' as const, format: 'date-time' },
          createdAt: { type: 'string' as const, format: 'date-time' },
          updatedAt: { type: 'string' as const, format: 'date-time' },
        },
        required: ['id', 'title', 'status'],
      },

      Regulation: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          name: { type: 'string' as const },
          description: { type: 'string' as const },
          category: { type: 'string' as const },
          effectiveDate: { type: 'string' as const, format: 'date' },
          isActive: { type: 'boolean' as const },
        },
        required: ['id', 'name'],
      },

      // -- Reports --
      Report: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          title: { type: 'string' as const },
          type: { type: 'string' as const, enum: ['compliance', 'audit', 'risk', 'custom'] },
          status: { type: 'string' as const, enum: ['draft', 'generating', 'completed', 'failed'] },
          format: { type: 'string' as const, enum: ['pdf', 'csv', 'json'] },
          generatedBy: { type: 'string' as const, format: 'uuid' },
          createdAt: { type: 'string' as const, format: 'date-time' },
          completedAt: { type: 'string' as const, format: 'date-time', nullable: true },
        },
        required: ['id', 'title', 'type', 'status'],
      },

      // -- AI Recommendations --
      Recommendation: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          type: { type: 'string' as const },
          title: { type: 'string' as const },
          description: { type: 'string' as const },
          confidence: { type: 'number' as const, minimum: 0, maximum: 1 },
          priority: { type: 'string' as const, enum: ['low', 'medium', 'high', 'critical'] },
          status: { type: 'string' as const, enum: ['pending', 'accepted', 'dismissed'] },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
        required: ['id', 'type', 'title', 'confidence'],
      },

      InferenceRequest: {
        type: 'object' as const,
        properties: {
          modelId: { type: 'string' as const },
          input: { type: 'object' as const },
          parameters: { type: 'object' as const },
        },
        required: ['modelId', 'input'],
      },

      InferenceResponse: {
        type: 'object' as const,
        properties: {
          requestId: { type: 'string' as const, format: 'uuid' },
          modelId: { type: 'string' as const },
          output: { type: 'object' as const },
          confidence: { type: 'number' as const },
          latencyMs: { type: 'integer' as const },
        },
        required: ['requestId', 'modelId', 'output'],
      },

      AIModel: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const },
          name: { type: 'string' as const },
          version: { type: 'string' as const },
          type: { type: 'string' as const },
          status: { type: 'string' as const, enum: ['active', 'inactive', 'training'] },
          accuracy: { type: 'number' as const },
          lastTrainedAt: { type: 'string' as const, format: 'date-time' },
        },
        required: ['id', 'name', 'status'],
      },

      UserInteraction: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          userId: { type: 'string' as const, format: 'uuid' },
          type: { type: 'string' as const },
          entityId: { type: 'string' as const },
          entityType: { type: 'string' as const },
          metadata: { type: 'object' as const },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
        required: ['id', 'userId', 'type'],
      },

      AdaptivePreference: {
        type: 'object' as const,
        properties: {
          userId: { type: 'string' as const, format: 'uuid' },
          preferences: { type: 'object' as const },
          lastUpdated: { type: 'string' as const, format: 'date-time' },
        },
        required: ['userId', 'preferences'],
      },

      // -- Notifications --
      Notification: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          userId: { type: 'string' as const, format: 'uuid' },
          type: { type: 'string' as const, enum: ['info', 'warning', 'error', 'success'] },
          title: { type: 'string' as const },
          message: { type: 'string' as const },
          isRead: { type: 'boolean' as const },
          channel: { type: 'string' as const, enum: ['in_app', 'email', 'sms', 'push'] },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
        required: ['id', 'userId', 'type', 'title', 'message'],
      },

      // -- Webhooks --
      Webhook: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          url: { type: 'string' as const, format: 'uri' },
          events: {
            type: 'array' as const,
            items: { type: 'string' as const },
          },
          secret: { type: 'string' as const },
          isActive: { type: 'boolean' as const },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
        required: ['id', 'url', 'events'],
      },

      // -- Search --
      SearchResult: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const },
          type: { type: 'string' as const, enum: ['compliance', 'report'] },
          title: { type: 'string' as const },
          description: { type: 'string' as const },
          status: { type: 'string' as const },
          createdAt: { type: 'string' as const, format: 'date-time' },
          matchScore: { type: 'number' as const },
        },
        required: ['id', 'type', 'title', 'matchScore'],
      },

      SearchResponse: {
        type: 'object' as const,
        properties: {
          results: {
            type: 'array' as const,
            items: { $ref: '#/components/schemas/SearchResult' },
          },
          total: { type: 'integer' as const },
          page: { type: 'integer' as const },
          limit: { type: 'integer' as const },
          query: { type: 'string' as const },
        },
        required: ['results', 'total', 'page', 'limit', 'query'],
      },

      // -- Analytics --
      AnalyticsEvent: {
        type: 'object' as const,
        properties: {
          eventType: { type: 'string' as const },
          entityId: { type: 'string' as const },
          entityType: { type: 'string' as const },
          metadata: { type: 'object' as const },
          timestamp: { type: 'string' as const, format: 'date-time' },
        },
        required: ['eventType'],
      },

      EngagementStats: {
        type: 'object' as const,
        properties: {
          totalEvents: { type: 'integer' as const },
          uniqueUsers: { type: 'integer' as const },
          eventsByType: { type: 'object' as const },
          period: { type: 'string' as const },
        },
      },

      // -- Feedback --
      Feedback: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          userId: { type: 'string' as const, format: 'uuid' },
          category: { type: 'string' as const, enum: ['bug', 'feature', 'improvement', 'general'] },
          rating: { type: 'integer' as const, minimum: 1, maximum: 5 },
          comment: { type: 'string' as const },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
        required: ['id', 'userId', 'category', 'comment'],
      },

      FeedbackStats: {
        type: 'object' as const,
        properties: {
          total: { type: 'integer' as const },
          averageRating: { type: 'number' as const },
          byCategory: { type: 'object' as const },
        },
      },

      // -- Dashboard --
      DashboardData: {
        type: 'object' as const,
        properties: {
          complianceScore: { type: 'number' as const },
          totalRecords: { type: 'integer' as const },
          recentActivity: {
            type: 'array' as const,
            items: { type: 'object' as const },
          },
        },
      },

      // -- Dashboard Events (Notification Service) --
      DashboardEvent: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          type: { type: 'string' as const },
          message: { type: 'string' as const },
          severity: { type: 'string' as const, enum: ['info', 'warning', 'error'] },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
        required: ['id', 'type', 'message'],
      },
    },

    // -------------------------------------------------------------------------
    // Reusable parameters
    // -------------------------------------------------------------------------
    parameters: {
      pageParam: {
        name: 'page',
        in: 'query' as const,
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number for pagination',
      },
      limitParam: {
        name: 'limit',
        in: 'query' as const,
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page',
      },
      idParam: {
        name: 'id',
        in: 'path' as const,
        required: true,
        schema: { type: 'string' as const, format: 'uuid' },
        description: 'Resource UUID',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Default security
  // ---------------------------------------------------------------------------
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],

  // ---------------------------------------------------------------------------
  // Paths
  // ---------------------------------------------------------------------------
  paths: {
    // ===== Health =====
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the health status of the API Gateway.',
        security: [],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    status: { type: 'string' as const, example: 'ok' },
                    service: { type: 'string' as const, example: 'api-gateway' },
                    timestamp: { type: 'string' as const, format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ===== Authentication =====
    '/api/users/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate user',
        description: 'Authenticate with email and password to receive a JWT token.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    '/api/users/register': {
      post: {
        tags: ['Authentication', 'Users'],
        summary: 'Register a new user',
        description: 'Create a new user account.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  email: { type: 'string' as const, format: 'email' },
                  password: { type: 'string' as const, minLength: 8 },
                  firstName: { type: 'string' as const },
                  lastName: { type: 'string' as const },
                },
                required: ['email', 'password', 'firstName', 'lastName'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '409': {
            description: 'Email already registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    // ===== Users =====
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List users',
        description: 'Retrieve a paginated list of users. Requires admin role.',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          '200': {
            description: 'List of users',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    users: {
                      type: 'array' as const,
                      items: { $ref: '#/components/schemas/User' },
                    },
                    total: { type: 'integer' as const },
                    page: { type: 'integer' as const },
                    limit: { type: 'integer' as const },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        description: 'Retrieve a single user by their UUID.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          '200': {
            description: 'User details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update user',
        description: 'Update user details.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  firstName: { type: 'string' as const },
                  lastName: { type: 'string' as const },
                  role: { type: 'string' as const, enum: ['user', 'manager', 'it_admin'] },
                  isActive: { type: 'boolean' as const },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'User updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user',
        description: 'Delete a user account.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          '204': { description: 'User deleted' },
          '404': {
            description: 'User not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    // ===== Roles =====
    '/api/roles': {
      get: {
        tags: ['Authentication'],
        summary: 'List roles',
        description: 'Retrieve all available roles.',
        responses: {
          '200': {
            description: 'List of roles',
            content: {
              'application/json': {
                schema: {
                  type: 'array' as const,
                  items: { $ref: '#/components/schemas/Role' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Authentication'],
        summary: 'Create role',
        description: 'Create a new role with permissions.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  name: { type: 'string' as const },
                  permissions: { type: 'array' as const, items: { type: 'string' as const } },
                },
                required: ['name', 'permissions'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Role created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Role' } } },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    // ===== API Keys =====
    '/api/keys': {
      get: {
        tags: ['Authentication'],
        summary: 'List API keys',
        description: "Retrieve the authenticated user's API keys.",
        responses: {
          '200': {
            description: 'List of API keys',
            content: {
              'application/json': {
                schema: {
                  type: 'array' as const,
                  items: { $ref: '#/components/schemas/ApiKey' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Authentication'],
        summary: 'Create API key',
        description: 'Generate a new API key.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  name: { type: 'string' as const },
                  tier: { type: 'string' as const, enum: ['free', 'standard', 'enterprise'] },
                  expiresAt: { type: 'string' as const, format: 'date-time' },
                },
                required: ['name'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'API key created — the full key is only returned once',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    key: { type: 'string' as const, description: 'Full API key (shown once)' },
                    id: { type: 'string' as const, format: 'uuid' },
                    name: { type: 'string' as const },
                    prefix: { type: 'string' as const },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/keys/{id}': {
      delete: {
        tags: ['Authentication'],
        summary: 'Revoke API key',
        description: 'Revoke an API key by its ID.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          '204': { description: 'API key revoked' },
          '404': {
            description: 'API key not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    // ===== Compliance =====
    '/api/compliance': {
      get: {
        tags: ['Compliance'],
        summary: 'List compliance records',
        description: 'Retrieve a paginated list of compliance records.',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          {
            name: 'status',
            in: 'query' as const,
            schema: {
              type: 'string' as const,
              enum: ['compliant', 'non_compliant', 'pending', 'review'],
            },
            description: 'Filter by status',
          },
        ],
        responses: {
          '200': {
            description: 'List of compliance records',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    records: {
                      type: 'array' as const,
                      items: { $ref: '#/components/schemas/ComplianceRecord' },
                    },
                    total: { type: 'integer' as const },
                    page: { type: 'integer' as const },
                    limit: { type: 'integer' as const },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
      post: {
        tags: ['Compliance'],
        summary: 'Create compliance record',
        description: 'Create a new compliance record.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  title: { type: 'string' as const },
                  description: { type: 'string' as const },
                  regulationId: { type: 'string' as const },
                  status: {
                    type: 'string' as const,
                    enum: ['compliant', 'non_compliant', 'pending', 'review'],
                  },
                  dueDate: { type: 'string' as const, format: 'date-time' },
                },
                required: ['title', 'regulationId'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Compliance record created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ComplianceRecord' } },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    '/api/compliance/{id}': {
      get: {
        tags: ['Compliance'],
        summary: 'Get compliance record',
        description: 'Retrieve a single compliance record by ID.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          '200': {
            description: 'Compliance record details',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ComplianceRecord' } },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
      put: {
        tags: ['Compliance'],
        summary: 'Update compliance record',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ComplianceRecord' } },
          },
        },
        responses: {
          '200': {
            description: 'Updated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ComplianceRecord' } },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    // ===== Regulations =====
    '/api/compliance/regulations': {
      get: {
        tags: ['Compliance'],
        summary: 'List regulations',
        description: 'Retrieve all regulations.',
        responses: {
          '200': {
            description: 'List of regulations',
            content: {
              'application/json': {
                schema: {
                  type: 'array' as const,
                  items: { $ref: '#/components/schemas/Regulation' },
                },
              },
            },
          },
        },
      },
    },

    // ===== Dashboard (Compliance) =====
    '/api/dashboard': {
      get: {
        tags: ['Compliance'],
        summary: 'Get compliance dashboard',
        description: 'Retrieve compliance dashboard metrics and summaries.',
        responses: {
          '200': {
            description: 'Dashboard data',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DashboardData' } },
            },
          },
        },
      },
    },

    // ===== Reports =====
    '/api/reports': {
      get: {
        tags: ['Reports'],
        summary: 'List reports',
        description: 'Retrieve a paginated list of reports.',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          {
            name: 'type',
            in: 'query' as const,
            schema: { type: 'string' as const, enum: ['compliance', 'audit', 'risk', 'custom'] },
            description: 'Filter by report type',
          },
          {
            name: 'status',
            in: 'query' as const,
            schema: {
              type: 'string' as const,
              enum: ['draft', 'generating', 'completed', 'failed'],
            },
            description: 'Filter by status',
          },
        ],
        responses: {
          '200': {
            description: 'List of reports',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    reports: {
                      type: 'array' as const,
                      items: { $ref: '#/components/schemas/Report' },
                    },
                    total: { type: 'integer' as const },
                    page: { type: 'integer' as const },
                    limit: { type: 'integer' as const },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Reports'],
        summary: 'Generate a report',
        description: 'Queue a new report for generation.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  title: { type: 'string' as const },
                  type: {
                    type: 'string' as const,
                    enum: ['compliance', 'audit', 'risk', 'custom'],
                  },
                  format: { type: 'string' as const, enum: ['pdf', 'csv', 'json'] },
                  parameters: { type: 'object' as const },
                },
                required: ['title', 'type'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Report queued',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Report' } } },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    '/api/reports/{id}': {
      get: {
        tags: ['Reports'],
        summary: 'Get report by ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          '200': {
            description: 'Report details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Report' } } },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    // ===== AI Recommendations =====
    '/api/recommendations': {
      get: {
        tags: ['AI Recommendations'],
        summary: 'List recommendations',
        description: 'Retrieve AI-generated recommendations.',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          {
            name: 'priority',
            in: 'query' as const,
            schema: { type: 'string' as const, enum: ['low', 'medium', 'high', 'critical'] },
          },
        ],
        responses: {
          '200': {
            description: 'List of recommendations',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    recommendations: {
                      type: 'array' as const,
                      items: { $ref: '#/components/schemas/Recommendation' },
                    },
                    total: { type: 'integer' as const },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/recommendations/{id}': {
      get: {
        tags: ['AI Recommendations'],
        summary: 'Get recommendation by ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          '200': {
            description: 'Recommendation details',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Recommendation' } },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
      patch: {
        tags: ['AI Recommendations'],
        summary: 'Update recommendation status',
        description: 'Accept or dismiss a recommendation.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  status: { type: 'string' as const, enum: ['accepted', 'dismissed'] },
                },
                required: ['status'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Recommendation' } },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    // ===== Inference =====
    '/api/inference': {
      post: {
        tags: ['AI Recommendations'],
        summary: 'Run inference',
        description: 'Submit an inference request to an AI model.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/InferenceRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Inference result',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/InferenceResponse' } },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    // ===== AI Models =====
    '/api/models': {
      get: {
        tags: ['AI Recommendations'],
        summary: 'List AI models',
        description: 'Retrieve available AI models and their status.',
        responses: {
          '200': {
            description: 'List of AI models',
            content: {
              'application/json': {
                schema: { type: 'array' as const, items: { $ref: '#/components/schemas/AIModel' } },
              },
            },
          },
        },
      },
    },

    '/api/models/{id}': {
      get: {
        tags: ['AI Recommendations'],
        summary: 'Get AI model details',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          '200': {
            description: 'Model details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AIModel' } } },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    // ===== User Interactions =====
    '/api/interactions': {
      get: {
        tags: ['AI Recommendations'],
        summary: 'List user interactions',
        description: 'Retrieve tracked user interactions for recommendation training.',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          '200': {
            description: 'List of interactions',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    interactions: {
                      type: 'array' as const,
                      items: { $ref: '#/components/schemas/UserInteraction' },
                    },
                    total: { type: 'integer' as const },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['AI Recommendations'],
        summary: 'Record user interaction',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UserInteraction' } },
          },
        },
        responses: {
          '201': { description: 'Interaction recorded' },
        },
      },
    },

    // ===== Adaptive Preferences =====
    '/api/adaptive': {
      get: {
        tags: ['AI Recommendations'],
        summary: 'Get adaptive preferences',
        description: "Retrieve the authenticated user's adaptive preferences.",
        responses: {
          '200': {
            description: 'Adaptive preferences',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AdaptivePreference' } },
            },
          },
        },
      },
      put: {
        tags: ['AI Recommendations'],
        summary: 'Update adaptive preferences',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AdaptivePreference' } },
          },
        },
        responses: {
          '200': {
            description: 'Preferences updated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AdaptivePreference' } },
            },
          },
        },
      },
    },

    // ===== Notifications =====
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications',
        description: "Retrieve the authenticated user's notifications.",
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          {
            name: 'isRead',
            in: 'query' as const,
            schema: { type: 'boolean' as const },
            description: 'Filter by read status',
          },
        ],
        responses: {
          '200': {
            description: 'List of notifications',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    notifications: {
                      type: 'array' as const,
                      items: { $ref: '#/components/schemas/Notification' },
                    },
                    total: { type: 'integer' as const },
                    unread: { type: 'integer' as const },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Notifications'],
        summary: 'Send notification',
        description: 'Send a notification to a user.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  userId: { type: 'string' as const, format: 'uuid' },
                  type: { type: 'string' as const, enum: ['info', 'warning', 'error', 'success'] },
                  title: { type: 'string' as const },
                  message: { type: 'string' as const },
                  channel: { type: 'string' as const, enum: ['in_app', 'email', 'sms', 'push'] },
                },
                required: ['userId', 'type', 'title', 'message'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Notification sent',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Notification' } },
            },
          },
        },
      },
    },

    '/api/notifications/{id}': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark notification as read',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  isRead: { type: 'boolean' as const },
                },
                required: ['isRead'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Notification' } },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    // ===== Dashboard Events (Notification Service) =====
    '/api/dashboard-events': {
      get: {
        tags: ['Notifications'],
        summary: 'List dashboard events',
        description: 'Retrieve real-time dashboard events.',
        responses: {
          '200': {
            description: 'List of dashboard events',
            content: {
              'application/json': {
                schema: {
                  type: 'array' as const,
                  items: { $ref: '#/components/schemas/DashboardEvent' },
                },
              },
            },
          },
        },
      },
    },

    // ===== Webhooks =====
    '/api/webhooks': {
      get: {
        tags: ['Webhooks'],
        summary: 'List webhooks',
        description: 'Retrieve registered webhook endpoints.',
        responses: {
          '200': {
            description: 'List of webhooks',
            content: {
              'application/json': {
                schema: { type: 'array' as const, items: { $ref: '#/components/schemas/Webhook' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Register webhook',
        description: 'Register a new webhook endpoint.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  url: { type: 'string' as const, format: 'uri' },
                  events: { type: 'array' as const, items: { type: 'string' as const } },
                  secret: { type: 'string' as const },
                },
                required: ['url', 'events'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Webhook registered',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Webhook' } } },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    '/api/webhooks/{id}': {
      get: {
        tags: ['Webhooks'],
        summary: 'Get webhook by ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          '200': {
            description: 'Webhook details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Webhook' } } },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
      put: {
        tags: ['Webhooks'],
        summary: 'Update webhook',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Webhook' } } },
        },
        responses: {
          '200': {
            description: 'Webhook updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Webhook' } } },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
      delete: {
        tags: ['Webhooks'],
        summary: 'Delete webhook',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          '204': { description: 'Webhook deleted' },
          '404': {
            description: 'Not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    // ===== Search =====
    '/api/search': {
      get: {
        tags: ['Search'],
        summary: 'Search across services',
        description: 'Unified search across compliance records and reports.',
        parameters: [
          {
            name: 'q',
            in: 'query' as const,
            required: true,
            schema: { type: 'string' as const },
            description: 'Search query string',
          },
          {
            name: 'type',
            in: 'query' as const,
            schema: { type: 'string' as const, enum: ['compliance', 'reports'] },
            description: 'Filter by result type',
          },
          {
            name: 'status',
            in: 'query' as const,
            schema: { type: 'string' as const },
            description: 'Filter by status',
          },
          {
            name: 'dateFrom',
            in: 'query' as const,
            schema: { type: 'string' as const, format: 'date' },
            description: 'Filter results from this date',
          },
          {
            name: 'dateTo',
            in: 'query' as const,
            schema: { type: 'string' as const, format: 'date' },
            description: 'Filter results until this date',
          },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          '200': {
            description: 'Search results',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SearchResponse' } },
            },
          },
          '400': {
            description: 'Missing query parameter',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    '/api/search/suggestions': {
      get: {
        tags: ['Search'],
        summary: 'Search suggestions',
        description: 'Get autocomplete suggestions based on search history.',
        parameters: [
          {
            name: 'q',
            in: 'query' as const,
            required: true,
            schema: { type: 'string' as const, minLength: 2 },
            description: 'Partial query (min 2 characters)',
          },
        ],
        responses: {
          '200': {
            description: 'Suggestions',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    suggestions: { type: 'array' as const, items: { type: 'string' as const } },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Query too short',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    '/api/search/history': {
      get: {
        tags: ['Search'],
        summary: 'Search history',
        description: "Retrieve the authenticated user's search history.",
        responses: {
          '200': {
            description: 'Search history',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    history: {
                      type: 'array' as const,
                      items: {
                        type: 'object' as const,
                        properties: {
                          query: { type: 'string' as const },
                          resultCount: { type: 'integer' as const },
                          filters: { type: 'object' as const },
                          createdAt: { type: 'string' as const, format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    '/api/search/natural': {
      post: {
        tags: ['Search'],
        summary: 'Natural language search',
        description: 'Search using natural language. Classifies intent and extracts entities.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  query: { type: 'string' as const },
                },
                required: ['query'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'NL search results with interpretation',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    interpretation: { type: 'object' as const },
                    results: {
                      type: 'array' as const,
                      items: { $ref: '#/components/schemas/SearchResult' },
                    },
                    total: { type: 'integer' as const },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ===== Analytics =====
    '/api/analytics/event': {
      post: {
        tags: ['Analytics'],
        summary: 'Track event',
        description: 'Track a single engagement event.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AnalyticsEvent' } },
          },
        },
        responses: {
          '201': { description: 'Event tracked' },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    '/api/analytics/events': {
      post: {
        tags: ['Analytics'],
        summary: 'Track batch events',
        description: 'Track multiple engagement events in one request.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  events: {
                    type: 'array' as const,
                    items: { $ref: '#/components/schemas/AnalyticsEvent' },
                  },
                },
                required: ['events'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Events tracked' },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    '/api/analytics/stats': {
      get: {
        tags: ['Analytics'],
        summary: 'Engagement statistics',
        description: 'Retrieve engagement metrics. Requires IT Admin role.',
        parameters: [
          {
            name: 'period',
            in: 'query' as const,
            schema: { type: 'string' as const, enum: ['day', 'week', 'month'] },
            description: 'Aggregation period',
          },
        ],
        responses: {
          '200': {
            description: 'Engagement statistics',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/EngagementStats' } },
            },
          },
          '403': {
            description: 'Forbidden — admin only',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },

    '/api/analytics/users/{userId}/activity': {
      get: {
        tags: ['Analytics'],
        summary: 'User activity',
        description: "Retrieve a specific user's recent events.",
        parameters: [
          {
            name: 'userId',
            in: 'path' as const,
            required: true,
            schema: { type: 'string' as const, format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'User activity',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    events: {
                      type: 'array' as const,
                      items: { $ref: '#/components/schemas/AnalyticsEvent' },
                    },
                    total: { type: 'integer' as const },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ===== Feedback =====
    '/api/feedback': {
      post: {
        tags: ['Feedback'],
        summary: 'Submit feedback',
        description: 'Submit user feedback.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  category: {
                    type: 'string' as const,
                    enum: ['bug', 'feature', 'improvement', 'general'],
                  },
                  rating: { type: 'integer' as const, minimum: 1, maximum: 5 },
                  comment: { type: 'string' as const },
                },
                required: ['category', 'comment'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Feedback submitted',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Feedback' } } },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
      get: {
        tags: ['Feedback'],
        summary: 'List feedback',
        description: 'Retrieve paginated feedback. Requires IT Admin role.',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          {
            name: 'category',
            in: 'query' as const,
            schema: { type: 'string' as const, enum: ['bug', 'feature', 'improvement', 'general'] },
          },
        ],
        responses: {
          '200': {
            description: 'Feedback list',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    feedback: {
                      type: 'array' as const,
                      items: { $ref: '#/components/schemas/Feedback' },
                    },
                    total: { type: 'integer' as const },
                    page: { type: 'integer' as const },
                    limit: { type: 'integer' as const },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/feedback/stats': {
      get: {
        tags: ['Feedback'],
        summary: 'Feedback statistics',
        description: 'Retrieve feedback statistics. Requires IT Admin role.',
        responses: {
          '200': {
            description: 'Feedback statistics',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/FeedbackStats' } },
            },
          },
        },
      },
    },
  },
};
