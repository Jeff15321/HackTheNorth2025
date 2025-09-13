import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  summary: z.string(),
  plot: z.string()
});

export const CharacterMetadataSchema = z.object({
  name: z.string(),
  age: z.number().optional(),
  personality: z.string(),
  description: z.string()
});

export const CharacterSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  media_url: z.string().url().optional(),
  metadata: CharacterMetadataSchema,
  created_at: z.string().datetime().optional()
});

export const SceneMetadataSchema = z.object({
  detailed_plot: z.string(),
  concise_plot: z.string(),
  duration: z.number().optional(),
  dialogue: z.string().optional()
});

export const SceneSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  media_url: z.string().url().optional(),
  metadata: SceneMetadataSchema
});

export const ObjectMetadataSchema = z.object({
  type: z.string(),
  description: z.string(),
  environmental_context: z.string()
});

export const ObjectSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  media_url: z.string().url().optional(),
  metadata: ObjectMetadataSchema,
  created_at: z.string().datetime().optional()
});

export const FrameMetadataSchema = z.object({
  veo3_prompt: z.string(),
  dialogue: z.string().optional(),
  duration_constraint: z.number(),
  split_reason: z.string().optional()
});

export const FrameSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  media_url: z.string().url().optional(),
  metadata: FrameMetadataSchema
});

export const JobStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

export const JobTypeSchema = z.enum([
  'character-generation',
  'object-generation',
  'scene-generation',
  'frame-generation',
  'video-generation',
  'video-stitching',
  'script-generation',
  'image-editing'
]);

export const JobSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  type: JobTypeSchema,
  status: JobStatusSchema,
  progress: z.number().min(0).max(100).default(0),
  input_data: z.record(z.string(), z.unknown()),
  output_data: z.record(z.string(), z.unknown()).optional(),
  error_message: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const DirectorFunctionCallSchema = z.object({
  type: z.enum(['navigate', 'highlight', 'modal']),
  target: z.string().optional(),
  element: z.string().optional(),
  content: z.string().optional()
});

export const DirectorRequestSchema = z.object({
  page_route: z.string(),
  user_query: z.string(),
  context: z.record(z.string(), z.unknown()).optional()
});

export const CreateProjectSchema = z.object({
  title: z.string().min(1),
  summary: z.string(),
  plot: z.string().optional().default('')
});

export const CreateJobSchema = z.object({
  project_id: z.string().uuid(),
  type: JobTypeSchema,
  input_data: z.record(z.string(), z.unknown())
});

export type Project = z.infer<typeof ProjectSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Object = z.infer<typeof ObjectSchema>;
export type Frame = z.infer<typeof FrameSchema>;
export type Job = z.infer<typeof JobSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type JobType = z.infer<typeof JobTypeSchema>;
export type DirectorFunctionCall = z.infer<typeof DirectorFunctionCallSchema>;
export type DirectorRequest = z.infer<typeof DirectorRequestSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type CreateJob = z.infer<typeof CreateJobSchema>;