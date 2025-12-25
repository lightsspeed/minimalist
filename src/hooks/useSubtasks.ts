import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

interface UseSubtasksOptions {
  onAllCompleted?: () => void;
}

export function useSubtasks(taskId: string | null, options?: UseSubtasksOptions) {
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
      .order('position', { ascending: true })
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

  // Check if all subtasks are completed
  useEffect(() => {
    if (subtasks.length > 0 && subtasks.every(s => s.is_completed)) {
      options?.onAllCompleted?.();
    }
  }, [subtasks]);

  const addSubtask = async (title: string) => {
    if (!taskId) return { error: new Error('No task selected') };

    const maxPosition = subtasks.length > 0 ? Math.max(...subtasks.map(s => s.position || 0)) + 1 : 0;

    const { error } = await supabase.from('subtasks').insert({
      task_id: taskId,
      title,
      position: maxPosition,
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

  const updateSubtask = async (id: string, updates: Partial<Pick<Subtask, 'title' | 'is_completed' | 'position'>>) => {
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

  const reorderSubtasks = async (reorderedSubtasks: Subtask[]) => {
    setSubtasks(reorderedSubtasks);

    for (let i = 0; i < reorderedSubtasks.length; i++) {
      await supabase
        .from('subtasks')
        .update({ position: i })
        .eq('id', reorderedSubtasks[i].id);
    }
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
    reorderSubtasks,
    refetch: fetchSubtasks,
  };
}
