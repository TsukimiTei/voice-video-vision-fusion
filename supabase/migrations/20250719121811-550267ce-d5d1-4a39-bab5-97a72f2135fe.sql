-- Fix the session context setting function to handle RLS properly
CREATE OR REPLACE FUNCTION public.set_session_context(session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set the session context for RLS policies
  PERFORM set_config('app.current_session_id', session_id, true);
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.set_session_context(text) TO anon;
GRANT EXECUTE ON FUNCTION public.set_session_context(text) TO authenticated;