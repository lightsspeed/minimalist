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
      .order('updated_at', { ascending: false });

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

  const updateNote = async (id: string, updates: { content?: string; folder?: string | null; tags?: string[] }) => {
    const { error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating note:', error);
      return { error };
    }

    // Update locally for responsiveness
    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, ...updates, updated_at: new Date().toISOString() } : note
    ));
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

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes,
  };
}
