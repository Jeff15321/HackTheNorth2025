import { Worker, Job } from 'bullmq';
import { generateVideoFromImage, generateVideoFromText, type VideoGenerationOptions } from '../ai/fal.js';
import { updateJobStatus, queueConnection } from '../utils/queue.js';

// Use shared connection from queue.js to ensure event listeners work
const connection = queueConnection;

export function createVideoWorker() {
  const videoWorker = new Worker(
    'video-generation',
    async (job: Job) => {
      return processVideoGeneration(job);
    },
    { connection, concurrency: 30 }
  );

  console.log('🎬 Video worker created');
  return videoWorker;
}

async function processVideoGeneration(job: Job) {
  const { input_data } = job.data;
  const { prompt, image_url, metadata } = input_data;

  try {
    await updateJobStatus(job.id!, 'processing', 10);

    console.log(`🎬 [VIDEO GENERATION] Generating video: ${prompt.substring(0, 50)}...`);

    const videoOptions: VideoGenerationOptions = {
      aspect_ratio: '16:9',
      duration: '8s',
      generate_audio: true,
      resolution: '720p'
    };

    let videoUrl: string;

    if (image_url) {
      await updateJobStatus(job.id!, 'processing', 30);
      videoUrl = await generateVideoFromImage(image_url, prompt, videoOptions);
    } else {
      await updateJobStatus(job.id!, 'processing', 30);
      videoUrl = await generateVideoFromText(prompt, videoOptions);
    }

    await updateJobStatus(job.id!, 'processing', 90);

    // Update the frame in database with video_url if frame_id is provided
    if (metadata?.frame_id) {
      try {
        const { getDatabase } = await import('../utils/database.js');
        const db = getDatabase();

        const { error: updateError } = await db
          .from('frames')
          .update({
            video_url: videoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', metadata.frame_id);

        if (updateError) {
          console.error(`🎬 [VIDEO GENERATION] Failed to update frame ${metadata.frame_id} with video URL:`, updateError);
        } else {
          console.log(`🎬 [VIDEO GENERATION] Updated frame ${metadata.frame_id} with video URL`);
        }
      } catch (dbError) {
        console.error(`🎬 [VIDEO GENERATION] Database error updating frame:`, dbError);
      }
    }

    const result = {
      type: 'video',
      video_url: videoUrl,
      prompt,
      image_url,
      metadata,
      options: videoOptions,
      generated_at: new Date().toISOString()
    };

    console.log(`🎬 [VIDEO GENERATION] Video generated successfully: ${videoUrl}`);
    return result;
  } catch (error) {
    console.error(`❌ Video generation failed for job ${job.id}:`, error);
    throw error;
  }
}