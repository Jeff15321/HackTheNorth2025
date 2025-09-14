import { projectApi, eventSourceManager } from '../utils/api';

// Backend character data types
export interface BackendCharacter {
  id: string;
  project_id: string;
  media_url?: string;
  metadata: {
    name: string;
    role: string;
    age: number;
    description: string;
    personality: string;
    backstory: string;
  };
  created_at: string;
  updated_at: string;
}

export interface BackendScene {
  id: string;
  project_id: string;
  media_url?: string;
  metadata: {
    scene_order: number;
    concise_plot: string;
    detailed_plot: string;
    dialogue: string;
  };
  created_at: string;
  updated_at: string;
}

// Store for current project data
let currentProjectId: string | null = null;
let currentCharacters: BackendCharacter[] = [];
let currentScenes: BackendScene[] = [];
let isLoading = false;
let eventSources: EventSource[] = [];

// Project management
export function setCurrentProject(projectId: string) {
  currentProjectId = projectId;
  // Clear existing data when switching projects
  currentCharacters = [];
  currentScenes = [];

  // Close existing event sources
  eventSources.forEach(source => source.close());
  eventSources = [];

  // Set up real-time updates for the new project
  if (projectId) {
    setupEventSources(projectId);
  }
}

export function getCurrentProject(): string | null {
  return currentProjectId;
}

// Character data management
export function getCurrentCharacters(): BackendCharacter[] {
  return [...currentCharacters];
}

export function setCurrentCharacters(characters: BackendCharacter[]) {
  currentCharacters = characters;
}

export async function loadCharacters(): Promise<BackendCharacter[]> {
  if (!currentProjectId) {
    throw new Error('No project selected');
  }

  try {
    isLoading = true;
    const characters = await projectApi.getCharacters(currentProjectId);
    currentCharacters = characters;
    return characters;
  } finally {
    isLoading = false;
  }
}

export async function generateAllCharacters(characters: Array<{name: string; description: string; role?: string}>): Promise<string[]> {
  if (!currentProjectId) {
    throw new Error('No project selected');
  }

  const { jobApi } = await import('../utils/api');
  const jobIds: string[] = [];

  for (const character of characters) {
    const result = await jobApi.createCharacterGeneration({
      project_id: currentProjectId,
      prompt: `${character.name}: ${character.description}`,
      name: character.name,
      context: character
    });
    jobIds.push(result.job_id);
  }

  return jobIds;
}

// Scene data management
export function getCurrentScenes(): BackendScene[] {
  return [...currentScenes];
}

export function setCurrentScenes(scenes: BackendScene[]) {
  currentScenes = scenes;
}

export async function loadScenes(): Promise<BackendScene[]> {
  if (!currentProjectId) {
    throw new Error('No project selected');
  }

  try {
    isLoading = true;
    const scenes = await projectApi.getScenes(currentProjectId);
    currentScenes = scenes;
    return scenes;
  } finally {
    isLoading = false;
  }
}

export async function generateAllScenes(): Promise<string[]> {
  if (!currentProjectId) {
    throw new Error('No project selected');
  }

  // Get project details
  const project = await projectApi.getById(currentProjectId);
  if (!project.plot || project.plot.trim() === '') {
    throw new Error('Please enhance the script first to generate scenes');
  }

  const { jobApi } = await import('../utils/api');
  const characters = await projectApi.getCharacters(currentProjectId);
  const jobIds: string[] = [];

  // Frame structure: Scene 1 (3 frames), Scene 2 (2 frames), Scene 3 (3 frames)
  const frameStructure = [3, 2, 3];
  // const frameStructure = [1, 0, 0]; // for testing

  for (let sceneIndex = 0; sceneIndex < 3; sceneIndex++) {
    const sceneOrder = sceneIndex + 1;
    const targetFrames = frameStructure[sceneIndex];

    const result = await jobApi.createSceneGeneration({
      project_id: currentProjectId,
      scene_description: `Scene ${sceneOrder} from the enhanced plot`,
      plot_context: project.plot,
      characters_context: JSON.stringify(characters),
      target_frames: targetFrames
    });

    jobIds.push(result.job_id);
  }

  return jobIds;
}

// Real-time event handling
function setupEventSources(projectId: string) {
  // Character events
  const characterSource = eventSourceManager.createEventSource('characters', projectId, {
    onCharacterComplete: (data) => {
      // Reload characters when one is completed
      loadCharacters().catch(console.error);
    },
    onError: (error) => {
      console.error('Character events error:', error);
    }
  });

  // Scene events
  const sceneSource = eventSourceManager.createEventSource('scenes', projectId, {
    onSceneComplete: (data) => {
      // Reload scenes when one is completed
      loadScenes().catch(console.error);
    },
    onBatchProgress: (data) => {
      console.log('Scene generation progress:', data);
    },
    onError: (error) => {
      console.error('Scene events error:', error);
    }
  });

  // Video events
  const videoSource = eventSourceManager.createEventSource('videos', projectId, {
    onVideoComplete: (data) => {
      console.log('Video completed:', data);
    },
    onProjectReady: (data) => {
      console.log('Project ready for assembly:', data);
    },
    onError: (error) => {
      console.error('Video events error:', error);
    }
  });

  eventSources.push(characterSource, sceneSource, videoSource);
}

export function isLoadingData(): boolean {
  return isLoading;
}

export function cleanup() {
  eventSources.forEach(source => source.close());
  eventSources = [];
  currentProjectId = null;
  currentCharacters = [];
  currentScenes = [];
}

// Legacy support for existing gallery functionality
export type ScribbleLine = { points: number[]; color: string; size: number; erase?: boolean };

const scribbleMap: Record<string, ScribbleLine[]> = {};
let currentIndex = 0;

export function getScribblesForImage(imageSrc: string): ScribbleLine[] {
  return scribbleMap[imageSrc] || [];
}

export function setScribblesForImage(imageSrc: string, lines: ScribbleLine[]): void {
  scribbleMap[imageSrc] = lines || [];
}

export function getCurrentCharacterGallaryIndex(): number {
  return currentIndex;
}

export function setCurrentCharacterGallaryIndex(index: number): void {
  currentIndex = index;
}

// character gallery data

export type GalleryCategory = "characters" | "scenes";

export let characterGallaryData: Record<GalleryCategory, characterGallaryDataEntry[]> = {
  characters: [],
  scenes: [],
};

export type characterGallaryDataEntry = {
  image: string;
  description: string;
  loading?: boolean;
};

export function updateCharacterGalleryData(category: GalleryCategory, index: number, filePath: string, description: string) {
  (characterGallaryData as any)[category][index] = { image: filePath, description, loading: false };
}

export function setCharacterGallaryData(data: Record<GalleryCategory, characterGallaryDataEntry[]>) {
  characterGallaryData = data;
}

export function setEntryLoading(category: GalleryCategory, index: number, value: boolean) {
  (characterGallaryData as any)[category][index] = { ...characterGallaryData[category][index], loading: value };
}

export function initializeAllLoadingFalse() {
  (Object.keys(characterGallaryData) as GalleryCategory[]).forEach((cat) => {
    for (let i = 0; i < characterGallaryData[cat].length; i++) {
      (characterGallaryData as any)[cat][i] = { ...characterGallaryData[cat][i], loading: false };
    }
  });
}
