import type { FastifyInstance } from 'fastify';
import { addJob, getJobStatus, cancelJob, getQueueInfo } from '../utils/queue.js';
import { SchemaType, Schema } from '@google/generative-ai';

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
          scene_id: { type: 'string', format: 'uuid' },
          prompt: { type: 'string' },
          object_type: { type: 'string' },
          environmental_context: { type: 'string' },
          context: { type: 'object', additionalProperties: true }
        },
        required: ['project_id', 'prompt', 'object_type']
      },
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } }
      }
    }
  }, async (request, reply) => {
    const { project_id, scene_id, prompt, object_type, environmental_context } = request.body as any;

    const jobData = {
      id: crypto.randomUUID(),
      project_id,
      type: 'object-generation' as const,
      status: 'pending' as const,
      progress: 0,
      input_data: {
        prompt,
        scene_id,
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

    // no objects at all
    // await addJob('object-generation', jobData);

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
          context: { type: 'object', additionalProperties: true }
        },
        required: ['project_id', 'prompt']
      },
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } }
      }
    }
  }, async (request, reply) => {
    const { project_id, prompt, name, context } = request.body as any;

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
        metadata: {
          name: name || 'Unknown',
          ...context?.character_metadata
        }
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
          plot_context: { type: 'string' },
          target_frames: { type: 'number', default: 1 }
        },
        required: ['project_id', 'scene_description']
      },
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } }
      }
    }
  }, async (request, reply) => {
    const { project_id, scene_description, characters_context, plot_context, target_frames = 1 } = request.body as any;

    const jobData = {
      id: crypto.randomUUID(),
      project_id,
      type: 'scene-generation' as const,
      status: 'pending' as const,
      progress: 0,
      input_data: {
        scene_description,
        characters_context: characters_context || '',
        plot_context: plot_context || '',
        target_frames
      },
      output_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await addJob('scene-generation', jobData);

    reply.status(201).send({ job_id: jobData.id });
  });

  fastify.post('/api/jobs/frame-generation', {
    schema: {
      ...jobsSchema,
      summary: 'Create frame generation job',
      body: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          scene_id: { type: 'string', format: 'uuid' },
          scene_description: { type: 'string' },
          scene_plot: { type: 'string' },
          context: { type: 'object', additionalProperties: true }
        },
        required: ['project_id', 'scene_id']
      },
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } }
      }
    }
  }, async (request, reply) => {
    const { project_id, scene_id, scene_description, scene_plot, context } = request.body as any;

    const jobData = {
      id: crypto.randomUUID(),
      project_id,
      type: 'frame-generation' as const,
      status: 'pending' as const,
      progress: 0,
      input_data: {
        scene_id,
        scene_metadata: {
          detailed_plot: scene_plot || scene_description,
          concise_plot: scene_description,
          dialogue: '',
          duration: 8
        },
        scene_context: context || {},
        frame_index: 0
      },
      output_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await addJob('frame-generation', jobData);

    reply.status(201).send({ job_id: jobData.id });
  });

  fastify.post('/api/jobs/script-enhancement', {
    schema: {
      ...jobsSchema,
      summary: 'Enhance script and save to database',
      body: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          base_plot: { type: 'string' },
          characters_context: { type: 'array', items: { type: 'object' } },
          target_scenes: { type: 'number', default: 3 }
        },
        required: ['project_id', 'base_plot', 'characters_context']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            enhanced_plot: { type: 'string' },
            enhanced_summary: { type: 'string' }
          },
          required: ['success', 'enhanced_plot', 'enhanced_summary']
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          },
          required: ['success', 'error']
        }
      }
    }
  }, async (request, reply) => {
    const { project_id, base_plot, characters_context } = request.body as any;

    try {
      const charactersInfo = characters_context.map((char: any) =>
        `${char.metadata?.name || char.name || 'Unknown'}: ${char.metadata?.description || char.description || 'No description'}`
      ).join('\n');

      const prompt = `Current plot: ${base_plot}

Characters:
${charactersInfo}

Please enhance this plot by adding more detail, better pacing, and richer character interactions while keeping it concise.

Return a JSON object with:
- enhanced_plot: The enhanced plot with more detail (2-3 paragraphs max)
- enhanced_summary: A brief summary of the enhanced plot (1-2 sentences)`;

      const systemPrompt = 'You are a professional story editor. Enhance the given plot by adding depth, better character motivations, and clearer story beats while keeping it concise and focused.';

      const { generateJSON } = await import('../ai/gemini.js');

      const geminiSchema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          enhanced_plot: { type: SchemaType.STRING },
          enhanced_summary: { type: SchemaType.STRING }
        },
        required: ["enhanced_plot", "enhanced_summary"]
      };

      const parsed = await generateJSON<{enhanced_plot: string, enhanced_summary: string}>(prompt, geminiSchema, systemPrompt);

      // Update project in database
      const { getDatabase } = await import('../utils/database.js');
      const db = getDatabase();

      const { error: updateError } = await db
        .from('projects')
        .update({
          plot: parsed.enhanced_plot,
          summary: parsed.enhanced_summary,
          updated_at: new Date().toISOString()
        })
        .eq('id', project_id);

      if (updateError) {
        throw new Error(`Failed to update project: ${updateError.message}`);
      }

      reply.send({
        success: true,
        enhanced_plot: parsed.enhanced_plot,
        enhanced_summary: parsed.enhanced_summary
      });

    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  fastify.post('/api/jobs/bulk-scene-generation', {
    schema: {
      ...jobsSchema,
      summary: 'Create multiple scene generation jobs',
      body: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          enhanced_plot: { type: 'string' },
          scene_breakdowns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                scene_order: { type: 'number' },
                scene_description: { type: 'string' },
                target_frames: { type: 'number' }
              },
              required: ['scene_order', 'scene_description', 'target_frames']
            }
          }
        },
        required: ['project_id', 'enhanced_plot', 'scene_breakdowns']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            job_ids: { type: 'array', items: { type: 'string' } },
            total_scenes: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { project_id, enhanced_plot, scene_breakdowns } = request.body as any;

    const jobIds: string[] = [];

    // Spawn individual scene generation jobs
    for (const scene of scene_breakdowns) {
      const jobData = {
        id: crypto.randomUUID(),
        project_id,
        type: 'scene-generation' as const,
        status: 'pending' as const,
        progress: 0,
        input_data: {
          scene_description: scene.scene_description,
          characters_context: enhanced_plot,
          plot_context: enhanced_plot,
          scene_order: scene.scene_order,
          target_frames: scene.target_frames
        },
        output_data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await addJob('scene-generation', jobData);
      jobIds.push(jobData.id);
    }

    reply.status(201).send({
      job_ids: jobIds,
      total_scenes: scene_breakdowns.length
    });
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
          context: { type: 'object', additionalProperties: true }
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
          metadata: { type: 'object', additionalProperties: true }
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
          options: { type: 'object', additionalProperties: true }
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
            output_data: { 
              type: 'object',
              additionalProperties: true
            },
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

      console.log('🔍 [API] Getting job status for:', id);
      const status = await getJobStatus(id);
      // console.log('🔍 [API] Raw status from getJobStatus:', JSON.stringify(status, null, 2));

      if (!status) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Job with ID ${id} not found`,
          statusCode: 404
        });
      }

      console.log('🔍 [API] About to send response keys:', Object.keys(status));
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

  fastify.get('/api/debug/job/:id/status', {
    schema: {
      ...jobsSchema,
      summary: 'Debug job status - direct function call',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    console.log('🚨 [DEBUG ENDPOINT] Called for job:', id);

    try {
      const status = await getJobStatus(id);
      console.log('🚨 [DEBUG ENDPOINT] Function returned:', JSON.stringify(status, null, 2));

      reply.send({
        debug: true,
        job_id: id,
        function_result: status,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('🚨 [DEBUG ENDPOINT] Error:', error);
      reply.status(500).send({ error: error.message });
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
      summary: 'Create image editing job with JSON payload',
      consumes: ['application/json'],
      body: {
        type: 'object',
        required: ['project_id', 'source_url', 'edit_prompt'],
        properties: {
          project_id: { type: 'string' },
          source_url: { type: 'string', description: 'URL or base64 data URL of the source image' },
          edit_prompt: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true }
        }
      },
      response: {
        201: { type: 'object', properties: { job_id: { type: 'string' } } },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' }, statusCode: { type: 'number' } } }
      }
    }
  }, async (request, reply) => {
    try {
      const { project_id, source_url, edit_prompt, metadata = {} } = request.body as {
        project_id: string;
        source_url: string;
        edit_prompt: string;
        metadata?: any;
      };

      if (!project_id || !source_url || !edit_prompt) {
        return reply.status(400).send({ error: 'project_id, source_url, and edit_prompt are required' });
      }

      const jobData = {
        id: crypto.randomUUID(),
        project_id,
        type: 'image-editing' as const,
        status: 'pending' as const,
        progress: 0,
        input_data: {
          source_url,
          edit_prompt,
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
        
        // Convert to base64 data URL
        const base64Image = imageBuffer.toString('base64');
        imageUrl = `data:image/png;base64,${base64Image}`;
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
      
      // Convert to base64 data URL
      const base64Image = imageBuffer.toString('base64');
      const sourceUrl = `data:image/png;base64,${base64Image}`;

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
      
      // Convert to base64 data URL  
      const base64Image = imageBuffer.toString('base64');
      const sourceUrl = `data:image/png;base64,${base64Image}`;

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

  // Real-time SSE endpoints for specific scenarios
  fastify.get('/api/events/project/:project_id/characters', {
    schema: {
      ...jobsSchema,
      summary: 'Stream character generation progress for a project',
      params: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' }
        },
        required: ['project_id']
      }
    }
  }, async (request, reply) => {
    const { project_id } = request.params as { project_id: string };

    reply.type('text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    const sendEvent = (event: string, data: any) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('connected', { project_id, type: 'character_generation', timestamp: new Date().toISOString() });

    // Monitor character generation jobs for this project
    const interval = setInterval(async () => {
      try {
        const { getRedisClient } = await import('../utils/queue.js');
        const redis = getRedisClient();

        // Check for completed character jobs
        const pattern = `job:character-generation:${project_id}:*`;
        const keys = await redis.keys(pattern);

        for (const key of keys) {
          const jobData = await redis.get(key);
          if (jobData) {
            const job = JSON.parse(jobData);
            if (job.status === 'completed' && job.output_data?.character_id) {
              sendEvent('character_complete', {
                character_id: job.output_data.character_id,
                character_data: job.output_data,
                timestamp: new Date().toISOString()
              });
            } else if (job.status === 'failed') {
              sendEvent('character_failed', {
                job_id: job.id,
                error: job.error_message,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      } catch (error) {
        sendEvent('error', { message: 'Failed to check job status', timestamp: new Date().toISOString() });
      }
    }, 1000);

    request.raw.on('close', () => {
      clearInterval(interval);
    });
  });

  fastify.get('/api/events/project/:project_id/scenes', {
    schema: {
      ...jobsSchema,
      summary: 'Stream scene generation progress for a project',
      params: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' }
        },
        required: ['project_id']
      }
    }
  }, async (request, reply) => {
    const { project_id } = request.params as { project_id: string };

    reply.type('text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    const sendEvent = (event: string, data: any) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('connected', { project_id, type: 'scene_generation', timestamp: new Date().toISOString() });

    const interval = setInterval(async () => {
      try {
        const { getRedisClient } = await import('../utils/queue.js');
        const redis = getRedisClient();

        // Check scene generation progress
        const scenePattern = `job:scene-generation:${project_id}:*`;
        const objectPattern = `job:object-generation:${project_id}:*`;
        const framePattern = `job:frame-generation:${project_id}:*`;

        const [sceneKeys, objectKeys, frameKeys] = await Promise.all([
          redis.keys(scenePattern),
          redis.keys(objectPattern),
          redis.keys(framePattern)
        ]);

        // Send scene completion events
        for (const key of sceneKeys) {
          const jobData = await redis.get(key);
          if (jobData) {
            const job = JSON.parse(jobData);
            if (job.status === 'completed') {
              sendEvent('scene_complete', {
                scene_id: job.output_data?.scene_id,
                scene_data: job.output_data,
                timestamp: new Date().toISOString()
              });
            }
          }
        }

        // Send batch progress
        const totalObjects = objectKeys.length;
        const completedObjects = (await Promise.all(
          objectKeys.map(async key => {
            const data = await redis.get(key);
            return data ? JSON.parse(data).status === 'completed' : false;
          })
        )).filter(Boolean).length;

        const totalFrames = frameKeys.length;
        const completedFrames = (await Promise.all(
          frameKeys.map(async key => {
            const data = await redis.get(key);
            return data ? JSON.parse(data).status === 'completed' : false;
          })
        )).filter(Boolean).length;

        sendEvent('batch_progress', {
          objects: { completed: completedObjects, total: totalObjects },
          frames: { completed: completedFrames, total: totalFrames },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        sendEvent('error', { message: 'Failed to check progress', timestamp: new Date().toISOString() });
      }
    }, 1000);

    request.raw.on('close', () => {
      clearInterval(interval);
    });
  });

  fastify.get('/api/events/project/:project_id/videos', {
    schema: {
      ...jobsSchema,
      summary: 'Stream video generation progress for a project',
      params: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' }
        },
        required: ['project_id']
      }
    }
  }, async (request, reply) => {
    const { project_id } = request.params as { project_id: string };

    reply.type('text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    const sendEvent = (event: string, data: any) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('connected', { project_id, type: 'video_generation', timestamp: new Date().toISOString() });

    const interval = setInterval(async () => {
      try {
        const { getRedisClient } = await import('../utils/queue.js');
        const redis = getRedisClient();

        const videoPattern = `job:video-generation:${project_id}:*`;
        const videoKeys = await redis.keys(videoPattern);

        let completedVideos = 0;
        const totalVideos = videoKeys.length;

        for (const key of videoKeys) {
          const jobData = await redis.get(key);
          if (jobData) {
            const job = JSON.parse(jobData);
            if (job.status === 'completed') {
              completedVideos++;
              sendEvent('video_complete', {
                frame_id: job.input_data?.frame_id,
                video_url: job.output_data?.video_url,
                timestamp: new Date().toISOString()
              });
            } else if (job.status === 'active') {
              sendEvent('video_progress', {
                frame_id: job.input_data?.frame_id,
                progress: job.progress || 0,
                timestamp: new Date().toISOString()
              });
            }
          }
        }

        // Check if all videos are done
        if (totalVideos > 0 && completedVideos === totalVideos) {
          sendEvent('project_ready', {
            message: 'All videos generated, project ready for final assembly',
            completed_videos: completedVideos,
            timestamp: new Date().toISOString()
          });
        }

      } catch (error) {
        sendEvent('error', { message: 'Failed to check video progress', timestamp: new Date().toISOString() });
      }
    }, 2000); // Slower polling for video generation

    request.raw.on('close', () => {
      clearInterval(interval);
    });
  });
}