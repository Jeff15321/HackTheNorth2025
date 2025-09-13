import { Worker, Job } from 'bullmq';
import { stitchVideos } from '../ai/ffmpeg.js';
import { getBlobPath, generateAssetFilename } from '../utils/blob.js';
import { updateJobStatus } from '../utils/queue.js';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_DB || '0')
};

export function createStitchingWorker() {
  const stitchingWorker = new Worker(
    'video-stitching',
    async (job: Job) => {
      return processVideoStitching(job);
    },
    { connection, concurrency: 1 }
  );

  console.log('🎞️  Stitching worker created');
  return stitchingWorker;
}

async function processVideoStitching(job: Job) {
  const { project_id, input_data } = job.data;
  const { video_urls, output_name, options } = input_data;

  try {
    await updateJobStatus(job.id!, 'processing', 10);

    console.log(`🎞️  Stitching ${video_urls.length} videos for project ${project_id}`);

    const videoPaths: string[] = [];

    for (const videoUrl of video_urls) {
      const urlParts = videoUrl.split('/');
      const projectId = urlParts[urlParts.length - 3];
      const type = urlParts[urlParts.length - 2];
      const filename = urlParts[urlParts.length - 1];

      const videoPath = getBlobPath(projectId, type as any, filename);
      videoPaths.push(videoPath);
    }

    await updateJobStatus(job.id!, 'processing', 30);

    const outputFilename = generateAssetFilename('videos', 'mp4', output_name || 'final');
    const outputPath = getBlobPath(project_id, 'videos', outputFilename);

    console.log(`🎞️  Starting FFmpeg stitching...`);
    await stitchVideos(videoPaths, outputPath, options);

    await updateJobStatus(job.id!, 'processing', 90);

    const { readFile } = await import('fs/promises');
    const finalVideoBuffer = await readFile(outputPath);

    const finalVideoUrl = `/blob/${project_id}/videos/${outputFilename}`;

    const result = {
      type: 'final_video',
      video_url: finalVideoUrl,
      filename: outputFilename,
      input_videos: video_urls,
      file_size: finalVideoBuffer.length,
      video_count: video_urls.length,
      options
    };

    console.log(`✅ Video stitching completed: ${outputFilename} (${finalVideoBuffer.length} bytes)`);
    return result;
  } catch (error) {
    console.error(`❌ Video stitching failed for job ${job.id}:`, error);
    throw error;
  }
}