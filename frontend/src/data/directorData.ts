import { directorApi, projectApi } from '../utils/api';

export interface DirectorMessage {
  id: string;
  type: 'user' | 'director';
  content: string;
  timestamp: string;
}

export interface DirectorCharacter {
  name: string;
  role: string;
  description: string;
  age: number;
  personality: string;
  backstory: string;
}

export interface ConversationStatus {
  plot: string[];
  characters: DirectorCharacter[];
  isComplete: boolean;
  nextStep: string;
}

// Director conversation state
const directorState = {
  currentProject: null as string | null,
  conversationHistory: [] as DirectorMessage[],
  conversationStatus: {
    plot: [],
    characters: [],
    isComplete: false,
    nextStep: 'Start conversation'
  } as ConversationStatus,
  isLoading: false,
  conversationId: null as string | null,
};

// Project management
export function setDirectorProject(projectId: string) {
  directorState.currentProject = projectId;
  directorState.conversationId = `project_${projectId}`;
  // Clear conversation when switching projects
  directorState.conversationHistory = [];
  directorState.conversationStatus = {
    plot: [],
    characters: [],
    isComplete: false,
    nextStep: 'Start conversation'
  };
}

export function getCurrentDirectorProject(): string | null {
  return directorState.currentProject;
}

// Conversation management
export function getConversationHistory(): DirectorMessage[] {
  return [...directorState.conversationHistory];
}

export function addMessage(type: 'user' | 'director', content: string) {
  const message: DirectorMessage = {
    id: crypto.randomUUID(),
    type,
    content,
    timestamp: new Date().toISOString()
  };

  directorState.conversationHistory.push(message);
}

export function clearConversationHistory() {
  directorState.conversationHistory = [];
}

export async function sendToDirector(
  message: string,
  context?: any
): Promise<{
  response: string;
  plot_points: string[];
  characters: DirectorCharacter[];
  is_complete: boolean;
  next_step: string;
  context_id: string;
}> {
  if (!directorState.currentProject) {
    throw new Error('No project selected');
  }

  try {
    directorState.isLoading = true;

    // Add user message to history
    addMessage('user', message);

    const response = await directorApi.converse({
      project_id: directorState.currentProject,
      message,
      context
    });

    // Add director response to history
    addMessage('director', response.response);

    // Update conversation status
    updateConversationStatus({
      plot: response.plot_points,
      characters: response.characters,
      isComplete: response.is_complete,
      nextStep: response.next_step
    });

    return response;
  } finally {
    directorState.isLoading = false;
  }
}

// Conversation status management
export function getConversationStatus(): ConversationStatus {
  return { ...directorState.conversationStatus };
}

export function updateConversationStatus(status: ConversationStatus) {
  directorState.conversationStatus = { ...status };
}

export function isDirectorLoading(): boolean {
  return directorState.isLoading;
}

// Conversation persistence
export async function loadConversationHistory(): Promise<DirectorMessage[]> {
  if (!directorState.conversationId) {
    return [];
  }

  try {
    const response = await directorApi.getMessages(directorState.conversationId);
    const messages: DirectorMessage[] = response.messages.map((msg: any) => ({
      id: msg.id || crypto.randomUUID(),
      type: msg.user_query ? 'user' : 'director',
      content: msg.user_query || msg.director_response || '',
      timestamp: msg.timestamp
    })).filter((msg: DirectorMessage) => msg.content.trim() !== '');

    directorState.conversationHistory = messages;
    return messages;
  } catch (error) {
    console.error('Failed to load conversation history:', error);
    return [];
  }
}

export async function loadConversationContext(): Promise<ConversationStatus | null> {
  if (!directorState.conversationId) {
    return null;
  }

  try {
    const context = await directorApi.getConversation(directorState.conversationId);

    const status: ConversationStatus = {
      plot: context.plot_outline ? context.plot_outline.split('\n').filter(Boolean) : [],
      characters: context.character_suggestions || [],
      isComplete: context.session_state === 'completed',
      nextStep: context.next_step || 'Continue conversation'
    };

    updateConversationStatus(status);
    return status;
  } catch (error) {
    console.error('Failed to load conversation context:', error);
    return null;
  }
}

// Character generation integration
export async function generateCharactersFromDirector(): Promise<string[]> {
  const characters = directorState.conversationStatus.characters;

  if (!characters.length) {
    throw new Error('No characters available for generation');
  }

  if (!directorState.currentProject) {
    throw new Error('No project selected');
  }

  const { generateAllCharacters } = await import('./characterData');

  const characterData = characters.map(char => ({
    name: char.name,
    description: char.description,
    role: char.role
  }));

  return generateAllCharacters(characterData);
}

// Project integration
export async function initializeProjectFromDirector(): Promise<string> {
  if (!directorState.currentProject) {
    throw new Error('No project selected');
  }

  // If conversation is complete and we have plot, update the project
  if (directorState.conversationStatus.isComplete && directorState.conversationStatus.plot.length > 0) {
    const plotText = directorState.conversationStatus.plot.join('\n');

    await projectApi.update(directorState.currentProject, {
      plot: plotText
    });

    return plotText;
  }

  return '';
}

export function getConversationId(): string | null {
  return directorState.conversationId;
}

// Reset state
export function resetDirectorState() {
  directorState.currentProject = null;
  directorState.conversationHistory = [];
  directorState.conversationStatus = {
    plot: [],
    characters: [],
    isComplete: false,
    nextStep: 'Start conversation'
  };
  directorState.isLoading = false;
  directorState.conversationId = null;
}