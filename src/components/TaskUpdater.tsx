import React, { useState } from 'react';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';

const TaskUpdater: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [result, setResult] = useState<string>('');

  const updateTask = async () => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-video-task', {
        body: {
          task_id: 'ChDGZWhmQd8AAAAAAv7l4w',
          updates: {
            generated_video_url: 'https://cdn.klingai.com/bs2/upload-kling-api/8595551528/image2video/ChDGZWhmQd8AAAAAAv7l4w-0_raw_video_2.mp4'
          }
        }
      });

      if (error) throw error;
      setResult('Task updated successfully: ' + JSON.stringify(data));
    } catch (err) {
      setResult('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Button onClick={updateTask} disabled={isUpdating}>
        {isUpdating ? 'Updating...' : 'Update Task'}
      </Button>
      {result && (
        <div className="p-3 bg-muted rounded-md text-sm">
          {result}
        </div>
      )}
    </div>
  );
};

export default TaskUpdater;