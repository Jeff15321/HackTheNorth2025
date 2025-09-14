-- Comprehensive schema updates for HackTheNorth 2025
-- This migration ensures all necessary fields are present and properly configured

-- Add scene_id to objects table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'objects' AND column_name = 'scene_id') THEN
        ALTER TABLE public.objects
        ADD COLUMN scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add scene_id to frames table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'frames' AND column_name = 'scene_id') THEN
        ALTER TABLE public.frames
        ADD COLUMN scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add frame_order to frames table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'frames' AND column_name = 'frame_order') THEN
        ALTER TABLE public.frames
        ADD COLUMN frame_order INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add scene_order to scenes table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'scenes' AND column_name = 'scene_order') THEN
        ALTER TABLE public.scenes
        ADD COLUMN scene_order INTEGER DEFAULT 0;
    END IF;
END $$;

-- Ensure media_url exists in all tables
DO $$
BEGIN
    -- Characters
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'characters' AND column_name = 'media_url') THEN
        ALTER TABLE public.characters ADD COLUMN media_url TEXT;
    END IF;

    -- Scenes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'scenes' AND column_name = 'media_url') THEN
        ALTER TABLE public.scenes ADD COLUMN media_url TEXT;
    END IF;

    -- Objects
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'objects' AND column_name = 'media_url') THEN
        ALTER TABLE public.objects ADD COLUMN media_url TEXT;
    END IF;

    -- Frames
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'frames' AND column_name = 'media_url') THEN
        ALTER TABLE public.frames ADD COLUMN media_url TEXT;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_objects_scene_id ON objects(scene_id);
CREATE INDEX IF NOT EXISTS idx_frames_scene_id ON frames(scene_id);
CREATE INDEX IF NOT EXISTS idx_frames_frame_order ON frames(frame_order);
CREATE INDEX IF NOT EXISTS idx_scenes_scene_order ON scenes(scene_order);

-- Create partial indexes for media_url columns (only index non-null values)
CREATE INDEX IF NOT EXISTS idx_characters_media_url ON characters(media_url) WHERE media_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenes_media_url ON scenes(media_url) WHERE media_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_objects_media_url ON objects(media_url) WHERE media_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_frames_media_url ON frames(media_url) WHERE media_url IS NOT NULL;

-- Add check constraints to ensure media_url values are valid URLs when present
DO $$
BEGIN
    -- Characters
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints
                   WHERE constraint_name = 'characters_media_url_check') THEN
        ALTER TABLE public.characters
        ADD CONSTRAINT characters_media_url_check
        CHECK (media_url IS NULL OR media_url ~ '^https?://');
    END IF;

    -- Scenes
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints
                   WHERE constraint_name = 'scenes_media_url_check') THEN
        ALTER TABLE public.scenes
        ADD CONSTRAINT scenes_media_url_check
        CHECK (media_url IS NULL OR media_url ~ '^https?://');
    END IF;

    -- Objects
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints
                   WHERE constraint_name = 'objects_media_url_check') THEN
        ALTER TABLE public.objects
        ADD CONSTRAINT objects_media_url_check
        CHECK (media_url IS NULL OR media_url ~ '^https?://');
    END IF;

    -- Frames
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints
                   WHERE constraint_name = 'frames_media_url_check') THEN
        ALTER TABLE public.frames
        ADD CONSTRAINT frames_media_url_check
        CHECK (media_url IS NULL OR media_url ~ '^https?://');
    END IF;
END $$;

-- Add comments to document the columns
COMMENT ON COLUMN public.characters.media_url IS 'Supabase storage URL for character image';
COMMENT ON COLUMN public.scenes.media_url IS 'Supabase storage URL for scene image';
COMMENT ON COLUMN public.objects.media_url IS 'Supabase storage URL for object image';
COMMENT ON COLUMN public.frames.media_url IS 'Supabase storage URL for frame image';
COMMENT ON COLUMN public.objects.scene_id IS 'Reference to the scene this object belongs to';
COMMENT ON COLUMN public.frames.scene_id IS 'Reference to the scene this frame belongs to';
COMMENT ON COLUMN public.frames.frame_order IS 'Order of this frame within its scene';
COMMENT ON COLUMN public.scenes.scene_order IS 'Order of this scene within its project';
