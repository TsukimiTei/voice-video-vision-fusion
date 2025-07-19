-- Create video generation tasks table for history tracking
CREATE TABLE public.video_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE,
  user_session_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  video_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.video_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for session-based access (since we don't have user auth)
CREATE POLICY "Users can view their own tasks" 
ON public.video_tasks 
FOR SELECT 
USING (user_session_id = current_setting('app.current_session_id', true));

CREATE POLICY "Users can create their own tasks" 
ON public.video_tasks 
FOR INSERT 
WITH CHECK (user_session_id = current_setting('app.current_session_id', true));

CREATE POLICY "Users can update their own tasks" 
ON public.video_tasks 
FOR UPDATE 
USING (user_session_id = current_setting('app.current_session_id', true));

-- Create index for faster queries
CREATE INDEX idx_video_tasks_session_id ON public.video_tasks(user_session_id);
CREATE INDEX idx_video_tasks_task_id ON public.video_tasks(task_id);
CREATE INDEX idx_video_tasks_created_at ON public.video_tasks(created_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_video_tasks_updated_at
BEFORE UPDATE ON public.video_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();