import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export function useSubtasks(taskId: string | null) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSubtasks = async () => {
    if (!taskId) {
      setSubtasks([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching subtasks:', error);
    } else {
      setSubtasks(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubtasks();
  }, [taskId]);

  const addSubtask = async (title: string) => {
    if (!taskId) return { error: new Error('No task selected') };

    const { error } = await supabase.from('subtasks').insert({
      task_id: taskId,
      title,
    });

    if (error) {
      toast({
        title: 'Error adding subtask',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    await fetchSubtasks();
    return { error: null };
  };

  const updateSubtask = async (id: string, updates: Partial<Pick<Subtask, 'title' | 'is_completed'>>) => {
    const { error } = await supabase
      .from('subtasks')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error updating subtask',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    await fetchSubtasks();
    return { error: null };
  };

  const deleteSubtask = async (id: string) => {
    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting subtask',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    await fetchSubtasks();
    return { error: null };
  };

  return {
    subtasks,
    loading,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    refetch: fetchSubtasks,
  };
}
