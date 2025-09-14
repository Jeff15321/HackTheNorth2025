import { getRedisClient } from './queue.js';
import { randomUUID } from 'crypto';

interface CharacterSuggestion {
  name: string;
  description: string;
  role?: string;
}

interface FunctionCall {
  type: string;
  target?: string;
  element?: string;
  content?: string;
}

interface MessageContext {
  conversation_id?: string;
  project_id?: string;
  [key: string]: unknown;
}

export interface ConversationContext {
  conversation_id: string;
  user_concept: string;
  preferences?: {
    genre?: string;
    style?: string;
    duration?: string;
    complexity?: 'simple' | 'moderate' | 'complex';
  };
  director_response: string;
  suggested_questions: string[];
  character_suggestions: CharacterSuggestion[];
  plot_outline: string;
  next_step: string;
  function_calls?: FunctionCall[];
  created_at: string;
  updated_at: string;
  session_state?: 'active' | 'completed' | 'abandoned';
  project_id?: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  user_query: string;
  director_response: string;
  page_route?: string;
  context?: MessageContext;
  function_calls?: FunctionCall[];
  timestamp: string;
}

const CONVERSATION_KEY_PREFIX = 'conversation:';
const CONVERSATION_MESSAGES_PREFIX = 'conversation:messages:';
const CONVERSATION_INDEX_KEY = 'conversations:index';
const CONVERSATION_TTL = 604800;
const DEFAULT_EMPTY_ARRAY: never[] = [];
const DEFAULT_EMPTY_OBJECT = {};

export async function storeConversationContext(context: ConversationContext): Promise<void> {
  const redis = getRedisClient();
  const key = `${CONVERSATION_KEY_PREFIX}${context.conversation_id}`;

  const storeData: Record<string, string> = {
    conversation_id: context.conversation_id,
    user_concept: context.user_concept,
    preferences: JSON.stringify(context.preferences ?? DEFAULT_EMPTY_OBJECT),
    director_response: context.director_response,
    suggested_questions: JSON.stringify(context.suggested_questions),
    character_suggestions: JSON.stringify(context.character_suggestions),
    plot_outline: context.plot_outline,
    next_step: context.next_step,
    function_calls: JSON.stringify(context.function_calls ?? DEFAULT_EMPTY_ARRAY),
    created_at: context.created_at,
    updated_at: context.updated_at,
    session_state: context.session_state ?? 'active'
  };

  if (context.project_id) {
    storeData.project_id = context.project_id;
  }

  await redis.hSet(key, storeData);
  await redis.expire(key, CONVERSATION_TTL);
  await redis.sAdd(CONVERSATION_INDEX_KEY, context.conversation_id);

  console.log(`Stored conversation context: ${context.conversation_id}`);
}

export async function getConversationContext(conversationId: string): Promise<ConversationContext | null> {
  const redis = getRedisClient();
  const key = `${CONVERSATION_KEY_PREFIX}${conversationId}`;

  const data = await redis.hGetAll(key);

  if (!data.conversation_id) {
    return null;
  }

  const parsedPreferences = data.preferences ? JSON.parse(data.preferences) : undefined;
  const parsedSuggestedQuestions: string[] = data.suggested_questions ? JSON.parse(data.suggested_questions) : [];
  const parsedCharacterSuggestions: CharacterSuggestion[] = data.character_suggestions ? JSON.parse(data.character_suggestions) : [];
  const parsedFunctionCalls: FunctionCall[] = data.function_calls ? JSON.parse(data.function_calls) : [];

  const sessionState = data.session_state as 'active' | 'completed' | 'abandoned';

  if (!data.user_concept || !data.director_response || !data.plot_outline || !data.next_step || !data.created_at || !data.updated_at) {
    throw new Error('Missing required conversation data fields');
  }

  const context: ConversationContext = {
    conversation_id: data.conversation_id,
    user_concept: data.user_concept,
    director_response: data.director_response,
    suggested_questions: parsedSuggestedQuestions,
    character_suggestions: parsedCharacterSuggestions,
    plot_outline: data.plot_outline,
    next_step: data.next_step,
    created_at: data.created_at,
    updated_at: data.updated_at,
    session_state: sessionState ?? 'active'
  };

  if (parsedPreferences && Object.keys(parsedPreferences).length > 0) {
    context.preferences = parsedPreferences;
  }

  if (parsedFunctionCalls.length > 0) {
    context.function_calls = parsedFunctionCalls;
  }

  if (data.project_id) {
    context.project_id = data.project_id;
  }

  return context;
}

export async function updateConversationContext(
  conversationId: string,
  updates: Partial<ConversationContext>
): Promise<void> {
  const existing = await getConversationContext(conversationId);
  if (!existing) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  const mergedContext: ConversationContext = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString()
  };

  await storeConversationContext(mergedContext);
}

export async function storeConversationMessage(message: ConversationMessage): Promise<void> {
  const redis = getRedisClient();
  const key = `${CONVERSATION_MESSAGES_PREFIX}${message.conversation_id}`;

  const messageData = JSON.stringify(message);
  const timestamp = new Date(message.timestamp).getTime();

  // Check if timestamp is valid
  if (isNaN(timestamp)) {
    throw new Error(`Invalid timestamp provided: ${message.timestamp}`);
  }

  await redis.zAdd(key, { score: timestamp, value: messageData });
  await redis.expire(key, CONVERSATION_TTL);

  console.log(`Stored conversation message: ${message.id} for conversation ${message.conversation_id}`);
}

// Helper function to create conversation messages
export async function createConversationMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  context: MessageContext = {}
): Promise<void> {
  const message: ConversationMessage = {
    id: randomUUID(),
    conversation_id: conversationId,
    user_query: role === 'user' ? content : '',
    director_response: role === 'assistant' ? content : '',
    context,
    timestamp: new Date().toISOString()
  };

  await storeConversationMessage(message);
}

export async function getConversationMessages(
  conversationId: string,
  limit: number = 50
): Promise<ConversationMessage[]> {
  const redis = getRedisClient();
  const key = `${CONVERSATION_MESSAGES_PREFIX}${conversationId}`;

  try {
    const messages = await redis.zRange(key, 0, limit - 1, { REV: true });

    if (!Array.isArray(messages)) {
      return [];
    }

    const parsedMessages: ConversationMessage[] = [];

    for (const messageStr of messages) {
      if (typeof messageStr === 'string') {
        try {
          const parsed = JSON.parse(messageStr) as ConversationMessage;
          parsedMessages.push(parsed);
        } catch (error) {
          console.error(`Error parsing conversation message: ${error}`);
        }
      }
    }

    return parsedMessages;
  } catch (error) {
    console.error(`Error fetching conversation messages: ${error}`);
    return [];
  }
}

export async function markConversationCompleted(conversationId: string, projectId?: string): Promise<void> {
  const updates: Partial<ConversationContext> = {
    session_state: 'completed'
  };

  if (projectId) {
    updates.project_id = projectId;
  }

  await updateConversationContext(conversationId, updates);

  const logMessage = projectId
    ? `Marked conversation as completed: ${conversationId} → Project: ${projectId}`
    : `Marked conversation as completed: ${conversationId}`;

  console.log(logMessage);
}

export async function linkConversationToProject(conversationId: string, projectId: string): Promise<void> {
  await updateConversationContext(conversationId, {
    project_id: projectId,
    session_state: 'completed'
  });

  console.log(`Linked conversation ${conversationId} to project ${projectId}`);
}

export async function markConversationAbandoned(conversationId: string): Promise<void> {
  await updateConversationContext(conversationId, {
    session_state: 'abandoned'
  });

  console.log(`Marked conversation as abandoned: ${conversationId}`);
}

export async function getActiveConversations(): Promise<ConversationContext[]> {
  const redis = getRedisClient();
  const conversationIds = await redis.sMembers(CONVERSATION_INDEX_KEY);

  const conversations: ConversationContext[] = [];

  for (const id of conversationIds) {
    const context = await getConversationContext(id);
    if (context && context.session_state === 'active') {
      conversations.push(context);
    }
  }

  return conversations.sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function cleanupExpiredConversations(): Promise<void> {
  const redis = getRedisClient();
  const conversationIds = await redis.sMembers(CONVERSATION_INDEX_KEY);

  let cleanedCount = 0;

  for (const id of conversationIds) {
    const key = `${CONVERSATION_KEY_PREFIX}${id}`;
    const exists = await redis.exists(key);

    if (!exists) {
      await redis.sRem(CONVERSATION_INDEX_KEY, id);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired conversations from index`);
  }
}