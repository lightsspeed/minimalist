import { useState, useEffect, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Plus, Trash2, FileText, Share2, FolderOpen, Tag, X, Search, Pin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { NavBar } from '@/components/NavBar';
import { NoteShareModal } from '@/components/NoteShareModal';
import { TagBadge } from '@/components/TagBadge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function Notes() {
  const { user, loading: authLoading } = useAuth();
  const { notes, loading: notesLoading, createNote, updateNote, deleteNote, togglePin } = useNotes();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [noteToShare, setNoteToShare] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get unique folders from notes
  const folders = [...new Set(notes.map(n => n.folder).filter(Boolean))] as string[];

  // Filter notes by selected folder and search query
  const filteredNotes = notes
    .filter(n => {
      const matchesFolder = !selectedFolder || n.folder === selectedFolder;
      const matchesSearch = !searchQuery || 
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFolder && matchesSearch;
    })
    .sort((a, b) => {
      // Pinned first
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1;
      }
      // Then by updated_at
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  // Auto-select first note or newly created note
  useEffect(() => {
    if (filteredNotes.length > 0 && !selectedNote) {
      setSelectedNote(filteredNotes[0]);
      setContent(filteredNotes[0].content);
    }
  }, [filteredNotes, selectedNote]);

  // Auto-save with debounce
  useEffect(() => {
    if (!selectedNote) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (content !== selectedNote.content) {
        updateNote(selectedNote.id, { content });
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, selectedNote, updateNote]);

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
      updateNote(selectedNote.id, { content });
    }
    setSelectedNote(note);
    setContent(note.content);
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
      updateNote(selectedNote.id, { content });
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
      }
      setNoteToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handlePinClick = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    togglePin(noteId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + S to save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (selectedNote) {
        updateNote(selectedNote.id, { content });
      }
    }
  };

  const handleAddTag = () => {
    if (!selectedNote || !tagInput.trim()) return;
    const newTags = [...(selectedNote.tags || []), tagInput.trim()];
    updateNote(selectedNote.id, { tags: newTags });
    setSelectedNote({ ...selectedNote, tags: newTags });
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedNote) return;
    const newTags = (selectedNote.tags || []).filter(t => t !== tagToRemove);
    updateNote(selectedNote.id, { tags: newTags });
    setSelectedNote({ ...selectedNote, tags: newTags });
  };

  const handleFolderChange = (folder: string) => {
    if (!selectedNote) return;
    const newFolder = folder === 'none' ? null : folder;
    updateNote(selectedNote.id, { folder: newFolder });
    setSelectedNote({ ...selectedNote, folder: newFolder });
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
              <div className="flex items-center gap-2 mb-2">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notes..."
                    className="h-8 text-xs pl-7 pr-7 border-0 bg-muted/50 focus:bg-hover-blue focus-visible:ring-0"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Button size="sm" onClick={handleCreateNote} className="gap-1.5 shrink-0">
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {/* Folder filter */}
                <Select value={selectedFolder || 'all'} onValueChange={(v) => setSelectedFolder(v === 'all' ? null : v)}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <FolderOpen className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="All folders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All folders</SelectItem>
                    {folders.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto">
                {filteredNotes.map((note) => (
                  <Card
                    key={note.id}
                    className={cn(
                      'p-3 cursor-pointer transition-all group hover:bg-hover-blue',
                      selectedNote?.id === note.id
                        ? 'border-primary bg-primary/5'
                        : ''
                    )}
                    onClick={() => handleSelectNote(note)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {note.is_pinned && (
                            <Pin className="h-3 w-3 text-primary flex-shrink-0" />
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-sm font-medium text-foreground line-clamp-2">
                                  {note.content.split('\n')[0] || 'Untitled'}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="text-sm">{note.content.split('\n')[0] || 'Untitled'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {note.folder && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <FolderOpen className="h-3 w-3" />
                              {note.folder}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(note.updated_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {note.tags.slice(0, 2).map(tag => (
                              <TagBadge key={tag} tag={tag} />
                            ))}
                            {note.tags.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{note.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn('h-6 w-6', note.is_pinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
                          onClick={(e) => handlePinClick(e, note.id)}
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </Button>
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
                <div className="flex flex-col h-full">
                  {/* Note metadata bar */}
                  <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b">
                    {/* Source task link */}
                    {selectedNote.source_task_id && (
                      <Link
                        to="/"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View source task
                      </Link>
                    )}
                    
                    {/* Folder selector */}
                    <Select 
                      value={selectedNote.folder || 'none'} 
                      onValueChange={handleFolderChange}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <FolderOpen className="h-3 w-3 mr-1" />
                        <SelectValue placeholder="No folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No folder</SelectItem>
                        {folders.map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                        <div className="p-2 border-t">
                          <Input 
                            placeholder="New folder..." 
                            className="h-7 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const input = e.currentTarget;
                                if (input.value.trim()) {
                                  handleFolderChange(input.value.trim());
                                  input.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                      </SelectContent>
                    </Select>

                    {/* Tags */}
                    <div className="flex items-center gap-1 flex-wrap flex-1">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      {(selectedNote.tags || []).map(tag => (
                        <div key={tag} className="flex items-center">
                          <TagBadge tag={tag} />
                          <button 
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-0.5 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Add tag..."
                        className="h-6 w-20 text-xs border-0 border-b rounded-none px-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                      />
                    </div>
                  </div>

                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your note here..."
                    className="flex-1 min-h-[300px] md:min-h-[calc(100vh-280px)] resize-none border-0 focus-visible:ring-0 text-base leading-relaxed"
                  />
                </div>
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