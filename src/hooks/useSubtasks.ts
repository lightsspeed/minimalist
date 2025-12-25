import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Subtask {
  id: string;
  task_id: string;
  parent_id: string | null;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  children?: Subtask[];
}

interface UseSubtasksOptions {
  onAllCompleted?: () => void;
}

// Build tree structure from flat list
function buildSubtaskTree(subtasks: Subtask[]): Subtask[] {
  const map = new Map<string, Subtask>();
  const roots: Subtask[] = [];

  // First pass: create map
  subtasks.forEach(s => {
    map.set(s.id, { ...s, children: [] });
  });

  // Second pass: build tree
  subtasks.forEach(s => {
    const subtask = map.get(s.id)!;
    if (s.parent_id && map.has(s.parent_id)) {
      map.get(s.parent_id)!.children!.push(subtask);
    } else {
      roots.push(subtask);
    }
  });

  return roots;
}

// Flatten tree for reordering
function flattenSubtasks(subtasks: Subtask[]): Subtask[] {
  const result: Subtask[] = [];
  const traverse = (items: Subtask[]) => {
    items.forEach(item => {
      result.push(item);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    });
  };
  traverse(subtasks);
  return result;
}

export function useSubtasks(taskId: string | null, options?: UseSubtasksOptions) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskTree, setSubtaskTree] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSubtasks = async () => {
    if (!taskId) {
      setSubtasks([]);
      setSubtaskTree([]);
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
      const flatList = (data || []) as Subtask[];
      setSubtasks(flatList);
      setSubtaskTree(buildSubtaskTree(flatList));
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

  const addSubtask = async (title: string, parentId?: string | null) => {
    if (!taskId) return { error: new Error('No task selected') };

    const siblings = parentId 
      ? subtasks.filter(s => s.parent_id === parentId)
      : subtasks.filter(s => !s.parent_id);
    const maxPosition = siblings.length > 0 ? Math.max(...siblings.map(s => s.position || 0)) + 1 : 0;

    const { error } = await supabase.from('subtasks').insert({
      task_id: taskId,
      parent_id: parentId || null,
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
    setSubtaskTree(buildSubtaskTree(reorderedSubtasks));

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
    subtaskTree,
    loading,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    reorderSubtasks,
    refetch: fetchSubtasks,
  };
}