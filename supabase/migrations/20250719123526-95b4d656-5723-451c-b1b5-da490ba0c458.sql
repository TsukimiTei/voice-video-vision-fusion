-- Update existing video tasks to have a proper session context
-- This allows existing records to be visible to users

-- First, set a default session for existing tasks that don't have one
UPDATE public.video_tasks 
SET user_session_id = 'legacy_session_' || id::text
WHERE user_session_id IS NULL OR user_session_id = '';

-- Create a function to temporarily disable RLS for data recovery
CREATE OR REPLACE FUNCTION public.get_all_video_tasks_admin()
RETURNS TABLE (
    id uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    prompt text,
    status text,
    video_url text,
    error_message text,
    task_id text,
    user_session_id text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        id,
        created_at,
        updated_at,
        prompt,
        status,
        video_url,
        error_message,
        task_id,
        user_session_id
    FROM public.video_tasks
    ORDER BY created_at DESC;
$$;