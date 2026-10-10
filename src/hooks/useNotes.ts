import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface Note {
  id: string;
  user_id: string;
  content: string;
  folder: string | null;
  tags: string[];
  is_pinned: boolean;
  source_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, [user]);

  const createNote = async () => {
    if (!user) return { error: new Error('Not authenticated'), data: null };

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        content: '',
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error creating note',
        description: error.message,
        variant: 'destructive',
      });
      return { error, data: null };
    }

    await fetchNotes();
    return { error: null, data };
  };

  const updateNote = async (id: string, updates: { content?: string; folder?: string | null; tags?: string[]; is_pinned?: boolean }) => {
    const { error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating note:', error);
      return { error };
    }

    // Update locally for responsiveness without shifting position
    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, ...updates, updated_at: new Date().toISOString() } : note
    ));
    return { error: null };
  };

  const togglePin = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return { error: new Error('Note not found') };

    const { error } = await supabase
      .from('notes')
      .update({ is_pinned: !note.is_pinned })
      .eq('id', id);

    if (error) {
      console.error('Error updating note:', error);
      return { error };
    }

    toast({ title: note.is_pinned ? 'Note unpinned' : 'Note pinned' });
    await fetchNotes();
    return { error: null };
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting note',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({ title: 'Note deleted' });
    await fetchNotes();
    return { error: null };
  };

  const bulkDeleteNotes = async (ids: string[]) => {
    if (!ids.length) return { error: null };
    const { error } = await supabase
      .from('notes')
      .delete()
      .in('id', ids);

    if (error) {
      toast({
        title: 'Error deleting notes',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({ title: `${ids.length} note${ids.length > 1 ? 's' : ''} deleted` });
    await fetchNotes();
    return { error: null };
  };

  const bulkTransferFolder = async (ids: string[], folder: string | null) => {
    if (!ids.length) return { error: null };
    const { error } = await supabase
      .from('notes')
      .update({ folder })
      .in('id', ids);

    if (error) {
      toast({
        title: 'Error moving notes',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({ title: `Moved ${ids.length} note${ids.length > 1 ? 's' : ''} to ${folder || 'No folder'}` });
    await fetchNotes();
    return { error: null };
  };

  const bulkAddTag = async (ids: string[], tag: string) => {
    const trimmed = tag.trim();
    if (!ids.length || !trimmed) return { error: null };

    const notesToUpdate = notes.filter(n => ids.includes(n.id));
    for (const note of notesToUpdate) {
      if (!note.tags?.includes(trimmed)) {
        const newTags = [...(note.tags || []), trimmed];
        await supabase
          .from('notes')
          .update({ tags: newTags })
          .eq('id', note.id);
      }
    }

    toast({ title: `Added #${trimmed} to ${ids.length} note${ids.length > 1 ? 's' : ''}` });
    await fetchNotes();
    return { error: null };
  };

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    bulkDeleteNotes,
    bulkTransferFolder,
    bulkAddTag,
    refetch: fetchNotes,
  };
}
