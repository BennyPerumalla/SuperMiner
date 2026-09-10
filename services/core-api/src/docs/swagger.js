// =============================================================
// Swagger / OpenAPI Configuration
// =============================================================
// swagger-jsdoc reads JSDoc annotations from route files and
// generates an OpenAPI 3.0 spec. swagger-ui-express serves
// the interactive Swagger UI at /api-docs.
//
// WHY SWAGGER:
// 1. The brief requires Swagger/Postman documentation as a Day 1 deliverable.
// 2. Interactive API testing without Postman setup.
// 3. Auto-generated from JSDoc = documentation stays in sync with code.
// 4. Mobile team can see exactly what the API expects/returns.
// =============================================================

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Koyla-Chain Compliance Ecosystem API',
      version: '1.0.0',
      description:
        'Backend API for coal mine safety compliance — SIH26024. ' +
        'Handles authentication, RBAC, CRUD operations, WatermelonDB ' +
        'offline-first synchronization, and PostGIS spatial queries.',
      contact: {
        name: 'Koyla-Chain Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from POST /api/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Validation failed' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/**.routes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
