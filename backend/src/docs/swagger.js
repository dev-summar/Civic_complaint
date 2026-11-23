const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../config');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Rabta JK API',
      version: '1.0.0',
      description:
        'Rabta JK (Rabta = Connection) — bridging citizens and government authorities in Jammu & Kashmir. Complaints, assignments, analytics, and role-based access.',
      contact: { name: 'Rabta JK', email: 'support@rabtajk.gov.in' },
    },
    servers: [{ url: `${config.apiUrl}/api/v1`, description: 'API v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {},
          },
        },
        Complaint: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            status: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            address: { type: 'string' },
            isAnonymous: { type: 'boolean' },
          },
        },
        User: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['citizen', 'officer', 'field_worker', 'admin'] },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/auth/signup': {
        post: {
          tags: ['Auth'],
          security: [],
          summary: 'Register citizen',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'phone', 'password'],
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                    phone: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Created' } },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          security: [],
          summary: 'Email/password login',
          responses: { 200: { description: 'OK' } },
        },
      },
      '/auth/phone-login': {
        post: {
          tags: ['Auth'],
          security: [],
          summary: 'Send OTP to phone',
          responses: { 200: { description: 'OTP sent' } },
        },
      },
      '/auth/verify-otp': {
        post: {
          tags: ['Auth'],
          security: [],
          summary: 'Verify OTP and login',
          responses: { 200: { description: 'OK' } },
        },
      },
      '/auth/refresh-token': {
        post: {
          tags: ['Auth'],
          security: [],
          summary: 'Refresh access token',
          responses: { 200: { description: 'OK' } },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Current user profile',
          responses: { 200: { description: 'OK' } },
        },
      },
      '/complaints': {
        get: {
          tags: ['Complaints'],
          summary: 'List/filter complaints',
          responses: { 200: { description: 'OK' } },
        },
        post: {
          tags: ['Complaints'],
          summary: 'Create complaint',
          responses: { 201: { description: 'Created' } },
        },
      },
      '/complaints/nearby': {
        get: {
          tags: ['Complaints'],
          summary: 'Nearby complaints (geospatial)',
          parameters: [
            { name: 'lat', in: 'query', schema: { type: 'number' } },
            { name: 'lng', in: 'query', schema: { type: 'number' } },
            { name: 'radius', in: 'query', schema: { type: 'number' }, description: 'meters' },
          ],
          responses: { 200: { description: 'OK' } },
        },
      },
      '/complaints/mine': {
        get: {
          tags: ['Complaints'],
          summary: 'My complaints',
          responses: { 200: { description: 'OK' } },
        },
      },
      '/complaints/{id}/assign': {
        post: {
          tags: ['Complaints'],
          summary: 'Assign officer/worker',
          responses: { 200: { description: 'OK' } },
        },
      },
      '/complaints/{id}/resolve': {
        post: {
          tags: ['Complaints'],
          summary: 'Resolve complaint',
          responses: { 200: { description: 'OK' } },
        },
      },
      '/dashboard': {
        get: {
          tags: ['Dashboard'],
          summary: 'Role-based dashboard stats',
          responses: { 200: { description: 'OK' } },
        },
      },
      '/analytics': {
        get: {
          tags: ['Analytics'],
          summary: 'Analytics overview',
          responses: { 200: { description: 'OK' } },
        },
      },
      '/ai/classify': {
        post: {
          tags: ['AI'],
          summary: 'Classify complaint category',
          responses: { 200: { description: 'OK' } },
        },
      },
      '/export/complaints/csv': {
        get: {
          tags: ['Export'],
          summary: 'Export complaints CSV',
          responses: { 200: { description: 'CSV file' } },
        },
      },
      '/export/complaints/excel': {
        get: {
          tags: ['Export'],
          summary: 'Export complaints Excel',
          responses: { 200: { description: 'XLSX file' } },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
