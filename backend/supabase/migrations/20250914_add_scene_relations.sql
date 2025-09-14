-- Add scene_id to objects table
ALTER TABLE public.objects 
ADD COLUMN scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE;

-- Add scene_id to frames table
ALTER TABLE public.frames 
ADD COLUMN scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_objects_scene_id ON objects(scene_id);
CREATE INDEX IF NOT EXISTS idx_frames_scene_id ON frames(scene_id);

-- Add order columns for proper sequencing
ALTER TABLE public.frames
ADD COLUMN frame_order INTEGER DEFAULT 0;

ALTER TABLE public.scenes
ADD COLUMN scene_order INTEGER DEFAULT 0;
