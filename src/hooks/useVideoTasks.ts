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
      const { error } = await supabase.rpc('set_session_context', {
        session_id: sessionId
      });
      if (error) {
        console.error('Failed to set session context:', error);
      } else {
        console.log('Session context set successfully:', sessionId);
      }
    } catch (error) {
      console.error('Failed to set session context:', error);
    }
  }, []);

  // Save task to database
  const saveTask = useCallback(async (taskId: string, prompt: string, status: 'processing' | 'completed' | 'failed' = 'processing') => {
    try {
      const sessionId = getSessionId();
      await setSessionContext();
      
      console.log('Saving task with session ID:', sessionId);
      
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

      if (error) {
        console.error('Error details:', error);
        throw error;
      }
      
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
        .eq('task_id', taskId);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.map(task => 
        task.task_id === taskId ? { ...task, ...updates } as VideoTask : task
      ));
      
      return { ...updates, task_id: taskId } as VideoTask;
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
      
      let { data, error } = await supabase
        .from('video_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      // If no data found, try to find orphaned tasks and adopt them
      if (!data || data.length === 0) {
        console.log('No tasks found for current session, checking for orphaned tasks...');
        
        // Check for recent tasks without valid session
        const { data: orphanedTasks } = await supabase
          .from('video_tasks')
          .select('*')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
          .order('created_at', { ascending: false });

        if (orphanedTasks && orphanedTasks.length > 0) {
          console.log('Found orphaned tasks, adopting them...');
          const currentSessionId = getSessionId();
          
          // Update orphaned tasks to current session
          await supabase
            .from('video_tasks')
            .update({ user_session_id: currentSessionId })
            .in('id', orphanedTasks.map(task => task.id));
          
          // Reload with updated session
          await setSessionContext();
          const { data: updatedData, error: updatedError } = await supabase
            .from('video_tasks')
            .select('*')
            .order('created_at', { ascending: false });
          
          data = updatedData;
          error = updatedError;
        }
      }

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