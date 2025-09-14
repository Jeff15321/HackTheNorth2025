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

  // Content editing endpoints
  fastify.put('/api/projects/:project_id/characters/:id', {
    schema: {
      ...projectsSchema,
      summary: 'Update character metadata',
      params: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          id: { type: 'string', format: 'uuid' }
        },
        required: ['project_id', 'id']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          age: { type: 'number' },
          personality: { type: 'string' },
          description: { type: 'string' },
          backstory: { type: 'string' }
        }
      },
      response: {
        200: { type: 'object', properties: { success: { type: 'boolean' } } }
      }
    }
  }, async (request, reply) => {
    try {
      const { project_id, id } = request.params as { project_id: string; id: string };
      const updates = request.body as any;

      const db = getDatabase();
      const { data: character } = await db
        .from('characters')
        .select('*')
        .eq('id', id)
        .eq('project_id', project_id)
        .single();

      if (!character) {
        return reply.status(404).send({ error: 'Character not found' });
      }

      const updatedMetadata = { ...character.metadata, ...updates };

      const { error } = await db
        .from('characters')
        .update({ metadata: updatedMetadata })
        .eq('id', id);

      if (error) throw error;

      reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error('Error updating character:', error);
      reply.status(500).send({ error: error.message });
    }
  });

  fastify.put('/api/projects/:project_id/scenes/:id', {
    schema: {
      ...projectsSchema,
      summary: 'Update scene metadata',
      params: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          id: { type: 'string', format: 'uuid' }
        },
        required: ['project_id', 'id']
      },
      body: {
        type: 'object',
        properties: {
          detailed_plot: { type: 'string' },
          concise_plot: { type: 'string' },
          dialogue: { type: 'string' },
          scene_order: { type: 'number' }
        }
      },
      response: {
        200: { type: 'object', properties: { success: { type: 'boolean' } } }
      }
    }
  }, async (request, reply) => {
    try {
      const { project_id, id } = request.params as { project_id: string; id: string };
      const updates = request.body as any;

      const db = getDatabase();
      const { data: scene } = await db
        .from('scenes')
        .select('*')
        .eq('id', id)
        .eq('project_id', project_id)
        .single();

      if (!scene) {
        return reply.status(404).send({ error: 'Scene not found' });
      }

      const updatedMetadata = { ...scene.metadata, ...updates };

      const { error } = await db
        .from('scenes')
        .update({ metadata: updatedMetadata })
        .eq('id', id);

      if (error) throw error;

      reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error('Error updating scene:', error);
      reply.status(500).send({ error: error.message });
    }
  });

  fastify.put('/api/projects/:project_id/objects/:id', {
    schema: {
      ...projectsSchema,
      summary: 'Update object metadata',
      params: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          id: { type: 'string', format: 'uuid' }
        },
        required: ['project_id', 'id']
      },
      body: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          environmental_context: { type: 'string' },
          description: { type: 'string' }
        }
      },
      response: {
        200: { type: 'object', properties: { success: { type: 'boolean' } } }
      }
    }
  }, async (request, reply) => {
    try {
      const { project_id, id } = request.params as { project_id: string; id: string };
      const updates = request.body as any;

      const db = getDatabase();
      const { data: object } = await db
        .from('objects')
        .select('*')
        .eq('id', id)
        .eq('project_id', project_id)
        .single();

      if (!object) {
        return reply.status(404).send({ error: 'Object not found' });
      }

      const updatedMetadata = { ...object.metadata, ...updates };

      const { error } = await db
        .from('objects')
        .update({ metadata: updatedMetadata })
        .eq('id', id);

      if (error) throw error;

      reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error('Error updating object:', error);
      reply.status(500).send({ error: error.message });
    }
  });

  fastify.put('/api/projects/:project_id/frames/:id', {
    schema: {
      ...projectsSchema,
      summary: 'Update frame metadata',
      params: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          id: { type: 'string', format: 'uuid' }
        },
        required: ['project_id', 'id']
      },
      body: {
        type: 'object',
        properties: {
          veo3_prompt: { type: 'string' },
          dialogue: { type: 'string' },
          summary: { type: 'string' },
          split_reason: { type: 'string' }
        }
      },
      response: {
        200: { type: 'object', properties: { success: { type: 'boolean' } } }
      }
    }
  }, async (request, reply) => {
    try {
      const { project_id, id } = request.params as { project_id: string; id: string };
      const updates = request.body as any;

      const db = getDatabase();
      const { data: frame } = await db
        .from('frames')
        .select('*')
        .eq('id', id)
        .eq('project_id', project_id)
        .single();

      if (!frame) {
        return reply.status(404).send({ error: 'Frame not found' });
      }

      const updatedMetadata = { ...frame.metadata, ...updates };

      const { error } = await db
        .from('frames')
        .update({ metadata: updatedMetadata })
        .eq('id', id);

      if (error) throw error;

      reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error('Error updating frame:', error);
      reply.status(500).send({ error: error.message });
    }
  });

  // GET endpoints for content retrieval
  fastify.get('/api/projects/:id/characters', {
    schema: {
      ...projectsSchema,
      summary: 'Get all characters for a project',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const db = getDatabase();

      const { data: characters, error } = await db
        .from('characters')
        .select('*')
        .eq('project_id', id);

      if (error) throw error;

      reply.send(characters || []);
    } catch (error: any) {
      fastify.log.error('Error fetching characters:', error);
      reply.status(500).send({ error: error.message });
    }
  });

  fastify.get('/api/projects/:id/scenes', {
    schema: {
      ...projectsSchema,
      summary: 'Get all scenes for a project',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const db = getDatabase();

      const { data: scenes, error } = await db
        .from('scenes')
        .select('*')
        .eq('project_id', id);

      if (error) throw error;

      reply.send(scenes || []);
    } catch (error: any) {
      fastify.log.error('Error fetching scenes:', error);
      reply.status(500).send({ error: error.message });
    }
  });

  fastify.get('/api/projects/:id/complete', {
    schema: {
      ...projectsSchema,
      summary: 'Get complete project status with all content',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const db = getDatabase();

      const [
        { data: scenes },
        { data: characters },
        { data: objects },
        { data: frames }
      ] = await Promise.all([
        db.from('scenes').select('*').eq('project_id', id),
        db.from('characters').select('*').eq('project_id', id),
        db.from('objects').select('*').eq('project_id', id),
        db.from('frames').select('*').eq('project_id', id)
      ]);

      // Check completion status
      const hasCharacters = characters && characters.length > 0;
      const hasScenes = scenes && scenes.length > 0;
      const hasFrames = frames && frames.length > 0;
      const allVideosGenerated = frames?.every(frame => frame.video_url) || false;

      let completion_status = 'initializing';
      if (hasCharacters && !hasScenes) completion_status = 'scripting';
      else if (hasScenes && !allVideosGenerated) completion_status = 'generating';
      else if (allVideosGenerated) completion_status = 'ready';

      reply.send({
        scenes: scenes || [],
        characters: characters || [],
        objects: objects || [],
        frames: frames || [],
        completion_status
      });
    } catch (error: any) {
      fastify.log.error('Error fetching complete project:', error);
      reply.status(500).send({ error: error.message });
    }
  });

  fastify.post('/api/projects/:id/confirm-video', {
    schema: {
      ...projectsSchema,
      summary: 'Confirm final video assembly',
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
          confirmed: { type: 'boolean' }
        },
        required: ['confirmed']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { confirmed } = request.body as { confirmed: boolean };

      if (!confirmed) {
        return reply.status(400).send({ error: 'Video confirmation required' });
      }

      // Here you would trigger video stitching job
      const jobData = {
        id: crypto.randomUUID(),
        project_id: id,
        type: 'video-stitching' as const,
        status: 'pending' as const,
        progress: 0,
        input_data: { project_id: id },
        output_data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { addJob } = await import('../utils/queue.js');
      await addJob('video-stitching', jobData);

      reply.send({
        message: 'Video assembly started',
        job_id: jobData.id
      });
    } catch (error: any) {
      fastify.log.error('Error confirming video:', error);
      reply.status(500).send({ error: error.message });
    }
  });
}