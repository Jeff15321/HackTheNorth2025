import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';

export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname'
        }
      }
    },
    bodyLimit: 50 * 1024 * 1024
  });

  await server.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
  });

  await server.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024
    }
  });

  await server.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'AI Film Studio API',
        description: 'Backend API for AI-powered film production',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'http://localhost:5000',
          description: 'Development server'
        }
      ],
      components: {
        schemas: {
          Project: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              summary: { type: 'string' },
              plot: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' }
            }
          },
          Job: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              project_id: { type: 'string', format: 'uuid' },
              type: {
                type: 'string',
                enum: ['character-generation', 'scene-generation', 'frame-generation', 'video-generation', 'video-stitching', 'script-generation', 'image-editing']
              },
              status: {
                type: 'string',
                enum: ['pending', 'processing', 'completed', 'failed']
              },
              progress: { type: 'number', minimum: 0, maximum: 100 },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' }
            }
          },
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
              statusCode: { type: 'number' }
            }
          }
        }
      },
      tags: [
        { name: 'Projects', description: 'Project management endpoints' },
        { name: 'Jobs', description: 'Background job management' },
        { name: 'Director', description: 'AI director agent' },
        { name: 'Assets', description: 'File and media management' }
      ]
    }
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject) => {
      return swaggerObject;
    }
  });


  server.get('/', async () => {
    return {
      name: 'AI Film Studio Backend',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      docs: '/docs',
      health: '/health'
    };
  });

  server.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };
  });

  server.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;

    server.log.error({
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method
    });

    reply.status(statusCode).send({
      error: error.name,
      message: error.message,
      statusCode,
      timestamp: new Date().toISOString()
    });
  });

  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
      timestamp: new Date().toISOString()
    });
  });

  return server;
}