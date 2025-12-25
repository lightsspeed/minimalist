import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Archive, Copy, CheckCircle2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NavBar } from '@/components/NavBar';
import { TaskCard } from '@/components/TaskCard';
import { TaskModal } from '@/components/TaskModal';
import { ShareModal } from '@/components/ShareModal';
import { SearchBar } from '@/components/SearchBar';
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

export default function ArchivePage() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, loading: tasksLoading, updateTask, deleteTask, togglePin, toggleTemplate, convertToNote, addTaskFromTemplate } = useTasks();
  
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'completed' | 'templates'>('completed');

  // Filter completed tasks
  const completedTasks = useMemo(() => {
    let result = tasks.filter(t => t.is_completed && !t.is_template);
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }
    
    return result.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [tasks, searchQuery]);

  // Filter templates
  const templates = useMemo(() => {
    let result = tasks.filter(t => t.is_template);
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [tasks, searchQuery]);

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

  const handleEditClick = (task: Task) => {
    setSelectedTask(task);
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
    if (selectedTask) {
      await updateTask(selectedTask.id, { title, description, tags });
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    await updateTask(id, { is_completed: completed });
  };

  const handleTogglePin = async (id: string) => {
    await togglePin(id);
  };

  const handleConvertToNote = async (task: Task) => {
    await convertToNote(task);
  };

  const handleSaveAsTemplate = async (task: Task) => {
    await toggleTemplate(task.id);
  };

  const handleUseTemplate = async (template: Task) => {
    await addTaskFromTemplate(template);
  };

  return (
    <div className="min-h-screen bg-background transition-theme">
      <NavBar />

      <main className="container max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Archive className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Archive</h1>
            <p className="text-sm text-muted-foreground">Completed tasks and templates</p>
          </div>
        </div>

        <div className="mb-6">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'completed' | 'templates')}>
          <TabsList className="mb-4">
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed ({completedTasks.length})
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Layers className="h-4 w-4" />
              Templates ({templates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="completed">
            {tasksLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : completedTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-lg mb-1">No completed tasks</h3>
                  <p className="text-muted-foreground text-sm">
                    {searchQuery ? 'Try adjusting your search' : 'Complete tasks to see them here'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onShare={handleShareClick}
                    onToggleComplete={handleToggleComplete}
                    onTogglePin={handleTogglePin}
                    onConvertToNote={handleConvertToNote}
                    onSaveAsTemplate={handleSaveAsTemplate}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates">
            {tasksLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Layers className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-lg mb-1">No templates</h3>
                  <p className="text-muted-foreground text-sm">
                    {searchQuery ? 'Try adjusting your search' : 'Save tasks as templates to reuse them'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <Card key={template.id} className="border-accent-foreground/30 bg-accent/10">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Copy className="h-4 w-4 text-accent-foreground flex-shrink-0" />
                            <CardTitle className="text-base font-semibold truncate">
                              {template.title}
                            </CardTitle>
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUseTemplate(template)}
                            className="gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Use
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveAsTemplate(template)}
                            className="text-destructive hover:text-destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {template.tags.length > 0 && (
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1.5">
                          {template.tags.map((tag) => (
                            <span key={tag} className="text-xs px-2 py-0.5 bg-tag text-tag-foreground rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        onSubmit={handleTaskSubmit}
        task={selectedTask}
        mode="edit"
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
              This action cannot be undone. The task will be permanently deleted.
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
