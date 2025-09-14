import { Worker, Job } from 'bullmq';
import { stitchVideos } from '../ai/ffmpeg.js';
import { updateJobStatus, queueConnection } from '../utils/queue.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, readFile, unlink } from 'fs/promises';

const connection = queueConnection;

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

  const tempFiles: string[] = [];

  try {
    await updateJobStatus(job.id!, 'processing', 10);

    console.log(`🎞️  Stitching ${video_urls.length} videos for project ${project_id}`);

    // Download videos temporarily for stitching
    const videoPaths: string[] = [];
    
    for (let i = 0; i < video_urls.length; i++) {
      const videoUrl = video_urls[i];
      console.log(`⬇️  Downloading video ${i + 1}/${video_urls.length}...`);
      
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video ${i + 1}: ${response.status}`);
      }
      
      const videoBuffer = Buffer.from(await response.arrayBuffer());
      const tempPath = join(tmpdir(), `video_${job.id}_${i}.mp4`);
      
      await writeFile(tempPath, videoBuffer);
      videoPaths.push(tempPath);
      tempFiles.push(tempPath);
      
      await updateJobStatus(job.id!, 'processing', 10 + (i + 1) * 15);
    }

    await updateJobStatus(job.id!, 'processing', 40);

    const outputFilename = `${output_name || 'final'}_${Date.now()}.mp4`;
    const outputPath = join(tmpdir(), outputFilename);
    tempFiles.push(outputPath);

    console.log(`🎞️  Starting FFmpeg stitching...`);
    await stitchVideos(videoPaths, outputPath, options);

    await updateJobStatus(job.id!, 'processing', 80);

    // Read the final video and convert to base64 data URL
    const finalVideoBuffer = await readFile(outputPath);
    const base64Video = finalVideoBuffer.toString('base64');
    const finalVideoUrl = `data:video/mp4;base64,${base64Video}`;

    await updateJobStatus(job.id!, 'processing', 90);

    // Clean up temporary files
    for (const tempFile of tempFiles) {
      try {
        await unlink(tempFile);
      } catch (error) {
        console.warn(`⚠️  Failed to cleanup temp file: ${tempFile}`);
      }
    }

    const result = {
      type: 'final_video',
      video_url: finalVideoUrl,
      filename: outputFilename,
      input_videos: video_urls,
      video_count: video_urls.length,
      options,
      stitched_at: new Date().toISOString()
    };

    console.log(`✅ Video stitching completed: ${outputFilename} (${finalVideoBuffer.length} bytes)`);
    return result;
  } catch (error) {
    // Clean up temporary files on error
    for (const tempFile of tempFiles) {
      try {
        await unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
    
    console.error(`❌ Video stitching failed for job ${job.id}:`, error);
    throw error;
  }
}