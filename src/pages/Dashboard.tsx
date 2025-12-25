import { useState, useMemo, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, X, ListTodo } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { NavBar } from '@/components/NavBar';
import { TaskCard } from '@/components/TaskCard';
import { TaskModal } from '@/components/TaskModal';
import { ShareModal } from '@/components/ShareModal';
import { SearchBar } from '@/components/SearchBar';
import { SortSelect, SortOption } from '@/components/SortSelect';
import { TagBadge } from '@/components/TagBadge';
import { useAuth } from '@/hooks/useAuth';
import { useTasks, Task } from '@/hooks/useTasks';
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

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, loading: tasksLoading, addTask, updateTask, deleteTask, reorderTasks } = useTasks();
  
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach((task) => task.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [tasks]);

  // Filter and sort tasks - completed tasks go to bottom
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }
    
    // Filter by active tag
    if (activeTag) {
      result = result.filter((task) => task.tags.includes(activeTag));
    }
    
    // Sort - completed tasks always at bottom
    result.sort((a, b) => {
      // First, sort by completion status
      if (a.is_completed !== b.is_completed) {
        return a.is_completed ? 1 : -1;
      }
      // Sort by position for drag-and-drop ordering
      return (a.position || 0) - (b.position || 0);
    });
    
    return result;
  }, [tasks, searchQuery, sortOption, activeTag]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Cmd/Ctrl + N to add new task
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      setSelectedTask(null);
      setModalMode('add');
      setTaskModalOpen(true);
    }
    // Escape to close modals
    if (e.key === 'Escape') {
      setTaskModalOpen(false);
      setShareModalOpen(false);
      setDeleteDialogOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = filteredTasks.findIndex(t => t.id === active.id);
      const newIndex = filteredTasks.findIndex(t => t.id === over.id);
      const reordered = arrayMove(filteredTasks, oldIndex, newIndex).map((task, index) => ({
        ...task,
        position: index,
      }));
      reorderTasks(reordered);
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

  const handleAddClick = () => {
    setSelectedTask(null);
    setModalMode('add');
    setTaskModalOpen(true);
  };

  const handleEditClick = (task: Task) => {
    setSelectedTask(task);
    setModalMode('edit');
    setTaskModalOpen(true);
  };

  const handleShareClick = (task: Task) => {
    setSelectedTask(task);
    setShareModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setTaskToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (taskToDelete) {
      await deleteTask(taskToDelete);
      setTaskToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleTaskSubmit = async (title: string, description: string, tags: string[]) => {
    if (modalMode === 'add') {
      await addTask(title, description, tags);
    } else if (selectedTask) {
      await updateTask(selectedTask.id, { title, description, tags });
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    await updateTask(id, { is_completed: completed });
  };

  const handleTagClick = (tag: string) => {
    setActiveTag(activeTag === tag ? null : tag);
  };

  return (
    <div className="min-h-screen bg-background transition-theme">
      <NavBar />

      {/* Main Content */}
      <main className="container max-w-3xl mx-auto px-4 py-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
          <div className="flex gap-2">
            <SortSelect value={sortOption} onChange={setSortOption} />
            <Button onClick={handleAddClick} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Task</span>
            </Button>
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {activeTag && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setActiveTag(null)}
              >
                <X className="h-3 w-3 mr-1" />
                Clear filter
              </Button>
            )}
            {allTags.map((tag) => (
              <TagBadge
                key={tag}
                tag={tag}
                active={activeTag === tag}
                onClick={() => handleTagClick(tag)}
              />
            ))}
          </div>
        )}

        {/* Keyboard hint */}
        <p className="text-xs text-muted-foreground mb-4">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘N</kbd> to add a task • Drag to reorder
        </p>

        {/* Task List */}
        {tasksLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <ListTodo className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-1">
              {searchQuery || activeTag ? 'No tasks found' : 'No tasks yet'}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {searchQuery || activeTag
                ? 'Try adjusting your search or filters'
                : 'Create your first task to get started'
              }
            </p>
            {!searchQuery && !activeTag && (
              <Button onClick={handleAddClick} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onShare={handleShareClick}
                    onToggleComplete={handleToggleComplete}
                    onTagClick={handleTagClick}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      {/* Modals */}
      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        onSubmit={handleTaskSubmit}
        task={selectedTask}
        mode={modalMode}
      />

      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        task={selectedTask}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task and any shared links will be permanently deleted.
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
