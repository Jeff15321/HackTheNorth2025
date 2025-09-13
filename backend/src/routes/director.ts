import type { FastifyInstance } from 'fastify';
import { generateText, generateJSON } from '../ai/gemini';
import { DirectorRequestSchema } from '../models/schemas';
import { z } from 'zod';
import {
  storeConversationContext,
  getConversationContext,
  storeConversationMessage,
  getConversationMessages,
  type ConversationContext
} from '../utils/conversation';

const DirectorInitialResponseSchema = z.object({
  director_response: z.string(),
  suggested_questions: z.array(z.string()),
  character_suggestions: z.array(z.object({
    name: z.string(),
    description: z.string()
  })),
  plot_outline: z.string(),
  next_step: z.string()
});

const PAGE_PROMPTS = {
  '/dashboard': {
    system: `You are an AI film director assistant. The user is on the dashboard page viewing their projects overview. Help with project management, creation, and high-level guidance.`,
    functions: [
      { type: 'navigate', description: 'Navigate to different pages' },
      { type: 'modal', description: 'Show helpful information modals' },
      { type: 'highlight', description: 'Highlight UI elements' }
    ]
  },
  '/characters': {
    system: `You are an AI film director assistant. The user is on the characters management page. Help with character creation, editing, and development. Focus on character consistency and development.`,
    functions: [
      { type: 'navigate', description: 'Navigate to character details' },
      { type: 'modal', description: 'Show character development tips' },
      { type: 'highlight', description: 'Highlight character elements' }
    ]
  },
  '/scenes': {
    system: `You are an AI film director assistant. The user is on the scenes timeline page. Help with scene planning, sequencing, and narrative flow. Scenes are displayed on a timeline.`,
    functions: [
      { type: 'navigate', description: 'Navigate to storyboard view' },
      { type: 'modal', description: 'Show scene composition tips' },
      { type: 'highlight', description: 'Highlight timeline elements' }
    ]
  },
  '/storyboard': {
    system: `You are an AI film director assistant. The user is in the storyboard view within a scene. Help with frame-by-frame planning, camera angles, and visual composition.`,
    functions: [
      { type: 'navigate', description: 'Navigate back to scenes' },
      { type: 'modal', description: 'Show cinematography tips' },
      { type: 'highlight', description: 'Highlight storyboard frames' }
    ]
  }
};

export async function directorRoutes(fastify: FastifyInstance) {
  fastify.post('/api/director/initial', {
    schema: {
      tags: ['Director'],
      summary: 'Start initial conversation with Director Agent for film concept development',
      body: {
        type: 'object',
        properties: {
          user_concept: {
            type: 'string',
            description: 'Initial film concept or idea from the user'
          },
          preferences: {
            type: 'object',
            properties: {
              genre: { type: 'string' },
              style: { type: 'string' },
              duration: { type: 'string' },
              complexity: { type: 'string', enum: ['simple', 'moderate', 'complex'] }
            }
          }
        },
        required: ['user_concept']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            conversation_id: { type: 'string' },
            director_response: { type: 'string' },
            suggested_questions: { type: 'array', items: { type: 'string' } },
            character_suggestions: { type: 'array', items: { type: 'object' } },
            plot_outline: { type: 'string' },
            next_step: { type: 'string' },
            function_calls: { type: 'array', items: { type: 'object' } }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { user_concept, preferences } = request.body as {
        user_concept: string;
        preferences?: any;
      };

      const conversationId = crypto.randomUUID();

      const systemPrompt = `You are a professional film director and creative consultant with years of experience in the industry. A user has approached you with an initial concept for a film they want to create.

Your role is to:
1. Enthusiastically respond to their concept
2. Ask 2-3 focused clarifying questions to understand their vision better
3. Suggest compelling character concepts that would serve the story
4. Provide an initial plot outline structure
5. Guide them toward the next steps in the filmmaking process

Be creative, professional, and encouraging. Help them refine their concept into something production-ready.`;

      const prompt = `User's initial concept: "${user_concept}"

User preferences: ${JSON.stringify(preferences || {})}

This is the very first interaction in our film development process. Welcome them warmly, respond to their concept with genuine enthusiasm, and help them begin developing their vision into a structured film project.`;

      const directorResponse = await generateJSON(prompt, DirectorInitialResponseSchema, systemPrompt);

      const response = {
        conversation_id: conversationId,
        director_response: directorResponse.director_response,
        suggested_questions: directorResponse.suggested_questions,
        character_suggestions: directorResponse.character_suggestions,
        plot_outline: directorResponse.plot_outline,
        next_step: 'character_planning',
        function_calls: [
          {
            type: 'modal',
            content: 'Director Agent activated! Ready to help develop your film concept.'
          },
          {
            type: 'navigate',
            target: '/characters'
          }
        ]
      };

      const conversationContext: ConversationContext = {
        conversation_id: conversationId,
        user_concept,
        preferences,
        director_response: response.director_response,
        suggested_questions: response.suggested_questions,
        character_suggestions: response.character_suggestions,
        plot_outline: response.plot_outline,
        next_step: response.next_step,
        function_calls: response.function_calls,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        session_state: 'active'
      };

      await storeConversationContext(conversationContext);
      console.log(`💾 New conversation started: ${conversationId} for concept: ${user_concept.substring(0, 50)}...`);

      reply.send(response);
    } catch (error: any) {
      fastify.log.error('Director initial conversation failed:', error);
      reply.code(500).send({
        error: 'Director conversation failed',
        message: error?.message || 'Unable to start conversation with Director Agent'
      });
    }
  });

  fastify.post('/api/director/stream', {
    schema: {
      tags: ['Director'],
      summary: 'Stream AI director guidance',
      body: {
        type: 'object',
        properties: {
          page_route: { type: 'string' },
          user_query: { type: 'string' },
          context: { type: 'object' }
        },
        required: ['page_route', 'user_query']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            function_calls: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['navigate', 'highlight', 'modal'] },
                  target: { type: 'string' },
                  element: { type: 'string' },
                  content: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { page_route, user_query, context } = DirectorRequestSchema.parse(request.body);

      const conversationId = context?.conversation_id;

      reply.type('text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');

      const pageConfig = PAGE_PROMPTS[page_route as keyof typeof PAGE_PROMPTS] || PAGE_PROMPTS['/dashboard'];

      const systemPrompt = `${pageConfig.system}

Available functions you can call:
${pageConfig.functions.map(f => `- ${f.type}: ${f.description}`).join('\n')}

When responding:
1. Provide helpful guidance related to the current page
2. Include specific function calls as JSON objects when appropriate
3. Be concise but informative
4. Reference the user's context when provided

Context provided: ${JSON.stringify(context || {})}
`;

      const fullPrompt = `
User is on page: ${page_route}
User query: ${user_query}

Provide guidance and any relevant function calls to help the user.
`;

      const sendEvent = (event: string, data: any) => {
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      sendEvent('start', { page_route, timestamp: new Date().toISOString() });

      try {
        const response = await generateText(fullPrompt, systemPrompt);

        const functionCalls = extractFunctionCalls(response, pageConfig.functions);

        sendEvent('message', {
          content: response,
          page_route,
          timestamp: new Date().toISOString()
        });

        if (functionCalls.length > 0) {
          for (const functionCall of functionCalls) {
            sendEvent('function_call', {
              ...functionCall,
              timestamp: new Date().toISOString()
            });
          }
        }

        sendEvent('complete', {
          message: 'Director guidance complete',
          timestamp: new Date().toISOString()
        });

        if (conversationId && typeof conversationId === 'string') {
          const message = {
            id: crypto.randomUUID(),
            conversation_id: conversationId,
            user_query,
            director_response: response,
            page_route,
            context,
            function_calls: functionCalls,
            timestamp: new Date().toISOString()
          };

          try {
            await storeConversationMessage(message);
          } catch (error) {
            console.error('Failed to store conversation message:', error);
          }
        }

      } catch (error) {
        sendEvent('error', {
          error: 'Failed to generate director guidance',
          message: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      }

      reply.raw.end();

    } catch (error: any) {
      fastify.log.error('Error in director stream:', error);
      reply.raw.writeHead(400, { 'Content-Type': 'application/json' });
      reply.raw.end(JSON.stringify({
        error: 'Bad Request',
        message: error.message || 'Invalid director request',
        statusCode: 400
      }));
    }
  });

  // Get conversation context by ID
  fastify.get('/api/director/conversations/:conversation_id', {
    schema: {
      tags: ['Director'],
      summary: 'Get conversation context by ID',
      params: {
        type: 'object',
        properties: {
          conversation_id: { type: 'string' }
        },
        required: ['conversation_id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            conversation_id: { type: 'string' },
            user_concept: { type: 'string' },
            preferences: { type: 'object' },
            director_response: { type: 'string' },
            suggested_questions: { type: 'array', items: { type: 'string' } },
            character_suggestions: { type: 'array', items: { type: 'object' } },
            plot_outline: { type: 'string' },
            next_step: { type: 'string' },
            session_state: { type: 'string' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' },
            project_id: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { conversation_id } = request.params as { conversation_id: string };
      const context = await getConversationContext(conversation_id);

      if (!context) {
        reply.code(404).send({
          error: 'Conversation not found',
          message: `Conversation ${conversation_id} does not exist or has expired`
        });
        return;
      }

      reply.send(context);
    } catch (error: any) {
      fastify.log.error('Error fetching conversation:', error);
      reply.code(500).send({
        error: 'Failed to fetch conversation',
        message: error?.message || 'Unable to retrieve conversation context'
      });
    }
  });

  // Get conversation messages
  fastify.get('/api/director/conversations/:conversation_id/messages', {
    schema: {
      tags: ['Director'],
      summary: 'Get conversation messages by conversation ID',
      params: {
        type: 'object',
        properties: {
          conversation_id: { type: 'string' }
        },
        required: ['conversation_id']
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            conversation_id: { type: 'string' },
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  user_query: { type: 'string' },
                  director_response: { type: 'string' },
                  page_route: { type: 'string' },
                  timestamp: { type: 'string' }
                }
              }
            }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { conversation_id } = request.params as { conversation_id: string };
      const { limit } = request.query as { limit?: number };

      const messages = await getConversationMessages(conversation_id, limit || 50);

      reply.send({
        conversation_id,
        messages
      });
    } catch (error: any) {
      fastify.log.error('Error fetching conversation messages:', error);
      reply.code(500).send({
        error: 'Failed to fetch messages',
        message: error?.message || 'Unable to retrieve conversation messages'
      });
    }
  });

  fastify.get('/api/director/pages', {
    schema: {
      tags: ['Director'],
      summary: 'Get available page configurations',
      response: {
        200: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              system: { type: 'string' },
              functions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    description: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (_, reply) => {
    reply.send(PAGE_PROMPTS);
  });
}

function extractFunctionCalls(text: string, availableFunctions: Array<{ type: string; description: string }>) {
  const functionCalls: Array<{ type: string; target?: string; element?: string; content?: string }> = [];

  const availableTypes = new Set(availableFunctions.map(f => f.type));

  const patterns = [
    /navigate to ([^,.\n]+)/gi,
    /go to ([^,.\n]+)/gi,
    /show ([^,.\n]+) modal/gi,
    /display ([^,.\n]+) modal/gi,
    /highlight ([^,.\n]+)/gi,
    /focus on ([^,.\n]+)/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const action = match[0].toLowerCase();
      const target = match[1]?.trim() || '';

      if (action.includes('navigate') || action.includes('go to')) {
        if (availableTypes.has('navigate')) {
          functionCalls.push({
            type: 'navigate',
            target: target.startsWith('/') ? target : `/${target}`
          });
        }
      } else if (action.includes('modal')) {
        if (availableTypes.has('modal')) {
          functionCalls.push({
            type: 'modal',
            content: target
          });
        }
      } else if (action.includes('highlight') || action.includes('focus')) {
        if (availableTypes.has('highlight')) {
          const element = target.startsWith('#') || target.startsWith('.') ? target : `#${target}`;
          functionCalls.push({
            type: 'highlight',
            element
          });
        }
      }
    }
  }

  const uniqueFunctionCalls = functionCalls.filter((call, index, self) =>
    index === self.findIndex(c => c.type === call.type && c.target === call.target && c.element === call.element)
  );

  return uniqueFunctionCalls.slice(0, 3);
}