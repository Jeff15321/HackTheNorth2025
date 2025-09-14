import { Worker, Job } from 'bullmq';
import { generateText, generateJSON, generateScript, parseReferencedIds } from '../ai/gemini.js';
import { SchemaType, type Schema } from '@google/generative-ai';
import { createScene, getCharactersByProject } from '../utils/database.js';
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
    dialogue: {
      type: SchemaType.STRING,
      description: "Dialogue and spoken content for the scene"
    }
  },
  required: ["detailed_plot", "concise_plot", "dialogue"]
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
    split_reason: {
      type: SchemaType.STRING,
      description: "Reason for frame splitting if needed"
    }
  },
  required: ["veo3_prompt", "dialogue"]
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
    'scene-script-generation',
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
    { connection, concurrency: 8 }
  );

  console.log('🤖 LLM workers created');
  return { llmWorker, sceneWorker, frameWorker };
}

async function enhanceScript(base_plot: string, characters_context: any[], target_scenes: number = 3) {
  const charactersInfo = characters_context.map(char =>
    `${char.metadata?.name || char.name || 'Unknown'}: ${char.metadata?.description || char.description || 'No description'}`
  ).join('\n');

  // Default frame structure: 3-2-3 frames per scene
  const frameStructure = [3, 2, 3];
  const totalDuration = frameStructure.reduce((sum, frames) => sum + (frames * 8), 0); // 64 seconds total

  const prompt = `Base plot: ${base_plot}

Characters:
${charactersInfo}

Please enhance this plot into a detailed script with exactly ${target_scenes} scenes.

IMPORTANT FRAME STRUCTURE:
- Scene 1: 3 frames (24 seconds total - each frame is 8 seconds)
- Scene 2: 2 frames (16 seconds total - each frame is 8 seconds)
- Scene 3: 3 frames (24 seconds total - each frame is 8 seconds)
- Total film duration: 64 seconds

Each frame represents 8 seconds of video content, so plan the pacing accordingly.

Return a JSON object with:
- enhanced_plot: The enhanced plot with more detail and better pacing for ${totalDuration} seconds
- scene_breakdowns: Array of ${target_scenes} objects with:
  - scene_order: Number (1, 2, 3...)
  - scene_description: Detailed description for the entire scene
  - target_frames: Number of frames (${frameStructure.join(', ')} respectively)
  - duration: Total scene duration in seconds (frames × 8)`;

  const systemPrompt = 'You are a professional screenwriter specializing in short-form video content. Create detailed scripts with proper pacing for video generation. Remember: each frame = 8 seconds of video content. Focus on visual storytelling and clear scene progression.';

  console.log('🔍 About to call generateText with:', {
    promptLength: prompt?.length,
    systemPromptLength: systemPrompt?.length,
    promptPreview: prompt?.substring(0, 100) + '...'
  });

  
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Generated prompt is empty or undefined');
  }

  const result = await generateText(prompt, systemPrompt);

  try {
    return JSON.parse(result);
  } catch {
    return {
      enhanced_plot: result,
      scene_breakdowns: [
        { scene_order: 1, scene_description: "Opening scene", target_frames: 3, duration: 24 },
        { scene_order: 2, scene_description: "Middle scene", target_frames: 2, duration: 16 },
        { scene_order: 3, scene_description: "Closing scene", target_frames: 3, duration: 24 }
      ]
    };
  }
}

async function processLLMJob(job: Job) {
  const { project_id, input_data, type: jobType } = job.data;
  
  const jobTypeDetermined = input_data.type || jobType;

  try {
    await updateJobStatus(job.id!, 'processing', 10);

    console.log(`🤖 Processing LLM job: ${jobTypeDetermined}`);
    console.log(`🔍 Debug job data:`, {
      jobType,
      input_data_type: input_data.type,
      input_data_keys: Object.keys(input_data),
      jobTypeDetermined
    });

    let result: any;

    switch (jobTypeDetermined) {
      case 'script':
        const { prompt: scriptPrompt, context: scriptContext } = input_data;
        result = await generateProjectScript(project_id, scriptPrompt, scriptContext);
        break;
      case 'script-enhancement':
        const { base_plot, characters_context, target_scenes } = input_data;
        console.log('🔍 Script enhancement input:', { base_plot, characters_context, target_scenes });

        if (!base_plot) throw new Error('base_plot is required for script enhancement');
        if (!characters_context) throw new Error('characters_context is required for script enhancement');

        result = await enhanceScript(base_plot, characters_context, target_scenes || 3);
        break;
      case 'plot':
        const { prompt: plotPrompt, context: plotContext } = input_data;
        result = await generatePlotOutline(plotPrompt, plotContext);
        break;
      case 'object-analysis':
        result = await analyzeSceneObjects(input_data);
        break;
      case 'frame-analysis':
        result = await analyzeSceneFrames(input_data);
        break;
      default:
        const { prompt: defaultPrompt, context: defaultContext } = input_data;
        result = await generateText(defaultPrompt, defaultContext?.systemPrompt);
    }

    await updateJobStatus(job.id!, 'processing', 90);

    console.log(`✅ LLM job completed: ${jobTypeDetermined}`);
    return result;
  } catch (error) {
    console.error(`❌ LLM job failed for ${job.id}:`, error);
    throw error;
  }
}

async function processSceneGeneration(job: Job) {
  const { project_id, input_data } = job.data;
  const { scene_description, characters_context, plot_context, context } = input_data;
  
  // If context is provided, generate multiple scenes
  if (context?.plot && context?.characters) {
    return generateMultipleScenes(job, project_id, context);
  }
  
  // Otherwise, generate a single scene
  try {
    await updateJobStatus(job.id!, 'processing', 10);


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
      dialogue: string;
    }>(prompt, sceneGenerationSchema, systemPrompt);

    await updateJobStatus(job.id!, 'processing', 70);

    await updateJobStatus(job.id!, 'processing', 85);

    const result = {
      scene_data: sceneData,
      llm_generation_complete: true,
      context_tokens_available: {
        characters: characterTokens,
        objects: objectTokens
      }
    };

    console.log(`🎬 [SCENE GENERATION] LLM scene script generated`);
    return result;
  } catch (error) {
    console.error(`Scene generation failed for job ${job.id}:`, error);
    throw error;
  }
}

async function processFrameGeneration(job: Job) {
  const { project_id, input_data } = job.data;
  const { scene_id, scene_metadata, frame_index } = input_data;

  try {
    await updateJobStatus(job.id!, 'processing', 10);


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

Also provide:
- A brief summary of what happens in this frame
- The exact dialogue spoken (if any)
- Reason for splitting this frame (if applicable)
`;

    const frameData = await generateJSON<{
      veo3_prompt: string;
      dialogue: string;
      summary: string;
      split_reason: string;
    }>(prompt, frameGenerationSchema, systemPrompt);

    await updateJobStatus(job.id!, 'processing', 70);

    await updateJobStatus(job.id!, 'processing', 85);

    const result = {
      frame_data: frameData,
      referenced_ids: { characterIds, objectIds },
      context_entities_used: {
        characters: referencedCharacters.length,
        objects: referencedObjects.length
      }
    };

    console.log(`🎬 [FRAME GENERATION] Frame metadata generated`);
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
  const ENABLE_VIDEO_GENERATION = false;
  
  if (!ENABLE_VIDEO_GENERATION) {
    console.log(`🎬 [VIDEO GENERATION] Skipped video generation for frame ${frameId} (disabled by flag)`);
    return;
  }

  const videoJob = {
    id: crypto.randomUUID(),
    project_id: projectId,
    type: 'video-generation' as const,
    status: 'pending' as const,
    progress: 0,
    input_data: {
      frame_id: frameId,
      prompt: frameData.veo3_prompt,
      duration: 8, // Veo 3 always generates 8-second videos
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

async function analyzeSceneObjects(inputData: any) {
  const { scene_description, context } = inputData;
  
  const prompt = `Analyze this scene and determine what objects need to be generated for it.

Scene Description: ${scene_description}

Characters in the film: ${JSON.stringify(context.characters || [], null, 2)}

Return a list of objects that should be generated for this scene. Each object should have:
- type: The type of object (e.g., "prop", "furniture", "vehicle", "environment")
- description: A detailed description for image generation
- environmental_context: How this object fits into the scene

Consider:
1. Props mentioned in the scene
2. Environmental elements needed
3. Background objects
4. Character-specific items
5. Setting-appropriate objects

Be selective - only include objects that are important to the scene.`;

  const response = await generateJSON(prompt, {
    type: SchemaType.OBJECT,
    properties: {
      objects: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            type: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            environmental_context: { type: SchemaType.STRING }
          },
          required: ["type", "description", "environmental_context"]
        }
      }
    },
    required: ["objects"]
  });

  return response;
}

async function analyzeSceneFrames(inputData: any) {
  const { scene_description, scene_plot, context } = inputData;
  
  const prompt = `Break down this scene into individual frames (shots) for video generation. Each frame will be 8 seconds long.

Scene Description: ${scene_description}
Scene Plot: ${scene_plot || scene_description}

Characters: ${JSON.stringify(context.characters || [], null, 2)}
Objects: ${JSON.stringify(context.objects || [], null, 2)}

For each frame, provide:
- veo3_prompt: A detailed prompt for Veo 3 video generation (describe the shot, camera angle, movement, etc.)
- dialogue: Any dialogue spoken in this frame (optional)
- summary: A brief summary of what happens in this frame

Consider:
1. Establishing shots
2. Character interactions
3. Action sequences
4. Emotional beats
5. Transitions

Aim for 3-8 frames per scene depending on complexity.`;

  const response = await generateJSON(prompt, {
    type: SchemaType.OBJECT,
    properties: {
      frames: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            veo3_prompt: { type: SchemaType.STRING },
            dialogue: { 
              type: SchemaType.STRING,
              nullable: true
            },
            summary: { type: SchemaType.STRING },
          },
          required: ["veo3_prompt", "summary"]
        }
      }
    },
    required: ["frames"]
  });

  return response;
}

async function generateMultipleScenes(job: Job, projectId: string, context: any) {
  await updateJobStatus(job.id!, 'processing', 10);
  
  
  const prompt = `Based on the following plot and characters, generate a sequence of scenes for a short film.

Plot: ${context.plot}

Characters:
${context.characters.map((c: any) => `- ${c.name}: ${c.description}`).join('\n')}

Generate 3-6 scenes that tell this story. Each scene should:
1. Have a clear title
2. Have a concise plot (1-2 sentences)  
3. Have a detailed plot (full description)
4. Include a visual description for image generation
5. Be logically connected to the overall narrative
6. Be 8-30 seconds in duration

Focus on key story beats and character moments.`;

  const response = await generateJSON<{ scenes: any[] }>(prompt, {
    type: SchemaType.OBJECT,
    properties: {
      scenes: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            concise_plot: { type: SchemaType.STRING },
            detailed_plot: { type: SchemaType.STRING },
            visual_description: { type: SchemaType.STRING },
            scene_order: { type: SchemaType.NUMBER },
            duration: { 
              type: SchemaType.NUMBER,
              description: "Duration in seconds (8-30)"
            }
          },
          required: ["title", "concise_plot", "detailed_plot", "visual_description", "scene_order"]
        }
      }
    },
    required: ["scenes"]
  });

  await updateJobStatus(job.id!, 'processing', 90);
  
  console.log(`🎬 [SCENE GENERATION] Generated ${response.scenes.length} scenes`);

  return response;
}
