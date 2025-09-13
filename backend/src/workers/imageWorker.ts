import { Worker, Job } from 'bullmq';
import { generateImage, editImage } from '../ai/gemini.js';
import { saveBlobFile, generateAssetFilename } from '../utils/blob.js';
import { updateJobStatus } from '../utils/queue.js';
import { createCharacter, createObject } from '../utils/database.js';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_DB || '0')
};

export function createImageWorkers() {
  const characterGenerationWorker = new Worker(
    'character-generation',
    async (job: Job) => {
      return processImageGeneration(job);
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

async function processImageGeneration(job: Job) {
  const { project_id, input_data } = job.data;
  const { prompt, type, width, height, metadata } = input_data;

  try {
    await updateJobStatus(job.id!, 'processing', 10);

    console.log(`🖼️  Generating ${type}: ${prompt.substring(0, 50)}...`);

    await updateJobStatus(job.id!, 'processing', 30);

    const imageBuffer = await generateImage(prompt, { width, height });

    await updateJobStatus(job.id!, 'processing', 70);

    const filename = generateAssetFilename(type, 'png', metadata?.name);
    const imageUrl = await saveBlobFile(project_id, type, filename, imageBuffer);

    await updateJobStatus(job.id!, 'processing', 90);

    let result = {
      type,
      image_url: imageUrl,
      filename,
      prompt,
      metadata,
      file_size: imageBuffer.length
    };

    if (type === 'characters') {
      const character = await createCharacter({
        project_id,
        media_url: imageUrl,
        metadata: {
          name: metadata?.name || 'Unnamed Character',
          description: prompt,
          personality: metadata?.personality || 'Unknown personality'
        }
      });

      result = {
        ...result,
        character_id: character.id,
        character: {
          ...character,
          created_at: character.created_at?.toString()
        }
      } as any;
    } else if (type === 'objects') {
      const object = await createObject({
        project_id,
        media_url: imageUrl,
        metadata: {
          type: metadata?.type || 'object',
          description: prompt,
          environmental_context: metadata?.environmental_context || 'General environment'
        }
      });

      result = {
        ...result,
        object_id: object.id,
        object: {
          ...object,
          created_at: object.created_at?.toString()
        }
      } as any;
    }

    console.log(`✅ Image generated: ${type} (${imageBuffer.length} bytes)`);
    return result;
  } catch (error) {
    console.error(`❌ Image generation failed for job ${job.id}:`, error);
    throw error;
  }
}

async function processImageEditing(job: Job) {
  const { project_id, input_data } = job.data;
  const { source_url, edit_prompt, type, metadata } = input_data;

  try {
    await updateJobStatus(job.id!, 'processing', 10);

    console.log(`✏️  Editing image: ${edit_prompt.substring(0, 50)}...`);

    const response = await fetch(source_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch source image: ${response.status}`);
    }

    const sourceBuffer = Buffer.from(await response.arrayBuffer());

    await updateJobStatus(job.id!, 'processing', 30);

    const editedBuffer = await editImage(sourceBuffer, edit_prompt);

    await updateJobStatus(job.id!, 'processing', 70);

    const filename = generateAssetFilename(type, 'png', 'edited');
    const imageUrl = await saveBlobFile(project_id, type, filename, editedBuffer);

    await updateJobStatus(job.id!, 'processing', 90);

    const result = {
      type,
      image_url: imageUrl,
      filename,
      edit_prompt,
      source_url,
      metadata,
      file_size: editedBuffer.length
    };

    console.log(`✅ Image edited: ${type} (${editedBuffer.length} bytes)`);
    return result;
  } catch (error) {
    console.error(`❌ Image editing failed for job ${job.id}:`, error);
    throw error;
  }
}