import { Worker, Job } from 'bullmq';
import { generateImage, editImage } from '../ai/gemini.js';
import { saveBlobFile, generateAssetFilename } from '../utils/blob.js';
import { updateJobStatus, queueConnection } from '../utils/queue.js';

// Use shared connection from queue.js to ensure event listeners work
const connection = queueConnection;

export function createImageWorkers() {
  const characterGenerationWorker = new Worker(
    'character-generation',
    async (job: Job) => {
      console.log(`🚨 [WORKER DEBUG] ========================================`);
      console.log(`🚨 [WORKER DEBUG] WORKER CALLED! Job: ${job.id}`);
      console.log(`🚨 [WORKER DEBUG] ========================================`);

      try {
        const result = await processImageGeneration(job);
        console.log(`🚨 [WORKER DEBUG] Job ${job.id} completed successfully!`);
        console.log(`🚨 [WORKER DEBUG] Result:`, JSON.stringify(result, null, 2));
        console.log(`🚨 [WORKER DEBUG] ========================================`);
        return result;
      } catch (error) {
        console.error(`🚨 [WORKER DEBUG] Job ${job.id} FAILED!`);
        console.error(`🚨 [WORKER DEBUG] Error:`, error);
        console.error(`🚨 [WORKER DEBUG] ========================================`);
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

async function processImageGeneration(job: Job) {
  console.log('🚨 [WORKER] processImageGeneration started for job:', job.id);

  // Start with a simple test return
  console.log('🚨 [WORKER] Testing simple return...');

  try {
    await updateJobStatus(job.id!, 'processing', 30);

    const { project_id, input_data } = job.data;
    const { prompt, type, metadata } = input_data;

    if (type === 'characters') {
      return {
        type: 'character',
        character_id: `char_${job.id}`,
        character_data: {
          name: metadata?.name || 'Generated Character',
          description: prompt,
          generated_at: new Date().toISOString()
        }
      };
    } else if (type === 'objects') {
      const imageUrl = `/blob/${project_id}/objects/mock_object_${job.id}.png`;
      return {
        type: 'object',
        image_url: imageUrl,
        filename: `mock_object_${job.id}.png`,
        file_size: 1024 * 100, // Mock 100KB
        object_type: metadata?.type || 'object',
        generated_at: new Date().toISOString()
      };
    }

    return {
      type: 'unknown',
      job_id: job.id,
      message: 'Test result - job type not recognized'
    };

  } catch (error) {
    console.error('🚨 [WORKER] Error in test worker:', error);
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