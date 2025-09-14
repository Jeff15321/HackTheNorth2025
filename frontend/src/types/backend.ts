import { z } from "zod";

export const JobStatus = z.enum(["pending", "processing", "completed", "failed"]);
export const JobType = z.enum([
  "character-generation",
  "object-generation",
  "scene-generation",
  "frame-generation",
  "video-generation",
  "video-stitching",
  "script-generation",
  "image-editing",
]);

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  summary: z.string(),
  plot: z.string().optional().default(""),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const JobSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  type: JobType,
  status: JobStatus,
  progress: z.number().min(0).max(100).default(0),
  input_data: z.record(z.string(), z.unknown()),
  output_data: z.record(z.string(), z.unknown()).optional(),
  error_message: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Job = z.infer<typeof JobSchema>;

export const DirectorInitialResponseSchema = z.object({
  conversation_id: z.string(),
  director_response: z.string(),
  suggested_questions: z.array(z.string()),
  character_suggestions: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
  plot_outline: z.string(),
  next_step: z.string(),
  function_calls: z.array(z.object({
    type: z.enum(["navigate", "highlight", "modal"]),
    target: z.string().optional(),
    element: z.string().optional(),
    content: z.string().optional(),
  })).optional().default([]),
});
export type DirectorInitialResponse = z.infer<typeof DirectorInitialResponseSchema>;

export const JobStatusResponseSchema = z.object({
  status: JobStatus,
  progress: z.number(),
  updated_at: z.string(),
  output_data: z.record(z.string(), z.unknown()).optional(),
  error_message: z.string().optional(),
});
export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;


