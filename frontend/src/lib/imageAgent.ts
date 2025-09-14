import type { ScribbleLine } from "@/components/ScribbleEditor";
import { createImageEditingJob, getJobStatus } from "@/lib/jobsClient";

export type ImageAgentRequest = {
  prompt: string;
  imageSrc: string; // currently unused by backend, but kept for compatibility
  lines: ScribbleLine[]; // not yet transmitted; future enhancement
  projectId?: string; // required by backend
};

export type ImageAgentResponse = {
  file_path: string;
  description: string;
};

export async function sendImageWithScribbles(req: ImageAgentRequest): Promise<ImageAgentResponse> {
  if (!req.projectId) throw new Error("projectId is required to create an image editing job");

  // Convert current canvas into a file? For now, we send a placeholder 1x1 PNG until wiring actual export.
  // The UI currently passes only imageSrc and lines; backend requires a file upload.
  const blob = new Blob([new Uint8Array([137,80,78,71,13,10,26,10])], { type: 'image/png' });
  const file = new File([blob], 'source.png', { type: 'image/png' });

  const job = await createImageEditingJob({
    project_id: req.projectId,
    edit_prompt: req.prompt,
    file,
    metadata: { imageSrc: req.imageSrc, linesCount: req.lines?.length || 0 },
  });

  // Poll job status until completed/failed
  const start = Date.now();
  const timeoutMs = 180_000;
  const intervalMs = 1500;
  while (Date.now() - start < timeoutMs) {
    const status = await getJobStatus(job.job_id);
    if (status.status === 'completed') {
      const url = (status.output_data as any)?.image_url || (status.output_data as any)?.file_url || '';
      return {
        file_path: url || req.imageSrc,
        description: `Edited image generated at ${new Date(status.updated_at).toLocaleTimeString()}`,
      };
    }
    if (status.status === 'failed') {
      throw new Error(status.error_message || 'Image editing job failed');
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error('Timed out waiting for image editing job to complete');
}


