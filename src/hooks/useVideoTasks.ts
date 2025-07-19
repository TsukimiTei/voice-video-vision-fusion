import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VideoTask {
  id: string;
  task_id: string;
  prompt: string;
  status: 'processing' | 'completed' | 'failed';
  video_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Generate or get session ID for this browser session
const getSessionId = () => {
  let sessionId = localStorage.getItem('video_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('video_session_id', sessionId);
  }
  return sessionId;
};

export const useVideoTasks = () => {
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set session context for RLS
  const setSessionContext = useCallback(async () => {
    const sessionId = getSessionId();
    try {
      await supabase.rpc('set_config', {
        setting_name: 'app.current_session_id',
        setting_value: sessionId,
        is_local: true
      });
    } catch (error) {
      console.error('Failed to set session context:', error);
    }
  }, []);

  // Save task to database
  const saveTask = useCallback(async (taskId: string, prompt: string, status: 'processing' | 'completed' | 'failed' = 'processing') => {
    try {
      await setSessionContext();
      const sessionId = getSessionId();
      
      const { data, error } = await supabase
        .from('video_tasks')
        .insert({
          task_id: taskId,
          prompt,
          status,
          user_session_id: sessionId
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setTasks(prev => [data as VideoTask, ...prev]);
      return data as VideoTask;
    } catch (err) {
      console.error('Error saving task:', err);
      setError(err instanceof Error ? err.message : 'Failed to save task');
      return null;
    }
  }, [setSessionContext]);

  // Update task status
  const updateTask = useCallback(async (taskId: string, updates: Partial<Pick<VideoTask, 'status' | 'video_url' | 'error_message'>>) => {
    try {
      await setSessionContext();
      
      const { data, error } = await supabase
        .from('video_tasks')
        .update(updates)
        .eq('task_id', taskId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.map(task => 
        task.task_id === taskId ? { ...task, ...data } as VideoTask : task
      ));
      
      return data as VideoTask;
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task');
      return null;
    }
  }, [setSessionContext]);

  // Load tasks from database
  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await setSessionContext();
      
      const { data, error } = await supabase
        .from('video_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setTasks((data || []) as VideoTask[]);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, [setSessionContext]);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return {
    tasks,
    isLoading,
    error,
    saveTask,
    updateTask,
    refreshTasks: loadTasks
  };
};