import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Trash2, FileText, Share2, Paperclip, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { NavBar } from '@/components/NavBar';
import { NoteShareModal } from '@/components/NoteShareModal';
import { useAuth } from '@/hooks/useAuth';
import { useNotes, Note } from '@/hooks/useNotes';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Attachment {
  name: string;
  path: string;
  size: number;
  type: string;
}

export default function Notes() {
  const { user, loading: authLoading } = useAuth();
  const { notes, loading: notesLoading, createNote, updateNote, deleteNote, refetch } = useNotes();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [noteToShare, setNoteToShare] = useState<Note | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select first note or newly created note
  useEffect(() => {
    if (notes.length > 0 && !selectedNote) {
      setSelectedNote(notes[0]);
      setContent(notes[0].content);
      setAttachments((notes[0] as any).attachments || []);
    }
  }, [notes, selectedNote]);

  // Auto-save with debounce
  useEffect(() => {
    if (!selectedNote) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (content !== selectedNote.content) {
        updateNote(selectedNote.id, content);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, selectedNote]);

  const handleCreateNote = async () => {
    const { data } = await createNote();
    if (data) {
      setSelectedNote(data);
      setContent('');
      setAttachments([]);
    }
  };

  const handleSelectNote = (note: Note) => {
    // Save current note before switching
    if (selectedNote && content !== selectedNote.content) {
      updateNote(selectedNote.id, content);
    }
    setSelectedNote(note);
    setContent(note.content);
    setAttachments((note as any).attachments || []);
  };

  const handleDeleteClick = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setNoteToDelete(noteId);
    setDeleteDialogOpen(true);
  };

  const handleShareClick = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    // Save before sharing
    if (selectedNote?.id === note.id && content !== selectedNote.content) {
      updateNote(selectedNote.id, content);
    }
    setNoteToShare(note);
    setShareModalOpen(true);
  };

  const confirmDelete = async () => {
    if (noteToDelete) {
      await deleteNote(noteToDelete);
      if (selectedNote?.id === noteToDelete) {
        setSelectedNote(null);
        setContent('');
        setAttachments([]);
      }
      setNoteToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + S to save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (selectedNote) {
        updateNote(selectedNote.id, content);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedNote || !user) return;

    setUploading(true);
    const newAttachments: Attachment[] = [...attachments];

    try {
      for (const file of Array.from(files)) {
        const filePath = `${user.id}/${selectedNote.id}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('note-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        newAttachments.push({
          name: file.name,
          path: filePath,
          size: file.size,
          type: file.type,
        });
      }

      // Update note with new attachments
      const { error } = await supabase
        .from('notes')
        .update({ attachments: newAttachments as unknown as any })
        .eq('id', selectedNote.id);

      if (error) throw error;

      setAttachments(newAttachments);
      toast({ title: 'File uploaded successfully!' });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = async (index: number) => {
    if (!selectedNote) return;

    const attachmentToRemove = attachments[index];
    const newAttachments = attachments.filter((_, i) => i !== index);

    try {
      // Delete from storage
      await supabase.storage
        .from('note-attachments')
        .remove([attachmentToRemove.path]);

      // Update note
      await supabase
        .from('notes')
        .update({ attachments: newAttachments as unknown as any })
        .eq('id', selectedNote.id);

      setAttachments(newAttachments);
      toast({ title: 'Attachment removed' });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Failed to remove attachment',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getAttachmentUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('note-attachments')
      .createSignedUrl(path, 3600);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background transition-theme flex flex-col">
      <NavBar />

      <main className="flex-1 container max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-4">
        {notesLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-1">No notes yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first note to get started
            </p>
            <Button onClick={handleCreateNote} className="gap-2">
              <Plus className="h-4 w-4" />
              New Note
            </Button>
          </div>
        ) : (
          <>
            {/* Notes List - Sidebar */}
            <div className="w-full md:w-72 flex-shrink-0">
              <div className="flex justify-end mb-2">
                <Button size="sm" onClick={handleCreateNote} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  New Note
                </Button>
              </div>
              <div className="space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto">
                {notes.map((note) => (
                  <Card
                    key={note.id}
                    className={cn(
                      'p-3 cursor-pointer transition-all hover:shadow-sm group',
                      selectedNote?.id === note.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/30'
                    )}
                    onClick={() => handleSelectNote(note)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {note.content.split('\n')[0] || 'Untitled'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(note.updated_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={(e) => handleShareClick(e, note)}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDeleteClick(e, note.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col min-h-[400px] md:min-h-0">
              {selectedNote ? (
                <>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your note here..."
                    className="flex-1 min-h-[300px] md:min-h-[calc(100vh-280px)] resize-none border-0 focus-visible:ring-0 text-base leading-relaxed"
                  />
                  
                  {/* Attachments Section */}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <Paperclip className="h-4 w-4" />
                        Attachments
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {uploading ? 'Uploading...' : 'Add file'}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                    
                    {attachments.length > 0 ? (
                      <div className="space-y-1.5">
                        {attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-muted rounded-md text-sm group"
                          >
                            <button
                              onClick={() => getAttachmentUrl(attachment.path)}
                              className="flex items-center gap-2 hover:text-primary flex-1 min-w-0 text-left"
                            >
                              <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{attachment.name}</span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                ({formatFileSize(attachment.size)})
                              </span>
                            </button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={() => handleRemoveAttachment(index)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No attachments yet</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Select a note to edit
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <NoteShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        note={noteToShare}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The note will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
