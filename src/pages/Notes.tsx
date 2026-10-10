import { useState, useEffect, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  FileText,
  Share2,
  FolderOpen,
  FolderInput,
  Tag,
  Tags,
  X,
  Search,
  Pin,
  ExternalLink,
  CheckSquare,
  Square,
  Check,
} from 'lucide-react';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

function getNoteTitle(content: string): string {
  if (!content) return 'Untitled';
  const clean = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[#*_`~-]/g, '')
    .trim();
  if (!clean) return 'Untitled';
  return clean.split('\n')[0].trim().slice(0, 80) || 'Untitled';
}

export default function Notes() {
  const { user, loading: authLoading } = useAuth();
  const {
    notes,
    loading: notesLoading,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    bulkDeleteNotes,
    bulkTransferFolder,
    bulkAddTag,
  } = useNotes();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [noteToShare, setNoteToShare] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk operations state
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkTagPopoverOpen, setBulkTagPopoverOpen] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get unique folders from notes
  const folders = [...new Set(notes.map((n) => n.folder).filter(Boolean))] as string[];

  // Stable filter & sort (pinned first, then created_at descending so clicking a note NEVER jumps it up!)
  const filteredNotes = notes
    .filter((n) => {
      const matchesFolder = !selectedFolder || n.folder === selectedFolder;
      const matchesSearch =
        !searchQuery ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.tags || []).some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFolder && matchesSearch;
    })
    .sort((a, b) => {
      // Pinned first
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1;
      }
      // Stable order by creation time: newly created notes appear at top,
      // but existing notes maintain their steady positions when clicked or edited!
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Auto-select first note or keep active note synchronized
  useEffect(() => {
    if (filteredNotes.length > 0 && !selectedNote) {
      setSelectedNote(filteredNotes[0]);
      setContent(filteredNotes[0].content);
    }
  }, [filteredNotes, selectedNote]);

  // Clean up selected IDs that are no longer in notes
  useEffect(() => {
    const existingIds = new Set(notes.map((n) => n.id));
    setSelectedNoteIds((prev) => prev.filter((id) => existingIds.has(id)));
  }, [notes]);

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
      setSelectedNoteIds((prev) => prev.filter((id) => id !== noteToDelete));
      setNoteToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handlePinClick = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    togglePin(noteId);
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
    const newTags = (selectedNote.tags || []).filter((t) => t !== tagToRemove);
    updateNote(selectedNote.id, { tags: newTags });
    setSelectedNote({ ...selectedNote, tags: newTags });
  };

  const handleFolderChange = (folder: string) => {
    if (!selectedNote) return;
    const newFolder = folder === 'none' ? null : folder;
    updateNote(selectedNote.id, { folder: newFolder });
    setSelectedNote({ ...selectedNote, folder: newFolder });
  };

  // Bulk action handlers
  const toggleSelectNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedNoteIds.length === filteredNotes.length) {
      setSelectedNoteIds([]);
    } else {
      setSelectedNoteIds(filteredNotes.map((n) => n.id));
    }
  };

  const handleBulkDelete = async () => {
    await bulkDeleteNotes(selectedNoteIds);
    if (selectedNote && selectedNoteIds.includes(selectedNote.id)) {
      setSelectedNote(null);
      setContent('');
    }
    setSelectedNoteIds([]);
    setBulkDeleteDialogOpen(false);
  };

  const handleBulkTransfer = async (folder: string) => {
    const targetFolder = folder === 'none' ? null : folder;
    await bulkTransferFolder(selectedNoteIds, targetFolder);
    setSelectedNoteIds([]);
  };

  const handleBulkAddTag = async () => {
    if (!bulkTagInput.trim()) return;
    await bulkAddTag(selectedNoteIds, bulkTagInput.trim());
    setBulkTagInput('');
    setBulkTagPopoverOpen(false);
    setSelectedNoteIds([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm font-medium">Loading notes...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const allFilteredSelected =
    filteredNotes.length > 0 && selectedNoteIds.length === filteredNotes.length;

  return (
    <div className="min-h-screen bg-background transition-theme flex flex-col">
      <NavBar />

      <main className="flex-1 container max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-5 min-h-[calc(100vh-80px)]">
        {notesLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
            <div className="w-16 h-16 bg-muted/60 rounded-2xl flex items-center justify-center mb-4 shadow-xs">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1 tracking-tight">No notes yet</h3>
            <p className="text-muted-foreground text-sm mb-5 max-w-sm">
              Capture your ideas, drafts, and meeting records. Format with headings, lists, and images.
            </p>
            <Button onClick={handleCreateNote} className="gap-2 h-9 px-4 rounded-lg shadow-sm">
              <Plus className="h-4 w-4" />
              New Note
            </Button>
          </div>
        ) : (
          <>
            {/* Notes Sidebar List */}
            <div className="w-full md:w-80 flex-shrink-0 flex flex-col">
              {/* Header: Title + New Button with matching hierarchy */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-base tracking-tight text-foreground">Notes</h2>
                  <Badge variant="secondary" className="text-xs h-5 px-1.5 font-normal">
                    {filteredNotes.length}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={handleCreateNote}
                  className="h-9 px-3.5 gap-1.5 shadow-sm font-medium rounded-lg text-xs"
                >
                  <Plus className="h-4 w-4" />
                  New Note
                </Button>
              </div>

              {/* Search + Folder Filter (Strictly matched h-9 heights) */}
              <div className="flex items-center gap-2 mb-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notes or tags..."
                    className="h-9 text-xs pl-8 pr-7 bg-card border-border rounded-lg shadow-2xs focus-visible:ring-1 focus-visible:ring-primary/40"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <Select
                  value={selectedFolder || 'all'}
                  onValueChange={(v) => setSelectedFolder(v === 'all' ? null : v)}
                >
                  <SelectTrigger className="w-32 h-9 text-xs bg-card border-border rounded-lg shadow-2xs">
                    <FolderOpen className="h-3.5 w-3.5 mr-1 text-muted-foreground flex-shrink-0" />
                    <SelectValue placeholder="All folders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All folders</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk Selection Action Bar */}
              {selectedNoteIds.length > 0 ? (
                <div className="mb-2.5 p-2 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between gap-1.5 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={handleSelectAll}
                      id="select-all-filtered"
                    />
                    <span className="font-semibold text-primary text-[11px]">
                      {selectedNoteIds.length} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Transfer to Folder */}
                    <Select onValueChange={handleBulkTransfer}>
                      <SelectTrigger className="h-7 px-2 text-[11px] bg-background border-border shadow-2xs gap-1">
                        <FolderInput className="h-3 w-3 text-muted-foreground" />
                        <span>Move</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No folder</SelectItem>
                        {folders.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Bulk Add Tag */}
                    <Popover open={bulkTagPopoverOpen} onOpenChange={setBulkTagPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[11px] bg-background border-border shadow-2xs gap-1"
                        >
                          <Tags className="h-3 w-3 text-muted-foreground" />
                          <span>Tag</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2 bg-card" align="end">
                        <div className="space-y-2">
                          <p className="text-xs font-medium">Add tag to {selectedNoteIds.length} notes</p>
                          <div className="flex items-center gap-1">
                            <Input
                              value={bulkTagInput}
                              onChange={(e) => setBulkTagInput(e.target.value)}
                              placeholder="e.g. work, ideas"
                              className="h-7 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleBulkAddTag();
                                }
                              }}
                            />
                            <Button size="sm" className="h-7 px-2 text-xs" onClick={handleBulkAddTag}>
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Bulk Delete */}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 px-2 text-[11px] gap-1"
                      onClick={() => setBulkDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </Button>

                    {/* Deselect All */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedNoteIds([])}
                      title="Clear selection"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-1 pb-1.5 text-[11px] text-muted-foreground">
                  <button
                    onClick={handleSelectAll}
                    className="hover:text-foreground flex items-center gap-1.5 transition-colors"
                  >
                    <Square className="h-3 w-3" />
                    <span>Select notes</span>
                  </button>
                  <span>
                    {filteredNotes.length} note{filteredNotes.length === 1 ? '' : 's'}
                  </span>
                </div>
              )}

              {/* Notes List Cards */}
              <div className="space-y-2 flex-1 max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
                {filteredNotes.map((note) => {
                  const isChecked = selectedNoteIds.includes(note.id);
                  const isSelected = selectedNote?.id === note.id;

                  return (
                    <Card
                      key={note.id}
                      className={cn(
                        'p-3 cursor-pointer transition-all group relative border-border/70 hover:border-primary/40',
                        isSelected && 'border-primary ring-1 ring-primary/20 bg-primary/5',
                        isChecked && 'bg-muted/40 border-primary/50'
                      )}
                      onClick={() => handleSelectNote(note)}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Checkbox for bulk actions */}
                        <div
                          className="pt-0.5"
                          onClick={(e) => toggleSelectNote(note.id, e)}
                        >
                          <Checkbox
                            checked={isChecked}
                            className="h-3.5 w-3.5 rounded-sm data-[state=checked]:bg-primary"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {note.is_pinned && (
                              <Pin className="h-3 w-3 text-primary flex-shrink-0" />
                            )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                                    {getNoteTitle(note.content)}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="text-xs">{getNoteTitle(note.content)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            {note.folder && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 font-medium">
                                <FolderOpen className="h-2.5 w-2.5" />
                                {note.folder}
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground/80">
                              {format(new Date(note.created_at), 'MMM d, h:mm a')}
                            </span>
                          </div>

                          {note.tags && note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {note.tags.slice(0, 2).map((tag) => (
                                <TagBadge key={tag} tag={tag} />
                              ))}
                              {note.tags.length > 2 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{note.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Hover Actions */}
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'h-6 w-6 rounded-md',
                              note.is_pinned
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                            onClick={(e) => handlePinClick(e, note.id)}
                            title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                          >
                            <Pin className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
                            onClick={(e) => handleShareClick(e, note)}
                            title="Share note"
                          >
                            <Share2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDeleteClick(e, note.id)}
                            title="Delete note"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Note Editor Area */}
            <div className="flex-1 flex flex-col min-h-[600px] md:min-h-[calc(100vh-140px)]">
              {selectedNote ? (
                <div className="flex flex-col h-full">
                  {/* Note Metadata Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-border">
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                      {/* Source Task Link */}
                      {selectedNote.source_task_id && (
                        <Link
                          to="/"
                          className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Source Task
                        </Link>
                      )}

                      {/* Folder Selector */}
                      <Select
                        value={selectedNote.folder || 'none'}
                        onValueChange={handleFolderChange}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs bg-card border-border rounded-lg shadow-2xs">
                          <FolderOpen className="h-3 w-3 mr-1 text-muted-foreground" />
                          <SelectValue placeholder="No folder" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No folder</SelectItem>
                          {folders.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                          <div className="p-2 border-t border-border">
                            <Input
                              placeholder="Create folder..."
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

                      {/* Tags Bar */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <Tag className="h-3 w-3 text-muted-foreground ml-1" />
                        {(selectedNote.tags || []).map((tag) => (
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
                          className="h-6 w-24 text-xs border-0 border-b border-border/60 rounded-none px-1 bg-transparent focus-visible:ring-0 focus-visible:border-primary"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                        onClick={(e) => handleShareClick(e, selectedNote)}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Share</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1.5"
                        onClick={(e) => handleDeleteClick(e, selectedNote.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </div>

                  {/* Rich Text Editor Container with increased height */}
                  <div className="flex-1 flex flex-col min-h-[560px]">
                    <RichTextEditor
                      content={content}
                      onChange={setContent}
                      placeholder="Type your note here... (Formatted text, headings, lists, images)"
                      maxCharacters={1000}
                      minHeight="540px"
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-xl p-8">
                  <FileText className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">Select a note from the list or create a new one to begin editing</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Share Modal */}
      <NoteShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        note={noteToShare}
      />

      {/* Single Note Delete Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card">
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

      {/* Bulk Delete Alert Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedNoteIds.length} notes?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete all {selectedNoteIds.length} selected notes.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}