import { Worker, Job } from 'bullmq';
import { editImage, generateImage, generateCharacterDescription } from '../ai/gemini.js';
import { updateJobStatus, queueConnection } from '../utils/queue.js';
import { createCharacter, createObject, createFrame } from '../utils/database.js';
import { uploadBase64Image, generateFileName, StorageConfigs } from '../utils/storage.js';

const connection = queueConnection;

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
    { connection, concurrency: 3 }
  );

  const objectGenerationWorker = new Worker(
    'object-generation',
    async (job: Job) => {
      return processImageGeneration(job);
    },
    { connection, concurrency: 3 }
  );

  const imageEditingWorker = new Worker(
    'image-editing',
    async (job: Job) => {
      return processImageEditing(job);
    },
    { connection, concurrency: 2 }
  );

  console.log('Image workers created');
  return { characterGenerationWorker, objectGenerationWorker, imageEditingWorker };
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

  // Generate character image
  const imageBuffer = await generateImage(prompt);

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
        scene_id: metadata?.scene_id,
        media_url: uploadResult.url,
        metadata: objectData
      });

      return {
        type: 'object',
        object_id: object.id,
        image_url: uploadResult.url,
        object_data: objectData
      };
    } else if (type === 'frames') {
      if (!metadata?.veo3_prompt) {
        throw new Error('Veo3 prompt is required in metadata');
      }
      if (!metadata?.dialogue) {
        throw new Error('Dialogue is required in metadata');
      }
      if (!metadata?.summary) {
        throw new Error('Summary is required in metadata');
      }
      if (metadata?.frame_order === undefined) {
        throw new Error('Frame order is required in metadata');
      }
      if (!metadata?.split_reason) {
        throw new Error('Split reason is required in metadata');
      }

      const frameData = {
        veo3_prompt: metadata.veo3_prompt,
        dialogue: metadata.dialogue,
        summary: metadata.summary,
        split_reason: metadata.split_reason,
        frame_order: metadata.frame_order
      };

      // Upload to Supabase storage
      const fileName = generateFileName('frame.png', `frame_${Date.now()}`);
      const uploadResult = await uploadBase64Image(dataUrl, fileName, StorageConfigs.frame);

      const frame = await createFrame({
        project_id,
        scene_id: metadata?.scene_id,
        media_url: uploadResult.url,
        metadata: frameData
      });

      return {
        type: 'frame',
        frame_id: frame.id,
        image_url: uploadResult.url,
        frame_data: frameData
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