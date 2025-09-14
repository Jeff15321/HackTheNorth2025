import { z } from 'zod';

// URL validation for Supabase storage URLs
const SupabaseUrlSchema = z.string().url().refine(
  (url) => url.includes('supabase') || url.startsWith('data:'),
  { message: "URL must be a Supabase storage URL or data URL" }
);

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
  role: z.string().optional(),
  age: z.number(),
  personality: z.string(),
  description: z.string(),
  backstory: z.string().optional()
});

export const CharacterSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  media_url: SupabaseUrlSchema.optional(),
  metadata: CharacterMetadataSchema,
  created_at: z.string().datetime().optional()
});

export const SceneMetadataSchema = z.object({
  detailed_plot: z.string(),
  concise_plot: z.string(),
  dialogue: z.string(),
  scene_order: z.number()
});

export const SceneSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  media_url: SupabaseUrlSchema.optional(),
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
  scene_id: z.string().uuid().optional(),
  media_url: SupabaseUrlSchema.optional(),
  metadata: ObjectMetadataSchema,
  created_at: z.string().datetime().optional()
});

export const FrameMetadataSchema = z.object({
  veo3_prompt: z.string(),
  dialogue: z.string(),
  summary: z.string(),
  split_reason: z.string(),
  frame_order: z.number()
});

export const FrameSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  scene_id: z.string().uuid().optional(),
  media_url: SupabaseUrlSchema.optional(),
  metadata: FrameMetadataSchema
});

// Storage-related schemas
export const StorageConfigSchema = z.object({
  bucket: z.string(),
  folder: z.string().optional()
});

export const UploadResultSchema = z.object({
  url: z.string().url(),
  path: z.string(),
  size: z.number()
});

export const StorageUploadSchema = z.object({
  buffer: z.instanceof(Buffer),
  fileName: z.string(),
  mimeType: z.string(),
  config: StorageConfigSchema.optional()
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
  'image-editing',
  'object-analysis',
  'frame-analysis'
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
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
export type UploadResult = z.infer<typeof UploadResultSchema>;
export type StorageUpload = z.infer<typeof StorageUploadSchema>;