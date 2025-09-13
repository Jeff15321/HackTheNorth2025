import { Worker, Job } from 'bullmq';
import { generateVideoFromImage, generateVideoFromText, downloadVideo, type VideoGenerationOptions } from '../ai/fal.js';
import { saveBlobFile, generateAssetFilename } from '../utils/blob.js';
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
  const { project_id, input_data } = job.data;
  const { prompt, image_url, metadata } = input_data;

  try {
    await updateJobStatus(job.id!, 'processing', 10);

    console.log(`🎬 Generating video: ${prompt.substring(0, 50)}...`);

    const videoOptions: VideoGenerationOptions = {
      aspect_ratio: '16:9',
      duration: '8s',
      generate_audio: true,
      resolution: '720p'
    };

    let videoUrl: string;

    if (image_url) {
      await updateJobStatus(job.id!, 'processing', 20);
      videoUrl = await generateVideoFromImage(image_url, prompt, videoOptions);
    } else {
      await updateJobStatus(job.id!, 'processing', 20);
      videoUrl = await generateVideoFromText(prompt, videoOptions);
    }

    await updateJobStatus(job.id!, 'processing', 60);

    console.log(`⬇️  Downloading video from fal.ai...`);
    const videoBuffer = await downloadVideo(videoUrl);

    await updateJobStatus(job.id!, 'processing', 80);

    const filename = generateAssetFilename('videos', 'mp4', metadata?.name);
    const localVideoUrl = await saveBlobFile(project_id, 'videos', filename, videoBuffer);

    await updateJobStatus(job.id!, 'processing', 95);

    const result = {
      type: 'video',
      video_url: localVideoUrl,
      original_url: videoUrl,
      filename,
      prompt,
      image_url,
      metadata,
      options: videoOptions,
      file_size: videoBuffer.length
    };

    console.log(`✅ Video generated: ${filename} (${videoBuffer.length} bytes)`);
    return result;
  } catch (error) {
    console.error(`❌ Video generation failed for job ${job.id}:`, error);
    throw error;
  }
}