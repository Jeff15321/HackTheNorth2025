import type { FastifyInstance } from 'fastify';
import { CreateProjectSchema } from '../models/schemas.js';
import { createProject, getProject, updateProject, getDatabase } from '../utils/database.js';

export async function projectRoutes(fastify: FastifyInstance) {
  const projectsSchema = {
    tags: ['Projects']
  };

  fastify.post('/api/projects', {
    schema: {
      ...projectsSchema,
      summary: 'Create new project',
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          summary: { type: 'string' },
          plot: { type: 'string' }
        },
        required: ['title', 'summary']
      },
      response: {
        201: {
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
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const projectData = CreateProjectSchema.parse(request.body);
      const project = await createProject(projectData);

      reply.status(201).send(project);
    } catch (error: any) {
      fastify.log.error('Error creating project:', error);
      reply.status(400).send({
        error: 'Bad Request',
        message: error.message || 'Invalid project data',
        statusCode: 400
      });
    }
  });

  fastify.get('/api/projects/:id', {
    schema: {
      ...projectsSchema,
      summary: 'Get project by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            summary: { type: 'string' },
            plot: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            context: {
              type: 'object',
              additionalProperties: true
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const project = await getProject(id);

      if (!project) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Project with ID ${id} not found`,
          statusCode: 404
        });
      }

      // Get characters from database, not Redis
      const db = getDatabase();
      const { data: characters, error: charError } = await db
        .from('characters')
        .select('*')
        .eq('project_id', id);

      if (charError) {
        console.error('📁 [PROJECT] Error fetching characters:', charError);
      }

      console.log('📁 [PROJECT] Retrieved data for project:', id, {
        hasProject: !!project,
        hasPlot: !!project.plot,
        characterCount: characters?.length || 0
      });

      // Format the context for the API response - use database data
      const formattedContext = {
        plot: project.plot || '',
        characters: (characters || []).map((char: any) => ({
          name: char.metadata?.name || '',
          description: char.metadata?.description || '',
          role: char.metadata?.role || 'supporting',
          age: char.metadata?.age || 30,
          personality: char.metadata?.personality || '',
          backstory: char.metadata?.backstory || ''
        })),
        next_step: 'Character generation',
        session_state: 'completed'
      };

      reply.send({
        ...project,
        context: formattedContext
      });
    } catch (error: any) {
      fastify.log.error('Error fetching project:', error);
      reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
      return reply.raw.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message || 'Failed to fetch project',
        statusCode: 500
      }));
    }
  });

  fastify.patch('/api/projects/:id', {
    schema: {
      ...projectsSchema,
      summary: 'Update project',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          plot: { type: 'string' }
        }
      },
      response: {
        200: {
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
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updates = request.body as any;

      const existingProject = await getProject(id);
      if (!existingProject) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Project with ID ${id} not found`,
          statusCode: 404
        });
      }

      const updatedProject = await updateProject(id, updates);
      reply.send(updatedProject);
    } catch (error: any) {
      fastify.log.error('Error updating project:', error);
      reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
      return reply.raw.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message || 'Failed to update project',
        statusCode: 500
      }));
    }
  });
}