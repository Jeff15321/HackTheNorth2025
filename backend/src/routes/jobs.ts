import type { FastifyInstance } from 'fastify';
import { addJob, getJobStatus, cancelJob, getQueueInfo } from '../utils/queue.js';

export async function jobRoutes(fastify: FastifyInstance) {
  const jobsSchema = {
    tags: ['Jobs']
  };

  fastify.post('/api/jobs/object-generation', {
    schema: {
      ...jobsSchema,
      summary: 'Create object generation job',
      body: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          prompt: { type: 'string' },
          object_type: { type: 'string' },
          environmental_context: { type: 'string' },
          context: { type: 'object' }
        },
        required: ['project_id', 'prompt', 'object_type']
      },
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } }
      }
    }
  }, async (request, reply) => {
    const { project_id, prompt, object_type, environmental_context } = request.body as any;

    const jobData = {
      id: crypto.randomUUID(),
      project_id,
      type: 'object-generation' as const,
      status: 'pending' as const,
      progress: 0,
      input_data: {
        prompt,
        type: 'objects',
        width: 1024,
        height: 1024,
        metadata: {
          type: object_type,
          environmental_context: environmental_context || 'General environment'
        }
      },
      output_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await addJob('object-generation', jobData);

    reply.status(201).send({ job_id: jobData.id });
  });

  fastify.post('/api/jobs/character-generation', {
    schema: {
      ...jobsSchema,
      summary: 'Create character generation job',
      body: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          prompt: { type: 'string' },
          name: { type: 'string' },
          context: { type: 'object' }
        },
        required: ['project_id', 'prompt']
      },
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } }
      }
    }
  }, async (request, reply) => {
    const { project_id, prompt, name } = request.body as any;

    const jobData = {
      id: crypto.randomUUID(),
      project_id,
      type: 'character-generation' as const,
      status: 'pending' as const,
      progress: 0,
      input_data: {
        prompt,
        type: 'characters',
        width: 1024,
        height: 1024,
        metadata: { name }
      },
      output_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await addJob('character-generation', jobData);

    reply.status(201).send({ job_id: jobData.id });
  });

  fastify.post('/api/jobs/scene-generation', {
    schema: {
      ...jobsSchema,
      summary: 'Create scene generation job',
      body: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          scene_description: { type: 'string' },
          characters_context: { type: 'string' },
          plot_context: { type: 'string' }
        },
        required: ['project_id', 'scene_description']
      },
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } }
      }
    }
  }, async (request, reply) => {
    const { project_id, scene_description, characters_context, plot_context } = request.body as any;

    const jobData = {
      id: crypto.randomUUID(),
      project_id,
      type: 'scene-generation' as const,
      status: 'pending' as const,
      progress: 0,
      input_data: {
        scene_description,
        characters_context: characters_context || '',
        plot_context: plot_context || ''
      },
      output_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await addJob('scene-generation', jobData);

    reply.status(201).send({ job_id: jobData.id });
  });

  fastify.post('/api/jobs/script-generation', {
    schema: {
      ...jobsSchema,
      summary: 'Create script generation job',
      body: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          prompt: { type: 'string' },
          type: { type: 'string', enum: ['script', 'character', 'plot'] },
          context: { type: 'object' }
        },
        required: ['project_id', 'prompt', 'type']
      },
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } }
      }
    }
  }, async (request, reply) => {
    const { project_id, prompt, type, context } = request.body as any;

    const jobData = {
      id: crypto.randomUUID(),
      project_id,
      type: 'script-generation' as const,
      status: 'pending' as const,
      progress: 0,
      input_data: {
        type,
        prompt,
        context: context || {}
      },
      output_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await addJob('script-generation', jobData);

    reply.status(201).send({ job_id: jobData.id });
  });

  fastify.post('/api/jobs/video-generation', {
    schema: {
      ...jobsSchema,
      summary: 'Create video generation job',
      body: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          prompt: { type: 'string' },
          image_url: { type: 'string' },
          duration: { type: 'number', default: 8 },
          metadata: { type: 'object' }
        },
        required: ['project_id', 'prompt']
      },
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } }
      }
    }
  }, async (request, reply) => {
    const { project_id, prompt, image_url, duration, metadata } = request.body as any;

    const jobData = {
      id: crypto.randomUUID(),
      project_id,
      type: 'video-generation' as const,
      status: 'pending' as const,
      progress: 0,
      input_data: {
        prompt,
        image_url: image_url || null,
        duration: duration || 8,
        type: 'custom_video',
        metadata: metadata || {}
      },
      output_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await addJob('video-generation', jobData);

    reply.status(201).send({ job_id: jobData.id });
  });

  fastify.post('/api/jobs/video-stitching', {
    schema: {
      ...jobsSchema,
      summary: 'Create video stitching job',
      body: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          video_urls: { type: 'array', items: { type: 'string' } },
          output_name: { type: 'string' },
          options: { type: 'object' }
        },
        required: ['project_id', 'video_urls']
      },
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } }
      }
    }
  }, async (request, reply) => {
    const { project_id, video_urls, output_name, options } = request.body as any;

    const jobData = {
      id: crypto.randomUUID(),
      project_id,
      type: 'video-stitching' as const,
      status: 'pending' as const,
      progress: 0,
      input_data: {
        video_urls,
        output_name: output_name || 'final_video',
        options: options || {}
      },
      output_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await addJob('video-stitching', jobData);

    reply.status(201).send({ job_id: jobData.id });
  });

  fastify.get('/api/jobs/:id/status', {
    schema: {
      ...jobsSchema,
      summary: 'Get job status',
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
            status: { type: 'string' },
            progress: { type: 'number' },
            updated_at: { type: 'string' },
            output_data: { type: 'object' },
            error_message: { type: 'string' }
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
      const status = await getJobStatus(id);

      if (!status) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Job with ID ${id} not found`,
          statusCode: 404
        });
      }

      reply.send(status);
    } catch (error: any) {
      fastify.log.error('Error fetching job status:', error);
      reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
      return reply.raw.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message || 'Failed to fetch job status',
        statusCode: 500
      }));
    }
  });

  fastify.delete('/api/jobs/:id', {
    schema: {
      ...jobsSchema,
      summary: 'Cancel job',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['character-generation', 'object-generation', 'scene-generation', 'frame-generation', 'video-generation', 'video-stitching', 'script-generation', 'image-editing']
          }
        },
        required: ['type']
      },
      response: {
        200: { type: 'object', properties: { message: { type: 'string' } } }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { type } = request.query as { type: any };

      await cancelJob(type, id);

      reply.send({ message: `Job ${id} cancelled successfully` });
    } catch (error: any) {
      fastify.log.error('Error cancelling job:', error);
      reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
      return reply.raw.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message || 'Failed to cancel job',
        statusCode: 500
      }));
    }
  });

  fastify.get('/api/queues/status', {
    schema: {
      ...jobsSchema,
      summary: 'Get queue status for all job types',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              jobType: { type: 'string' },
              counts: {
                type: 'object',
                properties: {
                  waiting: { type: 'number' },
                  active: { type: 'number' },
                  completed: { type: 'number' },
                  failed: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const jobTypes = ['character-generation', 'object-generation', 'scene-generation', 'frame-generation', 'video-generation', 'video-stitching', 'script-generation', 'image-editing'] as const;

      const queueStatuses = await Promise.all(
        jobTypes.map(type => getQueueInfo(type))
      );

      reply.send(queueStatuses);
    } catch (error: any) {
      fastify.log.error('Error fetching queue status:', error);
      reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
      return reply.raw.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message || 'Failed to fetch queue status',
        statusCode: 500
      }));
    }
  });

  fastify.delete('/api/redis/clear', {
    schema: {
      ...jobsSchema,
      summary: 'Clear entire Redis cache',
      response: {
        200: { type: 'object', properties: { message: { type: 'string' }, cleared: { type: 'number' } } }
      }
    }
  }, async (request, reply) => {
    try {
      const { getRedisClient } = await import('../utils/queue.js');
      const redis = getRedisClient();

      const result = await redis.flushDb();
      console.log('Redis cache cleared');

      reply.send({ message: 'Redis cache cleared successfully', cleared: result === 'OK' ? 1 : 0 });
    } catch (error: any) {
      fastify.log.error('Error clearing Redis cache:', error);
      reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
      return reply.raw.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message || 'Failed to clear Redis cache',
        statusCode: 500
      }));
    }
  });

  fastify.post('/api/jobs/image-editing', {
    schema: {
      ...jobsSchema,
      summary: 'Create image editing job with form upload',
      consumes: ['multipart/form-data'],
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' }, statusCode: { type: 'number' } } }
      }
    }
  }, async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const fields = data.fields;
      const projectId = (fields.project_id as any)?.value;
      const editPrompt = (fields.edit_prompt as any)?.value;
      const metadata = fields.metadata ? JSON.parse((fields.metadata as any).value) : {};

      if (!projectId || !editPrompt) {
        return reply.status(400).send({ error: 'project_id and edit_prompt are required' });
      }

      const imageBuffer = await data.toBuffer();
      const { saveBlobFile, generateAssetFilename } = await import('../utils/blob.js');

      const filename = generateAssetFilename('images', 'png', 'source');
      const sourceUrl = await saveBlobFile(projectId, 'images', filename, imageBuffer);

      const jobData = {
        id: crypto.randomUUID(),
        project_id: projectId,
        type: 'image-editing' as const,
        status: 'pending' as const,
        progress: 0,
        input_data: {
          source_url: sourceUrl,
          edit_prompt: editPrompt,
          type: 'edited_images',
          metadata
        },
        output_data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await addJob('image-editing', jobData);
      reply.status(201).send({ job_id: jobData.id });
    } catch (error: any) {
      fastify.log.error('Error creating image editing job:', error);
      reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
      return reply.raw.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message || 'Failed to create image editing job',
        statusCode: 500
      }));
    }
  });

  fastify.post('/api/jobs/video-generation/upload', {
    schema: {
      ...jobsSchema,
      summary: 'Create video generation job with form upload',
      consumes: ['multipart/form-data'],
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' }, statusCode: { type: 'number' } } }
      }
    }
  }, async (request, reply) => {
    try {
      const data = await request.file();

      const fields = data?.fields || {};
      const projectId = (fields.project_id as any)?.value;
      const prompt = (fields.prompt as any)?.value;
      const duration = parseInt((fields.duration as any)?.value || '8');
      const metadata = fields.metadata ? JSON.parse((fields.metadata as any).value) : {};

      if (!projectId || !prompt) {
        return reply.status(400).send({ error: 'project_id and prompt are required' });
      }

      let imageUrl = null;
      if (data && data.file) {
        const imageBuffer = await data.toBuffer();
        const { saveBlobFile, generateAssetFilename } = await import('../utils/blob.js');

        const filename = generateAssetFilename('images', 'png', 'video_source');
        imageUrl = await saveBlobFile(projectId, 'images', filename, imageBuffer);
      }

      const jobData = {
        id: crypto.randomUUID(),
        project_id: projectId,
        type: 'video-generation' as const,
        status: 'pending' as const,
        progress: 0,
        input_data: {
          prompt,
          image_url: imageUrl,
          duration,
          type: 'custom_video',
          metadata
        },
        output_data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await addJob('video-generation', jobData);
      reply.status(201).send({ job_id: jobData.id });
    } catch (error: any) {
      fastify.log.error('Error creating video generation job:', error);
      reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
      return reply.raw.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message || 'Failed to create video generation job',
        statusCode: 500
      }));
    }
  });

  fastify.post('/api/jobs/character-editing', {
    schema: {
      ...jobsSchema,
      summary: 'Create character editing job with form upload',
      consumes: ['multipart/form-data'],
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' }, statusCode: { type: 'number' } } }
      }
    }
  }, async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const fields = data.fields;
      const projectId = (fields.project_id as any)?.value;
      const characterId = (fields.character_id as any)?.value;
      const editPrompt = (fields.edit_prompt as any)?.value;
      const metadata = fields.metadata ? JSON.parse((fields.metadata as any).value) : {};

      if (!projectId || !characterId || !editPrompt) {
        return reply.status(400).send({ error: 'project_id, character_id, and edit_prompt are required' });
      }

      const imageBuffer = await data.toBuffer();
      const { saveBlobFile, generateAssetFilename } = await import('../utils/blob.js');

      const filename = generateAssetFilename('characters', 'png', 'source');
      const sourceUrl = await saveBlobFile(projectId, 'characters', filename, imageBuffer);

      const jobData = {
        id: crypto.randomUUID(),
        project_id: projectId,
        type: 'image-editing' as const,
        status: 'pending' as const,
        progress: 0,
        input_data: {
          source_url: sourceUrl,
          edit_prompt: editPrompt,
          type: 'characters',
          metadata: { ...metadata, character_id: characterId, edit_type: 'character' }
        },
        output_data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await addJob('image-editing', jobData);
      reply.status(201).send({ job_id: jobData.id });
    } catch (error: any) {
      fastify.log.error('Error creating character editing job:', error);
      reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
      return reply.raw.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message || 'Failed to create character editing job',
        statusCode: 500
      }));
    }
  });

  fastify.post('/api/jobs/object-editing', {
    schema: {
      ...jobsSchema,
      summary: 'Create object editing job with form upload',
      consumes: ['multipart/form-data'],
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' }, statusCode: { type: 'number' } } }
      }
    }
  }, async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const fields = data.fields;
      const projectId = (fields.project_id as any)?.value;
      const objectId = (fields.object_id as any)?.value;
      const editPrompt = (fields.edit_prompt as any)?.value;
      const metadata = fields.metadata ? JSON.parse((fields.metadata as any).value) : {};

      if (!projectId || !objectId || !editPrompt) {
        return reply.status(400).send({ error: 'project_id, object_id, and edit_prompt are required' });
      }

      const imageBuffer = await data.toBuffer();
      const { saveBlobFile, generateAssetFilename } = await import('../utils/blob.js');

      const filename = generateAssetFilename('objects', 'png', 'source');
      const sourceUrl = await saveBlobFile(projectId, 'objects', filename, imageBuffer);

      const jobData = {
        id: crypto.randomUUID(),
        project_id: projectId,
        type: 'image-editing' as const,
        status: 'pending' as const,
        progress: 0,
        input_data: {
          source_url: sourceUrl,
          edit_prompt: editPrompt,
          type: 'objects',
          metadata: { ...metadata, object_id: objectId, edit_type: 'object' }
        },
        output_data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await addJob('image-editing', jobData);
      reply.status(201).send({ job_id: jobData.id });
    } catch (error: any) {
      fastify.log.error('Error creating object editing job:', error);
      reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
      return reply.raw.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message || 'Failed to create object editing job',
        statusCode: 500
      }));
    }
  });
}