-- Add columns for original and generated video URLs
ALTER TABLE public.video_tasks 
ADD COLUMN IF NOT EXISTS original_video_url TEXT,
ADD COLUMN IF NOT EXISTS generated_video_url TEXT;