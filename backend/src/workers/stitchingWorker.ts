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

    console.log(`🎞️  [VIDEO STITCHING] Stitching ${video_urls.length} videos for project ${project_id}`);

    // Download videos temporarily for stitching
    const videoPaths: string[] = [];
    
    for (let i = 0; i < video_urls.length; i++) {
      const videoUrl = video_urls[i];
      
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

    await stitchVideos(videoPaths, outputPath, options);

    await updateJobStatus(job.id!, 'processing', 80);

    // Upload the final video to Supabase storage
    const finalVideoBuffer = await readFile(outputPath);
    const base64Video = finalVideoBuffer.toString('base64');
    const dataUrl = `data:video/mp4;base64,${base64Video}`;

    const { uploadBase64Image, generateFileName, StorageConfigs } = await import('../utils/storage.js');
    const fileName = generateFileName('final_video.mp4', `final_${Date.now()}`);
    const uploadResult = await uploadBase64Image(dataUrl, fileName, StorageConfigs.frame);

    await updateJobStatus(job.id!, 'processing', 95);

    // Also store the final video URL in the project table for easy access
    try {
      const { getDatabase } = await import('../utils/database.js');
      const db = getDatabase();

      const { error: updateError } = await db
        .from('projects')
        .update({
          final_video_url: uploadResult.url,
          updated_at: new Date().toISOString()
        })
        .eq('id', project_id);

      if (updateError) {
        console.error(`🎞️  [VIDEO STITCHING] Failed to update project ${project_id} with final video URL:`, updateError);
      } else {
        console.log(`🎞️  [VIDEO STITCHING] Updated project ${project_id} with final video URL`);
      }
    } catch (dbError) {
      console.error(`🎞️  [VIDEO STITCHING] Database error updating project:`, dbError);
    }

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
      video_url: uploadResult.url, // Use the Supabase storage URL
      filename: outputFilename,
      input_videos: video_urls,
      video_count: video_urls.length,
      options,
      stitched_at: new Date().toISOString()
    };

    console.log(`🎞️  [VIDEO STITCHING] Video stitching completed: ${outputFilename} (${finalVideoBuffer.length} bytes)`);
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