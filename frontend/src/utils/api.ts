import { Project, Job, JobStatusResponse } from '../types/backend';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(
      errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      errorData.statusCode
    );
  }

  return response.json();
}

// Project APIs
export const projectApi = {
  async create(data: { title: string; summary: string; plot?: string }): Promise<Project> {
    return fetchApi('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getById(id: string): Promise<Project> {
    return fetchApi(`/api/projects/${id}`);
  },

  async update(id: string, data: Partial<Project>): Promise<Project> {
    return fetchApi(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getCharacters(id: string): Promise<any[]> {
    return fetchApi(`/api/projects/${id}/characters`);
  },

  async getScenes(id: string): Promise<any[]> {
    return fetchApi(`/api/projects/${id}/scenes`);
  },

  async getComplete(id: string): Promise<{
    scenes: any[];
    characters: any[];
    objects: any[];
    frames: any[];
    completion_status: string;
  }> {
    return fetchApi(`/api/projects/${id}/complete`);
  },

  async confirmVideo(id: string): Promise<{ message: string; job_id: string }> {
    return fetchApi(`/api/projects/${id}/confirm-video`, {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
  },
};

// Director APIs
export const directorApi = {
  async converse(data: {
    project_id: string;
    message: string;
    context?: any;
  }): Promise<{
    response: string;
    plot_points: string[];
    characters: any[];
    is_complete: boolean;
    next_step: string;
    context_id: string;
  }> {
    return fetchApi('/api/director/converse', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getConversation(conversationId: string): Promise<any> {
    return fetchApi(`/api/director/conversations/${conversationId}`);
  },

  async getMessages(conversationId: string, limit?: number): Promise<{
    conversation_id: string;
    messages: any[];
  }> {
    const query = limit ? `?limit=${limit}` : '';
    return fetchApi(`/api/director/conversations/${conversationId}/messages${query}`);
  },
};

// Job APIs
export const jobApi = {
  async getStatus(jobId: string): Promise<JobStatusResponse> {
    return fetchApi(`/api/jobs/${jobId}/status`);
  },

  async cancel(jobId: string, type: string): Promise<{ message: string }> {
    return fetchApi(`/api/jobs/${jobId}?type=${type}`, {
      method: 'DELETE',
    });
  },

  async createCharacterGeneration(data: {
    project_id: string;
    prompt: string;
    name?: string;
    context?: any;
  }): Promise<{ job_id: string }> {
    return fetchApi('/api/jobs/character-generation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createSceneGeneration(data: {
    project_id: string;
    scene_description: string;
    characters_context?: string;
    plot_context?: string;
    target_frames?: number;
  }): Promise<{ job_id: string }> {
    return fetchApi('/api/jobs/scene-generation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async enhanceScript(data: {
    project_id: string;
    base_plot: string;
    characters_context: any[];
    target_scenes?: number;
  }): Promise<{
    success: boolean;
    enhanced_plot: string;
    enhanced_summary: string;
  }> {
    return fetchApi('/api/jobs/script-enhancement', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createVideoGeneration(data: {
    project_id: string;
    prompt: string;
    image_url?: string;
    duration?: number;
    metadata?: any;
  }): Promise<{ job_id: string }> {
    return fetchApi('/api/jobs/video-generation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createImageEditing(data: {
    project_id: string;
    source_url: string;
    edit_prompt: string;
    metadata?: any;
  }): Promise<{ job_id: string }> {
    return fetchApi('/api/jobs/image-editing', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getQueueStatus(): Promise<Array<{
    jobType: string;
    counts: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
  }>> {
    return fetchApi('/api/queues/status');
  },
};

// Event Source for real-time updates
export class EventSourceManager {
  private eventSources: Map<string, EventSource> = new Map();

  createEventSource(
    type: 'characters' | 'scenes' | 'videos',
    projectId: string,
    callbacks: {
      onMessage?: (event: MessageEvent) => void;
      onError?: (event: Event) => void;
      onOpen?: (event: Event) => void;
      onCharacterComplete?: (data: any) => void;
      onSceneComplete?: (data: any) => void;
      onVideoComplete?: (data: any) => void;
      onBatchProgress?: (data: any) => void;
      onProjectReady?: (data: any) => void;
    }
  ): EventSource {
    const key = `${type}-${projectId}`;

    // Close existing connection if any
    this.closeEventSource(key);

    const eventSource = new EventSource(`${API_BASE_URL}/api/events/project/${projectId}/${type}`);
    this.eventSources.set(key, eventSource);

    eventSource.onopen = (event) => {
      console.log(`Connected to ${type} events for project ${projectId}`);
      callbacks.onOpen?.(event);
    };

    eventSource.onmessage = (event) => {
      callbacks.onMessage?.(event);
    };

    eventSource.onerror = (event) => {
      console.error(`Error in ${type} events for project ${projectId}:`, event);
      callbacks.onError?.(event);
    };

    // Custom event handlers
    if (callbacks.onCharacterComplete) {
      eventSource.addEventListener('character_complete', (event) => {
        const data = JSON.parse((event as MessageEvent).data);
        callbacks.onCharacterComplete!(data);
      });
    }

    if (callbacks.onSceneComplete) {
      eventSource.addEventListener('scene_complete', (event) => {
        const data = JSON.parse((event as MessageEvent).data);
        callbacks.onSceneComplete!(data);
      });
    }

    if (callbacks.onVideoComplete) {
      eventSource.addEventListener('video_complete', (event) => {
        const data = JSON.parse((event as MessageEvent).data);
        callbacks.onVideoComplete!(data);
      });
    }

    if (callbacks.onBatchProgress) {
      eventSource.addEventListener('batch_progress', (event) => {
        const data = JSON.parse((event as MessageEvent).data);
        callbacks.onBatchProgress!(data);
      });
    }

    if (callbacks.onProjectReady) {
      eventSource.addEventListener('project_ready', (event) => {
        const data = JSON.parse((event as MessageEvent).data);
        callbacks.onProjectReady!(data);
      });
    }

    return eventSource;
  }

  closeEventSource(key: string) {
    const eventSource = this.eventSources.get(key);
    if (eventSource) {
      eventSource.close();
      this.eventSources.delete(key);
    }
  }

  closeAllEventSources() {
    this.eventSources.forEach((eventSource, key) => {
      eventSource.close();
    });
    this.eventSources.clear();
  }
}

export const eventSourceManager = new EventSourceManager();

// Content update APIs
export const contentApi = {
  async updateCharacter(projectId: string, characterId: string, data: {
    name?: string;
    role?: string;
    age?: number;
    personality?: string;
    description?: string;
    backstory?: string;
  }): Promise<{ success: boolean }> {
    return fetchApi(`/api/projects/${projectId}/characters/${characterId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateScene(projectId: string, sceneId: string, data: {
    detailed_plot?: string;
    concise_plot?: string;
    dialogue?: string;
    scene_order?: number;
  }): Promise<{ success: boolean }> {
    return fetchApi(`/api/projects/${projectId}/scenes/${sceneId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateFrame(projectId: string, frameId: string, data: {
    veo3_prompt?: string;
    dialogue?: string;
    summary?: string;
    split_reason?: string;
  }): Promise<{ success: boolean }> {
    return fetchApi(`/api/projects/${projectId}/frames/${frameId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export { ApiError };