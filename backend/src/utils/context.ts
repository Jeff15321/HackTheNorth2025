import { getCharactersByProject, getScenesByProject, getFramesByProject, getObjectsByProject, getProject } from './database.js';
import type { Character, Scene, Object, Frame } from '../models/schemas.js';

export interface ProjectContext {
  project_id: string;
  characters: Character[];
  scenes: Scene[];
  objects: Object[];
  frames: Frame[];
}

export interface HierarchicalContext {
  project_summary: string;
  plot: string;
  characters: Array<{
    id: string;
    name: string;
    description: string;
    personality: string;
    media_url?: string;
  }>;
  objects: Array<{
    id: string;
    type: string;
    description: string;
    environmental_context: string;
    media_url?: string;
  }>;
  scenes?: Array<{
    id: string;
    detailed_plot: string;
    concise_plot: string;
  }>;
}

export async function buildProjectContext(projectId: string): Promise<ProjectContext> {
  const [characters, scenes, objects, frames] = await Promise.all([
    getCharactersByProject(projectId),
    getScenesByProject(projectId),
    getObjectsByProject(projectId),
    getFramesByProject(projectId)
  ]);

  return {
    project_id: projectId,
    characters,
    scenes,
    objects,
    frames
  };
}

export async function buildCharacterContext(projectId: string): Promise<HierarchicalContext> {
  const project = await getProject(projectId);

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  return {
    project_summary: project.summary || '',
    plot: project.plot || '',
    characters: [],
    objects: []
  };
}

// Objects know: project summary + characters (inherit from characters level)
export async function buildObjectContext(projectId: string): Promise<HierarchicalContext> {
  const [project, characters] = await Promise.all([
    getProject(projectId),
    getCharactersByProject(projectId)
  ]);

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  return {
    project_summary: project.summary || '',
    plot: project.plot || '',
    characters: characters.map(c => ({
      id: c.id,
      name: c.metadata.name,
      description: c.metadata.description,
      personality: c.metadata.personality,
      media_url: c.media_url
    })),
    objects: []
  };
}

// Scenes know: all characters + project plot
export async function buildSceneContext(projectId: string): Promise<HierarchicalContext> {
  const [project, characters, objects] = await Promise.all([
    getProject(projectId),
    getCharactersByProject(projectId),
    getObjectsByProject(projectId)
  ]);

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  return {
    project_summary: project.summary || '',
    plot: project.plot || '',
    characters: characters.map(c => ({
      id: c.id,
      name: c.metadata.name,
      description: c.metadata.description,
      personality: c.metadata.personality,
      media_url: c.media_url
    })),
    objects: objects.map(o => ({
      id: o.id,
      type: o.metadata.type,
      description: o.metadata.description,
      environmental_context: o.metadata.environmental_context,
      media_url: o.media_url
    }))
  };
}

// Frames know: characters + current scene + objects
export async function buildFrameContext(
  projectId: string,
  currentScene: Scene
): Promise<HierarchicalContext> {
  const [project, characters, objects] = await Promise.all([
    getProject(projectId),
    getCharactersByProject(projectId),
    getObjectsByProject(projectId)
  ]);

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  return {
    project_summary: project.summary || '',
    plot: project.plot || '',
    characters: characters.map(c => ({
      id: c.id,
      name: c.metadata.name,
      description: c.metadata.description,
      personality: c.metadata.personality,
      media_url: c.media_url
    })),
    objects: objects.map(o => ({
      id: o.id,
      type: o.metadata.type,
      description: o.metadata.description,
      environmental_context: o.metadata.environmental_context,
      media_url: o.media_url
    })),
    scenes: [{
      id: currentScene.id,
      detailed_plot: currentScene.metadata.detailed_plot,
      concise_plot: currentScene.metadata.concise_plot
    }]
  };
}

export function parseReferencedIds(text: string): {
  characterIds: string[];
  objectIds: string[];
} {
  const characterMatches = text.match(/<\|character_([a-f0-9-]+)\|>/g) || [];
  const objectMatches = text.match(/<\|object_([a-f0-9-]+)\|>/g) || [];

  const characterIds = characterMatches
    .map(match => match.match(/<\|character_([a-f0-9-]+)\|>/)?.[1])
    .filter(Boolean) as string[];

  const objectIds = objectMatches
    .map(match => match.match(/<\|object_([a-f0-9-]+)\|>/)?.[1])
    .filter(Boolean) as string[];

  return { characterIds, objectIds };
}

export function injectReferencedContext(
  text: string,
  characters: Character[],
  objects: Object[]
): string {
  const { characterIds, objectIds } = parseReferencedIds(text);

  let contextualText = text;

  characterIds.forEach(charId => {
    const character = characters.find(c => c.id === charId);
    if (character) {
      const token = `<|character_${charId}|>`;
      const replacement = `${character.metadata.name} (${character.metadata.description})`;
      contextualText = contextualText.replace(new RegExp(token, 'g'), replacement);
    }
  });

  objectIds.forEach(objId => {
    const object = objects.find(o => o.id === objId);
    if (object) {
      const token = `<|object_${objId}|>`;
      const replacement = `${object.metadata.type} (${object.metadata.description})`;
      contextualText = contextualText.replace(new RegExp(token, 'g'), replacement);
    }
  });

  return contextualText;
}

export function formatContextForPrompt(context: HierarchicalContext): string {
  let prompt = `Project: ${context.project_summary}\nPlot: ${context.plot}\n\n`;

  if (context.characters.length > 0) {
    prompt += `Characters:\n`;
    context.characters.forEach(char => {
      prompt += `- <|character_${char.id}|> ${char.name}: ${char.description} (${char.personality})\n`;
    });
    prompt += `\n`;
  }

  if (context.objects.length > 0) {
    prompt += `Objects/Environment:\n`;
    context.objects.forEach(obj => {
      prompt += `- <|object_${obj.id}|> ${obj.type}: ${obj.description} (${obj.environmental_context})\n`;
    });
    prompt += `\n`;
  }

  if (context.scenes && context.scenes.length > 0) {
    prompt += `Current Scene:\n`;
    context.scenes.forEach(scene => {
      prompt += `- Scene: ${scene.concise_plot}\n  Details: ${scene.detailed_plot}\n`;
    });
    prompt += `\n`;
  }

  return prompt;
}