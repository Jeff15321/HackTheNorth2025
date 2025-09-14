import type { FastifyInstance } from 'fastify';
import { generateText, generateJSON } from '../ai/gemini';
import { DirectorRequestSchema } from '../models/schemas';
import { SchemaType, type Schema } from '@google/generative-ai';
import {
  storeConversationContext,
  getConversationContext,
  createConversationMessage,
  getConversationMessages,
  updateConversationContext,
  type ConversationContext
} from '../utils/conversation';
import { updateProject } from '../utils/database';

const DirectorInitialResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    response: { type: SchemaType.STRING },
    plot_points: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Concise plot points in bullet form"
    },
    characters: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { 
            type: SchemaType.STRING,
            description: "Character's full name"
          },
          role: { 
            type: SchemaType.STRING,
            description: "Character's role in the story (protagonist, antagonist, etc.)"
          },
          description: { 
            type: SchemaType.STRING,
            description: "Physical and background description"
          },
          age: { 
            type: SchemaType.NUMBER,
            description: "Character's age in years"
          },
          personality: { 
            type: SchemaType.STRING,
            description: "Character's personality traits and motivations"
          },
          backstory: { 
            type: SchemaType.STRING,
            description: "Character's background story and history"
          }
        },
        required: ["name", "role", "description", "age", "personality", "backstory"]
      },
      description: "Array of main characters for the film"
    },
    is_complete: { type: SchemaType.BOOLEAN },
    next_step: { type: SchemaType.STRING }
  },
  required: ["response", "plot_points", "characters", "is_complete", "next_step"]
} as Schema;

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
            await createConversationMessage(message.conversation_id, 'user', message.user_query);
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
            preferences: { type: 'object', additionalProperties: true },
            director_response: { type: 'string' },
            suggested_questions: { type: 'array', items: { type: 'string' } },
            character_suggestions: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: true  // Allow all character properties
              }
            },
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

  fastify.post('/api/director/converse', {
    schema: {
      tags: ['Director'],
      summary: 'Have a conversation with the AI director',
      body: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          message: { type: 'string' },
          context: { type: 'object' }
        },
        required: ['project_id', 'message']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            response: { type: 'string' },
            plot_points: { type: 'array', items: { type: 'string' } },
            characters: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: true  // Allow all properties to pass through
              }
            },
            is_complete: { type: 'boolean' },
            next_step: { type: 'string' },
            context_id: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { project_id, message, context = {} } = request.body as any;

    // Get conversation history
    const conversationId = `project_${project_id}`;
    const messages = await getConversationMessages(conversationId);
    const existingContext = await getConversationContext(conversationId);

    // Merge contexts - prefer existing context over passed context
    const currentContext = existingContext || {
      conversation_id: conversationId,
      user_concept: '',
      director_response: '',
      suggested_questions: [],
      character_suggestions: [],
      plot_outline: '',
      next_step: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      session_state: 'active',
      project_id: project_id,
      ...context
    };

    // Build conversation history for AI
    const conversationHistory = messages.map(msg => {
      if (msg.user_query) {
        return `User: ${msg.user_query}`;
      } else if (msg.director_response) {
        return `Director: ${msg.director_response}`;
      }
      return '';
    }).filter(Boolean).join('\n');

    const systemPrompt = `You are a professional film director. Your job is to help develop the film concept.

Current context:
${JSON.stringify(currentContext, null, 2)}

Previous conversation:
${conversationHistory}

User's current message: ${message}

Your task:
1. Respond to their message helpfully
2. Generate plot points ONLY if they ask for plot/story
3. Generate characters ONLY if they explicitly ask for characters OR when marking the concept as complete
4. If generating characters, create 3-5 complete characters with ALL fields properly filled:
   - name: Character's full name (must be a proper name like "Kaito Nakamura")
   - role: Their role (must be one of: "Protagonist", "Antagonist", "Supporting")
   - age: Their age as a number between 1-100 (e.g., 28, NOT 0)
   - description: Physical appearance and background (at least 20 words)
   - personality: Detailed personality traits and motivations (at least 20 words)
   - backstory: Their background story and history (at least 20 words)
5. Set is_complete=true only when you have both plot AND characters with all fields filled
6. Be direct and production-focused

CRITICAL:
- NEVER return age=0. Always provide a realistic age.
- NEVER return empty strings for personality or backstory. Always provide detailed content.
- When the user says they're done, if you have plot but no complete characters, generate them NOW.`;

    
    const response = await generateJSON<{
      response: string;
      plot_points: string[];
      characters: Array<{ name: string; role: string; description: string; age: number; personality: string; backstory: string }>;
      is_complete: boolean;
      next_step: string;
    }>(
      message,
      DirectorInitialResponseSchema,
      systemPrompt
    );


    // Store conversation
    await createConversationMessage(conversationId, 'user', message, { project_id });
    await createConversationMessage(conversationId, 'assistant', response.response, { project_id });

    // Update context with new information - accumulate rather than replace
    // Only update characters if we got valid new ones with all fields
    let updatedCharacters = currentContext.character_suggestions || [];
    if (response.characters.length > 0 && response.characters[0] && response.characters[0].age > 0 && response.characters[0].personality) {
      // We got fully formed characters, replace the list
      updatedCharacters = response.characters.map(char => ({
        name: char.name || 'Unknown',
        description: char.description || 'No description',
        role: char.role,
        age: char.age,
        personality: char.personality,
        backstory: char.backstory
      }));
    } else if (response.characters.length > 0 && (!currentContext.character_suggestions || currentContext.character_suggestions.length === 0)) {
      // We got partial characters and have no existing ones, store what we have
      updatedCharacters = response.characters.map(char => ({
        name: char.name || 'Unknown',
        description: char.description || 'No description',
        role: char.role || 'supporting'
      }));
    }
    // Otherwise keep existing characters

    const updatedContext: ConversationContext = {
      ...currentContext,
      conversation_id: conversationId,
      user_concept: currentContext.user_concept || message,
      director_response: response.response,
      suggested_questions: currentContext.suggested_questions || [],
      character_suggestions: updatedCharacters,
      plot_outline: response.plot_points.length > 0
        ? response.plot_points.join('\n')
        : currentContext.plot_outline || '',
      next_step: response.next_step || 'Continue conversation',
      created_at: currentContext.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      session_state: 'active',
      project_id: project_id
    };

    // Store or update the context
    if (existingContext) {
      await updateConversationContext(conversationId, updatedContext);
    } else {
      await storeConversationContext(updatedContext);
    }

    // If conversation is complete, persist plot to Supabase
    if (response.is_complete && updatedContext.plot_outline) {
      // Update project with plot
      await updateProject(project_id, {
        plot: updatedContext.plot_outline
      });
      // Note: Characters will be created during the character generation phase with images
    }

    // Ensure characters are properly structured and not corrupted
    const safeCharacters = (response.characters || []).map(char => ({
      name: String(char.name || ''),
      role: String(char.role || ''),
      age: Number(char.age || 0),
      description: String(char.description || ''),
      personality: String(char.personality || ''),
      backstory: String(char.backstory || '')
    }));

    // Return the actual accumulated context
    // Use accumulated characters from context if the AI didn't return fully formed ones
    let charactersToReturn = safeCharacters;
    if ((!safeCharacters.length || (safeCharacters[0] && safeCharacters[0].age === 0)) && updatedCharacters.length > 0) {
      // Use the accumulated characters from context
      charactersToReturn = updatedCharacters.map((char: any) => ({
        name: String(char.name || ''),
        role: String(char.role || 'supporting'),
        age: Number(char.age || 30), // Default age if not specified
        description: String(char.description || ''),
        personality: String(char.personality || ''),
        backstory: String(char.backstory || '')
      }));
    }

    const apiResponse = {
      response: response.response,
      plot_points: updatedContext.plot_outline ? updatedContext.plot_outline.split('\n') : [],
      characters: charactersToReturn,
      is_complete: response.is_complete || false,
      next_step: response.next_step || 'Continue conversation',
      context_id: conversationId // Add this so test knows where context is stored
    };

    
    return reply.send(apiResponse);
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