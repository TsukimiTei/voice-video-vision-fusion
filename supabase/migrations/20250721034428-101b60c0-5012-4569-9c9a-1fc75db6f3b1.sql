-- Drop and recreate admin function to include new video URL columns
DROP FUNCTION IF EXISTS public.get_all_video_tasks_admin();

CREATE OR REPLACE FUNCTION public.get_all_video_tasks_admin()
 RETURNS TABLE(id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, prompt text, status text, video_url text, original_video_url text, generated_video_url text, error_message text, task_id text, user_session_id text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT 
        id,
        created_at,
        updated_at,
        prompt,
        status,
        video_url,
        original_video_url,
        generated_video_url,
        error_message,
        task_id,
        user_session_id
    FROM public.video_tasks
    ORDER BY created_at DESC;
$function$;