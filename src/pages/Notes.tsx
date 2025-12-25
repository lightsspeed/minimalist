import { useState, useEffect, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, FileText, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NoteShareModal } from '@/components/NoteShareModal';
import { useAuth } from '@/hooks/useAuth';
import { useNotes, Note } from '@/hooks/useNotes';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
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

export default function Notes() {
  const { user, loading: authLoading } = useAuth();
  const { notes, loading: notesLoading, createNote, updateNote, deleteNote } = useNotes();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-select first note or newly created note
  useEffect(() => {
    if (notes.length > 0 && !selectedNote) {
      setSelectedNote(notes[0]);
      setContent(notes[0].content);
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
    }
  };

  const handleSelectNote = (note: Note) => {
    // Save current note before switching
    if (selectedNote && content !== selectedNote.content) {
      updateNote(selectedNote.id, content);
    }
    setSelectedNote(note);
    setContent(note.content);
  };

  const handleDeleteClick = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setNoteToDelete(noteId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (noteToDelete) {
      await deleteNote(noteToDelete);
      if (selectedNote?.id === noteToDelete) {
        setSelectedNote(null);
        setContent('');
      }
      setNoteToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleShareClick = () => {
    if (selectedNote) {
      // Save before sharing
      if (content !== selectedNote.content) {
        updateNote(selectedNote.id, content);
      }
      setShareModalOpen(true);
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
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="font-semibold text-lg">Notes</h1>
          </div>
          <div className="flex items-center gap-2">
            {selectedNote && (
              <Button size="sm" variant="outline" onClick={handleShareClick} className="gap-1.5">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            )}
            <Button size="sm" onClick={handleCreateNote} className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Note</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

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
            <div className="w-full md:w-64 flex-shrink-0">
              <div className="space-y-2 max-h-[calc(100vh-140px)] overflow-y-auto">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteClick(e, note.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 min-h-[400px] md:min-h-0">
              {selectedNote ? (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your note here..."
                  className="h-full min-h-[400px] md:min-h-[calc(100vh-140px)] resize-none border-0 focus-visible:ring-0 text-base leading-relaxed"
                />
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
        note={selectedNote}
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
