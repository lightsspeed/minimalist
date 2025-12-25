import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  is_completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error fetching tasks',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const addTask = async (title: string, description: string, tags: string[]) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Get max position
    const maxPosition = tasks.length > 0 ? Math.max(...tasks.map(t => t.position || 0)) + 1 : 0;

    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title,
      description: description || null,
      tags,
      position: maxPosition,
    });

    if (error) {
      toast({
        title: 'Error adding task',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({ title: 'Task added successfully' });
    await fetchTasks();
    return { error: null };
  };

  const updateTask = async (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'tags' | 'is_completed' | 'position'>>) => {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({ title: 'Task updated' });
    await fetchTasks();
    return { error: null };
  };

  const reorderTasks = async (reorderedTasks: Task[]) => {
    // Update local state immediately for responsiveness
    setTasks(reorderedTasks);

    // Update positions in database
    const updates = reorderedTasks.map((task, index) => ({
      id: task.id,
      position: index,
    }));

    for (const update of updates) {
      await supabase
        .from('tasks')
        .update({ position: update.position })
        .eq('id', update.id);
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting task',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({ title: 'Task deleted' });
    await fetchTasks();
    return { error: null };
  };

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    refetch: fetchTasks,
  };
}