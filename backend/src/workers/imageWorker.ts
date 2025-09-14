import { Worker, Job } from 'bullmq';
import { editImage, generateImage, generateCharacterDescription, generateJSONWithImages, parseReferencedIds } from '../ai/gemini.js';
import { updateJobStatus, queueConnection, addJob } from '../utils/queue.js';
import { createCharacter, createObject, createFrame, createScene } from '../utils/database.js';
import { uploadBase64Image, generateFileName, StorageConfigs } from '../utils/storage.js';
import { buildSceneContext, buildFrameContext, formatContextForPrompt } from '../utils/context.js';
import { SchemaType, type Schema } from '@google/generative-ai';

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
    summary: {
      type: SchemaType.STRING,
      description: "Brief summary of what happens in this frame"
    },
    split_reason: {
      type: SchemaType.STRING,
      description: "Reason for frame splitting if needed"
    }
  },
  required: ["veo3_prompt", "dialogue", "summary"]
};

export function createImageWorkers() {

  const characterGenerationWorker = new Worker(
    'character-generation',
    async (job: Job) => {
      try {
        const result = await processCharacterGeneration(job);
        console.log(`👤 [CHARACTER GENERATION] Job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        console.error(`👤 [CHARACTER GENERATION] Job ${job.id} failed:`, error);
        throw error;
      }
    },
    { connection, concurrency: 10 }
  );

  const objectGenerationWorker = new Worker(
    'object-generation',
    async (job: Job) => {
      return processImageGeneration(job);
    },
    { connection, concurrency: 6 }
  );

  const frameGenerationWorker = new Worker(
    'frame-generation',
    async (job: Job) => {
      return processFrameGeneration(job);
    },
    { connection, concurrency: 10 }
  );

  const sceneGenerationWorker = new Worker(
    'scene-generation',
    async (job: Job) => {
      return processSceneGeneration(job);
    },
    { connection, concurrency: 6 }
  );

  const imageEditingWorker = new Worker(
    'image-editing',
    async (job: Job) => {
      return processImageEditing(job);
    },
    { connection, concurrency: 6 }
  );

  return { characterGenerationWorker, objectGenerationWorker, imageEditingWorker, frameGenerationWorker, sceneGenerationWorker };
}

async function processCharacterGeneration(job: Job) {
  const { project_id, input_data } = job.data;
  const { prompt, metadata } = input_data || {};

  if (!project_id) {
    throw new Error('Project ID is required for character generation');
  }
  if (!prompt) {
    throw new Error('Character prompt is required');
  }

  await updateJobStatus(job.id!, 'processing', 20);

  // Generate character description using LLM - use the prompt which should have all info
  const characterData = await generateCharacterDescription(prompt, '');
  
  await updateJobStatus(job.id!, 'processing', 50);

  // Generate character image with specific style requirements
  const characterImagePrompt = `Generate an image. Full body shot, standing pose, neutral expression, realistic photography style, professional lighting, clean background, high detail, cinematic quality. Context: ${prompt}.`;
  const imageBuffer = await generateImage(characterImagePrompt);

  await updateJobStatus(job.id!, 'processing', 60);

  // Upload image to Supabase storage
  const fileName = generateFileName('character.png', `char_${Date.now()}`);
  const uploadResult = await uploadBase64Image(
    `data:image/png;base64,${imageBuffer.toString('base64')}`,
    fileName,
    StorageConfigs.character
  );

  await updateJobStatus(job.id!, 'processing', 80);

  // Create character in database with Supabase storage URL
  const character = await createCharacter({
    project_id,
    media_url: uploadResult.url,
    metadata: characterData
  });

  await updateJobStatus(job.id!, 'processing', 100);

  return {
    type: 'character',
    character_id: character.id,
    image_url: uploadResult.url,
    character_data: characterData
  };
}

async function processImageGeneration(job: Job) {

  try {
    await updateJobStatus(job.id!, 'processing', 10);

    const { project_id, input_data } = job.data;
    const { prompt, type, metadata } = input_data;

    console.log(`🎨 [IMAGE GENERATION] Generating ${type} image: ${prompt.substring(0, 50)}...`);

    await updateJobStatus(job.id!, 'processing', 30);

    const imageBuffer = await generateImage(prompt, {
      width: input_data.width || 1024,
      height: input_data.height || 1024
    });

    await updateJobStatus(job.id!, 'processing', 70);

    // Upload image to Supabase storage
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    await updateJobStatus(job.id!, 'processing', 90);

    if (type === 'objects') {
      // Create object in database with image URL
      if (!metadata?.type) {
        throw new Error('Object type is required in metadata');
      }
      if (!metadata?.environmental_context) {
        throw new Error('Environmental context is required in metadata');
      }

      const objectData = {
        type: metadata.type,
        description: prompt,
        environmental_context: metadata.environmental_context
      };

      // Upload to Supabase storage
      const fileName = generateFileName('object.png', `obj_${Date.now()}`);
      const uploadResult = await uploadBase64Image(dataUrl, fileName, StorageConfigs.object);

      const object = await createObject({
        project_id,
        scene_id: input_data.scene_id,
        media_url: uploadResult.url,
        metadata: objectData
      });

      return {
        type: 'object',
        object_id: object.id,
        image_url: uploadResult.url,
        object_data: objectData
      };
    }

    return {
      type: 'unknown',
      job_id: job.id,
      image_url: dataUrl, // fallback to data URL for unknown types
      message: 'Generated image but type not recognized'
    };

  } catch (error) {
    console.error(`❌ Image generation failed for job ${job.id}:`, error);
    throw error;
  }
}

async function processImageEditing(job: Job) {
  const { input_data } = job.data;
  const { source_url, edit_prompt, type, metadata } = input_data;

  try {
    await updateJobStatus(job.id!, 'processing', 10);

    console.log(`✏️  [IMAGE EDITING] Editing image: ${edit_prompt.substring(0, 50)}...`);

    let sourceBuffer: Buffer;

    if (source_url.startsWith('data:image/')) {
      const base64Data = source_url.split(',')[1];
      sourceBuffer = Buffer.from(base64Data, 'base64');
    } else {
      const response = await fetch(source_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch source image: ${response.status}`);
      }
      sourceBuffer = Buffer.from(await response.arrayBuffer());
    }

    await updateJobStatus(job.id!, 'processing', 30);

    const editedBuffer = await editImage(sourceBuffer, edit_prompt);

    await updateJobStatus(job.id!, 'processing', 70);

    // Upload edited image to Supabase storage
    const base64Image = editedBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;
    const fileName = generateFileName('edited.png', `edit_${Date.now()}`);
    const uploadResult = await uploadBase64Image(dataUrl, fileName, StorageConfigs.object); // Use object config for edited images

    await updateJobStatus(job.id!, 'processing', 90);

    const result = {
      type,
      image_url: uploadResult.url,
      edit_prompt,
      source_url,
      metadata,
      edited_at: new Date().toISOString()
    };

    console.log(`✏️  [IMAGE EDITING] Image edited: ${type} (${editedBuffer.length} bytes)`);
    return result;
  } catch (error) {
    console.error(`❌ Image editing failed for job ${job.id}:`, error);
    throw error;
  }
}

async function processSceneGeneration(job: Job) {
  const { project_id, input_data } = job.data;
  const { scene_description, characters_context, plot_context, scene_metadata, contextData: existingContextData, target_frames } = input_data;

  try {
    await updateJobStatus(job.id!, 'processing', 10);

    let sceneData;
    let contextData;

    if (scene_metadata && existingContextData) {
      sceneData = scene_metadata;
      contextData = existingContextData;
      await updateJobStatus(job.id!, 'processing', 50);
    } else {
      contextData = await buildSceneContext(project_id);
      const formattedContext = formatContextForPrompt(contextData);

      await updateJobStatus(job.id!, 'processing', 30);

      const characterTokens = contextData.characters.map((c: any) => `<|character_${c.id}|>`);
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

      // Build image context from characters and objects with media URLs
      const imageContexts: { url: string; description: string }[] = [];

      for (const character of contextData.characters) {
        if (character.media_url) {
          imageContexts.push({
            url: character.media_url,
            description: `Character reference: ${character.name} - ${character.description}`
          });
        }
      }

      for (const object of contextData.objects) {
        if (object.media_url) {
          imageContexts.push({
            url: object.media_url,
            description: `Object reference: ${object.type} - ${object.description}`
          });
        }
      }

      // Log scene generation context to file
      const fs = await import('fs');
      const path = await import('path');
      const testDir = path.join(process.cwd(), 'test-image-context');

      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const sceneLogPath = path.join(testDir, `scene_generation_${Date.now()}.log`);
      const sceneLogData = {
        timestamp: new Date().toISOString(),
        type: 'SCENE_GENERATION',
        job_id: job.id,
        project_id,
        scene_description,
        characters_context,
        plot_context,
        contextData_summary: {
          characters: contextData.characters.map((c: any) => ({ id: c.id, name: c.name, has_media_url: !!c.media_url })),
          objects: contextData.objects.map((o: any) => ({ id: o.id, type: o.type, has_media_url: !!o.media_url }))
        },
        imageContexts_count: imageContexts.length,
        imageContexts: imageContexts,
        prompt_length: prompt.length
      };

      fs.writeFileSync(sceneLogPath, JSON.stringify(sceneLogData, null, 2));

      // Use generateJSONWithImages to include visual context
      sceneData = await generateJSONWithImages<{
        detailed_plot: string;
        concise_plot: string;
        dialogue: string;
      }>(prompt, sceneGenerationSchema, systemPrompt, imageContexts.length > 0 ? imageContexts : undefined);

      await updateJobStatus(job.id!, 'processing', 50);
    }

    const imagePrompt = `${sceneData.detailed_plot}. Wide angle establishing shot, cinematic composition showing the full environment and all elements in the scene, unique and distinctive visual style, professional cinematography, detailed lighting, high quality, film production value, comprehensive view of the setting`;
    const imageBuffer = await generateImage(imagePrompt);

    await updateJobStatus(job.id!, 'processing', 70);

    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;
    const fileName = generateFileName('scene.png', `scene_${Date.now()}`);
    const uploadResult = await uploadBase64Image(dataUrl, fileName, StorageConfigs.frame);

    await updateJobStatus(job.id!, 'processing', 85);

    const sceneOrder = 0;

    const scene = await createScene({
      project_id,
      media_url: uploadResult.url,
      metadata: {
        detailed_plot: sceneData.detailed_plot,
        concise_plot: sceneData.concise_plot,
        dialogue: sceneData.dialogue,
        scene_order: sceneOrder
      }
    });

    await updateJobStatus(job.id!, 'processing', 95);

    await triggerFrameGeneration(project_id, scene.id, sceneData, contextData, target_frames);

    const characterTokens = contextData.characters.map((c: any) => `<|character_${c.id}|>`);
    const objectTokens = contextData.objects.map((o: any) => `<|object_${o.id}|>`);

    const result = {
      scene_id: scene.id,
      scene_data: sceneData,
      image_url: uploadResult.url,
      frames_triggered: true,
      context_tokens_available: {
        characters: characterTokens,
        objects: objectTokens
      }
    };

    console.log(`🎬 [SCENE GENERATION] Scene generated: ${scene.id}`);
    return result;
  } catch (error) {
    console.error(`❌ Scene generation failed for job ${job.id}:`, error);
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
    const referencedCharacters = contextData.characters.filter((c: any) => characterIds.includes(c.id));
    const referencedObjects = contextData.objects.filter((o: any) => objectIds.includes(o.id));

    await updateJobStatus(job.id!, 'processing', 50);

    const systemPrompt = `You are a video prompt engineer. Generate a detailed Veo 3 video prompt for this frame representing ${frame_index * 8}-${(frame_index + 1) * 8} seconds of the scene.`;

    const timeStart = frame_index * 8;
    const timeEnd = (frame_index + 1) * 8;

    const prompt = `
Frame Index: ${frame_index} (Time: ${timeStart}s-${timeEnd}s of scene)

${formattedContext}

Referenced Entities in Frame:
Characters: ${referencedCharacters.map((c: any) => `<|character_${c.id}|> ${c.name}: ${c.description}`).join(', ')}
Objects: ${referencedObjects.map((o: any) => `<|object_${o.id}|> ${o.type}: ${o.description}`).join(', ')}

Generate a Veo 3 video prompt for frame ${frame_index + 1} (${timeStart}s-${timeEnd}s):
- This frame represents the INITIAL state at second ${timeStart} of the scene
- Generate what the scene looks like at this specific moment in time
- Show temporal progression from previous frames if frame_index > 0
- Duration: exactly 8 seconds of video content
- Cinematic quality with specific camera angles
- Clear dialogue timing within this 8-second window
- Visual consistency with character/object descriptions
- Consider what actions/movements happen between ${timeStart}s-${timeEnd}s

Also provide:
- A brief summary of what happens during seconds ${timeStart}-${timeEnd}
- The exact dialogue spoken during this time window
- Reason for splitting this frame (if applicable)
`;

    const imageContexts: { url: string; description: string }[] = [];

    for (const character of referencedCharacters) {
      if (character.media_url) {
        imageContexts.push({
          url: character.media_url,
          description: `Character reference: ${character.name} - ${character.description}`
        });
      }
    }

    for (const object of referencedObjects) {
      if (object.media_url) {
        imageContexts.push({
          url: object.media_url,
          description: `Object reference: ${object.type} - ${object.description}`
        });
      }
    }

    // Log frame generation context to file
    const fs = await import('fs');
    const path = await import('path');
    const testDir = path.join(process.cwd(), 'test-image-context');

    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const frameLogPath = path.join(testDir, `frame_generation_${Date.now()}.log`);
    const frameLogData = {
      timestamp: new Date().toISOString(),
      type: 'FRAME_GENERATION',
      job_id: job.id,
      project_id,
      scene_id,
      frame_index,
      timeStart,
      timeEnd,
      scene_metadata,
      referencedEntities: {
        characterIds,
        objectIds,
        referencedCharacters: referencedCharacters.map((c: any) => ({ id: c.id, name: c.name, has_media_url: !!c.media_url })),
        referencedObjects: referencedObjects.map((o: any) => ({ id: o.id, type: o.type, has_media_url: !!o.media_url }))
      },
      imageContexts_count: imageContexts.length,
      imageContexts: imageContexts,
      prompt_length: prompt.length
    };

    fs.writeFileSync(frameLogPath, JSON.stringify(frameLogData, null, 2));

    const frameData = await generateJSONWithImages<{
      veo3_prompt: string;
      dialogue: string;
      summary: string;
      split_reason: string;
    }>(prompt, frameGenerationSchema, systemPrompt, imageContexts.length > 0 ? imageContexts : undefined);

    await updateJobStatus(job.id!, 'processing', 65);

    // Generate image for the frame - represents initial state of 8-second segment
    const imagePrompt = `${frameData.veo3_prompt}. Initial frame representing second ${timeStart} of scene. Cinematic still frame, high quality, professional film production, freeze frame from video at ${timeStart}s timestamp, dynamic composition ready for 8-second video sequence`;
    const imageBuffer = await generateImage(imagePrompt);

    await updateJobStatus(job.id!, 'processing', 80);

    // Upload frame image to Supabase storage
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;
    const fileName = generateFileName('frame.png', `frame_${Date.now()}`);
    const uploadResult = await uploadBase64Image(dataUrl, fileName, StorageConfigs.frame);

    await updateJobStatus(job.id!, 'processing', 90);

    const frameOrder = frame_index || 0;

    // Create frame in database with media_url
    const frame = await createFrame({
      project_id,
      scene_id,
      media_url: uploadResult.url,
      metadata: {
        veo3_prompt: frameData.veo3_prompt,
        dialogue: frameData.dialogue,
        summary: frameData.summary,
        split_reason: frameData.split_reason,
        frame_order: frameOrder
      }
    });

    await updateJobStatus(job.id!, 'processing', 95);

    // Trigger video generation
    await triggerVideoGeneration(project_id, frame.id, frameData);

    const result = {
      frame_id: frame.id,
      frame_data: frameData,
      image_url: uploadResult.url,
      video_triggered: true,
      referenced_ids: { characterIds, objectIds },
      context_entities_used: {
        characters: referencedCharacters.length,
        objects: referencedObjects.length
      }
    };

    console.log(`🎬 [FRAME GENERATION] Frame generated: ${frame.id}`);
    return result;
  } catch (error) {
    console.error(`❌ Frame generation failed for job ${job.id}:`, error);
    throw error;
  }
}

async function triggerFrameGeneration(projectId: string, sceneId: string, sceneData: any, contextData: any, targetFrames: number) {
  const frameCount = targetFrames;

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
        scene_context: contextData,
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