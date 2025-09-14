import { api } from "@/lib/apiClient";
import { z } from "zod";
import { JobStatusResponseSchema, type JobStatusResponse } from "@/types/backend";

export const CreateImageEditingJobForm = z.object({
  project_id: z.string().uuid(),
  edit_prompt: z.string().min(1),
  file: z.instanceof(File),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateImageEditingJobFormType = z.infer<typeof CreateImageEditingJobForm>;

export async function createImageEditingJob(form: CreateImageEditingJobFormType): Promise<{ job_id: string }> {
  const fd = new FormData();
  fd.append('project_id', form.project_id);
  fd.append('edit_prompt', form.edit_prompt);
  fd.append('file', form.file);
  if (form.metadata) fd.append('metadata', JSON.stringify(form.metadata));
  return api.postForm<{ job_id: string }>(`/api/jobs/image-editing`, fd);
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await api.get<any>(`/api/jobs/${jobId}/status`);
  return JobStatusResponseSchema.parse(res);
}


