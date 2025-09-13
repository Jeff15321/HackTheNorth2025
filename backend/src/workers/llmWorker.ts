import { Worker, Job } from 'bullmq';
import { generateText, generateJSON, generateScript, generateCharacterDescription, parseReferencedIds } from '../ai/gemini.js';
import { SchemaType, type Schema } from '@google/generative-ai';
import { createCharacter, createScene, createFrame, getCharactersByProject } from '../utils/database.js';
import { updateJobStatus, addJob, queueConnection } from '../utils/queue.js';
import { buildSceneContext, buildFrameContext, formatContextForPrompt } from '../utils/context.js';

// Use shared connection from queue.js to ensure event listeners work
const connection = queueConnection;

const sceneGenerationSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    detailed_plot: {
      type: SchemaType.STRING,
      description: "Detailed scene plot with character actions and environmental details"
    },
    concise_plot: {
      type: SchemaType.STRING,
      description: "Concise one-sentence summary of the scene"
    },
    duration: {
      type: SchemaType.NUMBER,
      description: "Scene duration in seconds (max 8)"
    },
    dialogue: {
      type: SchemaType.STRING,
      description: "Dialogue and spoken content for the scene"
    }
  },
  required: ["detailed_plot", "concise_plot", "duration", "dialogue"]
};

const frameGenerationSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    veo3_prompt: {
      type: SchemaType.STRING,
      description: "Detailed Veo 3 video prompt with cinematic quality and specific camera angles"
    },
    dialogue: {
      type: SchemaType.STRING,
      description: "Clear dialogue timing for the frame"
    },
    duration_constraint: {
      type: SchemaType.NUMBER,
      description: "Maximum duration constraint in seconds (max 8)"
    },
    split_reason: {
      type: SchemaType.STRING,
      description: "Reason for frame splitting if needed"
    }
  },
  required: ["veo3_prompt", "dialogue", "duration_constraint"]
};

export function createLLMWorker() {
  const llmWorker = new Worker(
    'script-generation',
    async (job: Job) => {
      return processLLMJob(job);
    },
    { connection, concurrency: 4 }
  );

  const sceneWorker = new Worker(
    'scene-generation',
    async (job: Job) => {
      return processSceneGeneration(job);
    },
    { connection, concurrency: 3 }
  );

  const frameWorker = new Worker(
    'frame-generation',
    async (job: Job) => {
      return processFrameGeneration(job);
    },
    { connection, concurrency: 5 }
  );

  console.log('🤖 LLM workers created');
  return { llmWorker, sceneWorker, frameWorker };
}

async function processLLMJob(job: Job) {
  const { project_id, input_data } = job.data;
  const { type, prompt, context } = input_data;

  try {
    await updateJobStatus(job.id!, 'processing', 10);

    console.log(`🤖 Processing LLM job: ${type}`);

    let result: any;

    switch (type) {
      case 'script':
        result = await generateProjectScript(project_id, prompt, context);
        break;
      case 'character':
        result = await generateProjectCharacter(project_id, prompt, context);
        break;
      case 'plot':
        result = await generatePlotOutline(prompt, context);
        break;
      default:
        result = await generateText(prompt, context?.systemPrompt);
    }

    await updateJobStatus(job.id!, 'processing', 90);

    console.log(`✅ LLM job completed: ${type}`);
    return result;
  } catch (error) {
    console.error(`❌ LLM job failed for ${job.id}:`, error);
    throw error;
  }
}

async function processSceneGeneration(job: Job) {
  const { project_id, input_data } = job.data;
  const { scene_description, characters_context, plot_context } = input_data;

  try {
    await updateJobStatus(job.id!, 'processing', 10);

    console.log(`Generating scene for project ${project_id}`);

    await updateJobStatus(job.id!, 'processing', 30);

    // Scenes know: all characters + project plot
    const contextData = await buildSceneContext(project_id);
    const formattedContext = formatContextForPrompt(contextData);

    await updateJobStatus(job.id!, 'processing', 50);

    const characterTokens = contextData.characters.map(c => `<|character_${c.id}|>`);
    const objectTokens = contextData.objects.map(o => `<|object_${o.id}|>`);

    const systemPrompt = `You are a film director. Generate a detailed scene based on the description and hierarchical context.`;

    const prompt = `
Scene Description: ${scene_description}
Additional Context: ${characters_context || ''} / ${plot_context || ''}

${formattedContext}

Generate a scene that:
- Is 8 seconds or less in duration
- Has clear dialogue and action
- References characters using tokens when needed: ${characterTokens.join(', ')}
- References objects using tokens when needed: ${objectTokens.join(', ')}
- Includes environmental details
`;

    const sceneData = await generateJSON<{
      detailed_plot: string;
      concise_plot: string;
      duration: number;
      dialogue: string;
    }>(prompt, sceneGenerationSchema, systemPrompt);

    await updateJobStatus(job.id!, 'processing', 70);

    const scene = await createScene({
      project_id,
      metadata: sceneData
    });

    await updateJobStatus(job.id!, 'processing', 85);

    await triggerFrameGeneration(project_id, scene.id, sceneData, contextData);

    const result = {
      scene_id: scene.id,
      scene_data: sceneData,
      frames_triggered: true,
      context_tokens_available: {
        characters: characterTokens,
        objects: objectTokens
      }
    };

    console.log(`Scene generated: ${scene.id}`);
    return result;
  } catch (error) {
    console.error(`Scene generation failed for job ${job.id}:`, error);
    throw error;
  }
}

async function processFrameGeneration(job: Job) {
  const { project_id, input_data } = job.data;
  const { scene_id, scene_metadata, frame_index, scene_context } = input_data;

  try {
    await updateJobStatus(job.id!, 'processing', 10);

    console.log(`Generating frame ${frame_index} for scene ${scene_id}`);

    // Parse referenced IDs to detect auto-context
    const { characterIds, objectIds } = await parseReferencedIds(scene_metadata.detailed_plot);

    await updateJobStatus(job.id!, 'processing', 30);

    // Frames know: characters + current scene + objects
    const currentScene = { id: scene_id, metadata: scene_metadata };
    const contextData = await buildFrameContext(project_id, currentScene as any);
    const formattedContext = formatContextForPrompt(contextData);

    // Filter only referenced entities (auto-detection)
    const referencedCharacters = contextData.characters.filter(c => characterIds.includes(c.id));
    const referencedObjects = contextData.objects.filter(o => objectIds.includes(o.id));

    await updateJobStatus(job.id!, 'processing', 50);

    const systemPrompt = `You are a video prompt engineer. Generate a detailed Veo 3 video prompt for this frame using hierarchical context.`;

    const prompt = `
Frame Index: ${frame_index}

${formattedContext}

Referenced Entities in Frame:
Characters: ${referencedCharacters.map(c => `<|character_${c.id}|> ${c.name}: ${c.description}`).join(', ')}
Objects: ${referencedObjects.map(o => `<|object_${o.id}|> ${o.type}: ${o.description}`).join(', ')}

Generate a Veo 3 video prompt for this frame:
- Maximum 8 seconds duration
- Cinematic quality with specific camera angles
- Clear dialogue timing
- Visual consistency with character/object descriptions
`;

    const frameData = await generateJSON<{
      veo3_prompt: string;
      dialogue: string;
      duration_constraint: number;
      split_reason?: string;
    }>(prompt, frameGenerationSchema, systemPrompt);

    await updateJobStatus(job.id!, 'processing', 70);

    const frame = await createFrame({
      project_id,
      metadata: frameData
    });

    await updateJobStatus(job.id!, 'processing', 85);

    await triggerVideoGeneration(project_id, frame.id, frameData);

    const result = {
      frame_id: frame.id,
      frame_data: frameData,
      video_triggered: true,
      referenced_ids: { characterIds, objectIds },
      context_entities_used: {
        characters: referencedCharacters.length,
        objects: referencedObjects.length
      }
    };

    console.log(`Frame generated: ${frame.id}`);
    return result;
  } catch (error) {
    console.error(`Frame generation failed for job ${job.id}:`, error);
    throw error;
  }
}

async function generateProjectScript(projectId: string, plot: string, context: any) {
  const characters = await getCharactersByProject(projectId);
  const characterNames = characters.map(c => c.metadata.name);

  const script = await generateScript(plot, characterNames);

  return {
    type: 'script',
    content: script,
    characters: characterNames,
    project_id: projectId
  };
}

async function generateProjectCharacter(projectId: string, characterPrompt: string, context: any) {
  const characterData = await generateCharacterDescription(characterPrompt, context.plot || '');

  const character = await createCharacter({
    project_id: projectId,
    metadata: characterData
  });

  return {
    type: 'character',
    character_id: character.id,
    character_data: characterData
  };
}

async function generatePlotOutline(prompt: string, context: any) {
  const systemPrompt = `You are a professional story consultant. Generate a detailed plot outline with clear story beats, character arcs, and scene breakdowns.`;

  const plotOutline = await generateText(prompt, systemPrompt);

  return {
    type: 'plot_outline',
    content: plotOutline,
    structure: 'three_act'
  };
}

async function triggerFrameGeneration(projectId: string, sceneId: string, sceneData: any, sceneContextData: any) {
  const frameCount = Math.ceil((sceneData.duration || 8) / 8);

  for (let i = 0; i < frameCount; i++) {
    const frameJob = {
      id: crypto.randomUUID(),
      project_id: projectId,
      type: 'frame-generation' as const,
      status: 'pending' as const,
      progress: 0,
      input_data: {
        scene_id: sceneId,
        scene_metadata: sceneData,
        scene_context: sceneContextData,
        frame_index: i
      },
      output_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await addJob('frame-generation', frameJob);
    console.log(`Triggered frame generation: ${i + 1}/${frameCount} for scene ${sceneId}`);
  }
}

async function triggerVideoGeneration(projectId: string, frameId: string, frameData: any) {
  const videoJob = {
    id: crypto.randomUUID(),
    project_id: projectId,
    type: 'video-generation' as const,
    status: 'pending' as const,
    progress: 0,
    input_data: {
      frame_id: frameId,
      prompt: frameData.veo3_prompt,
      duration: frameData.duration_constraint,
      type: 'frame_video',
      metadata: { frame_id: frameId }
    },
    output_data: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await addJob('video-generation', videoJob);
  console.log(`➕ Triggered video generation for frame ${frameId}`);
}