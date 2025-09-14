import { jobApi } from './api';

export interface ImageEditingJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  resultUrl?: string;
  error?: string;
}

// Track ongoing image editing jobs
const activeJobs = new Map<string, ImageEditingJob>();

export async function editImage(params: {
  projectId: string;
  sourceUrl: string;
  editPrompt: string;
  metadata?: any;
}): Promise<string> {
  const { projectId, sourceUrl, editPrompt, metadata } = params;

  const result = await jobApi.createImageEditing({
    project_id: projectId,
    source_url: sourceUrl,
    edit_prompt: editPrompt,
    metadata
  });

  // Track the job
  activeJobs.set(result.job_id, {
    jobId: result.job_id,
    status: 'pending',
    progress: 0
  });

  return result.job_id;
}

export async function editCharacterImage(params: {
  projectId: string;
  characterId: string;
  sourceUrl: string;
  editPrompt: string;
  metadata?: any;
}): Promise<string> {
  const { projectId, characterId, sourceUrl, editPrompt, metadata } = params;

  const result = await jobApi.createImageEditing({
    project_id: projectId,
    source_url: sourceUrl,
    edit_prompt: editPrompt,
    metadata: {
      ...metadata,
      character_id: characterId,
      edit_type: 'character'
    }
  });

  // Track the job
  activeJobs.set(result.job_id, {
    jobId: result.job_id,
    status: 'pending',
    progress: 0
  });

  return result.job_id;
}

export async function checkEditingJobStatus(jobId: string): Promise<ImageEditingJob> {
  const cachedJob = activeJobs.get(jobId);

  try {
    const status = await jobApi.getStatus(jobId);

    const updatedJob: ImageEditingJob = {
      jobId,
      status: status.status as any,
      progress: status.progress,
      resultUrl: status.output_data?.media_url as string,
      error: status.error_message
    };

    // Update cache
    activeJobs.set(jobId, updatedJob);

    // Clean up completed/failed jobs after some time
    if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
      setTimeout(() => activeJobs.delete(jobId), 60000); // Clean up after 1 minute
    }

    return updatedJob;
  } catch (error) {
    // If we can't get status, return cached version or create error job
    return cachedJob || {
      jobId,
      status: 'failed',
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function getActiveJobs(): ImageEditingJob[] {
  return Array.from(activeJobs.values());
}

export function getJobById(jobId: string): ImageEditingJob | undefined {
  return activeJobs.get(jobId);
}

// Utility to convert canvas/image to file for editing
export function canvasToFile(canvas: HTMLCanvasElement, filename: string = 'edited-image.png'): Promise<File> {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], filename, { type: 'image/png' }));
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png');
  });
}

// Utility to download image from URL as File
export async function urlToFile(url: string, filename: string = 'image.png'): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || 'image/png' });
}

// Refresh functionality - poll for updates
export class ImageEditingRefreshManager {
  private intervals = new Map<string, NodeJS.Timeout>();

  startPolling(
    jobId: string,
    onUpdate: (job: ImageEditingJob) => void,
    intervalMs: number = 2000
  ) {
    // Clear existing interval if any
    this.stopPolling(jobId);

    const interval = setInterval(async () => {
      try {
        const job = await checkEditingJobStatus(jobId);
        onUpdate(job);

        // Stop polling if job is complete
        if (job.status === 'completed' || job.status === 'failed') {
          this.stopPolling(jobId);
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        // Don't stop polling on error, just log it
      }
    }, intervalMs);

    this.intervals.set(jobId, interval);
  }

  stopPolling(jobId: string) {
    const interval = this.intervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(jobId);
    }
  }

  stopAllPolling() {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
  }
}

export const imageEditingRefreshManager = new ImageEditingRefreshManager();