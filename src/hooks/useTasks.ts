import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { parseDueDate } from '@/lib/parseDueDate';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  is_completed: boolean;
  is_pinned: boolean;
  is_template: boolean;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  user_id: string;
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

  const addTask = async (title: string, description: string, tags: string[], dueDate?: Date | null) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Parse due date from title if not explicitly provided
    let finalDueDate = dueDate;
    let finalTitle = title;
    
    if (!dueDate) {
      const parsed = parseDueDate(title);
      if (parsed.dueDate) {
        finalDueDate = parsed.dueDate;
        finalTitle = parsed.cleanedText;
      }
    }

    // Shift all existing non-pinned tasks' positions by 1 to make room at the top
    const nonPinnedTasks = tasks.filter(t => !t.is_pinned && !t.is_completed);
    if (nonPinnedTasks.length > 0) {
      const updates = nonPinnedTasks.map(t => ({
        id: t.id,
        position: (t.position || 0) + 1,
      }));
      
      for (const update of updates) {
        await supabase.from('tasks').update({ position: update.position }).eq('id', update.id);
      }
    }

    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: finalTitle,
      description: description || null,
      tags,
      position: 0, // New task at top
      due_date: finalDueDate ? finalDueDate.toISOString() : null,
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

  const addTaskFromTemplate = async (template: Task) => {
    if (!user) return { error: new Error('Not authenticated') };

    const maxPosition = tasks.length > 0 ? Math.max(...tasks.map(t => t.position || 0)) + 1 : 0;

    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: template.title,
      description: template.description,
      tags: template.tags,
      position: maxPosition,
      is_template: false,
      is_completed: false,
    });

    if (error) {
      toast({
        title: 'Error creating task from template',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({ title: 'Task created from template' });
    await fetchTasks();
    return { error: null };
  };

  const updateTask = async (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'tags' | 'is_completed' | 'position' | 'is_pinned' | 'is_template' | 'due_date'>>) => {
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

  const togglePin = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return { error: new Error('Task not found') };

    const { error } = await supabase
      .from('tasks')
      .update({ is_pinned: !task.is_pinned })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({ title: task.is_pinned ? 'Task unpinned' : 'Task pinned' });
    await fetchTasks();
    return { error: null };
  };

  const toggleTemplate = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return { error: new Error('Task not found') };

    const { error } = await supabase
      .from('tasks')
      .update({ is_template: !task.is_template })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({ title: task.is_template ? 'Template removed' : 'Saved as template' });
    await fetchTasks();
    return { error: null };
  };

  const sendToNotes = async (task: Task) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Fetch subtasks for this task
    const { data: subtasks } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', task.id)
      .order('position', { ascending: true });

    // Build note content with subtasks
    let noteContent = `# ${task.title}\n\n${task.description || ''}`;
    
    if (subtasks && subtasks.length > 0) {
      noteContent += '\n\n## Subtasks\n';
      subtasks.forEach(subtask => {
        const checkbox = subtask.is_completed ? '[x]' : '[ ]';
        noteContent += `- ${checkbox} ${subtask.title}\n`;
      });
    }

    const { error: noteError } = await supabase.from('notes').insert({
      user_id: user.id,
      content: noteContent,
      tags: task.tags,
      source_task_id: task.id,
    });

    if (noteError) {
      toast({
        title: 'Error sending to notes',
        description: noteError.message,
        variant: 'destructive',
      });
      return { error: noteError };
    }

    toast({ title: 'Sent to notes with subtasks' });
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
    addTaskFromTemplate,
    updateTask,
    deleteTask,
    reorderTasks,
    togglePin,
    toggleTemplate,
    sendToNotes,
    refetch: fetchTasks,
  };
}
