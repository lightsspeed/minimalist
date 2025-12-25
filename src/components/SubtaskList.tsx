import { useState } from 'react';
import { Plus, X, Check, Circle, GripVertical, ChevronRight, ChevronDown } from 'lucide-react';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubtasks, Subtask } from '@/hooks/useSubtasks';
import { cn } from '@/lib/utils';

interface SubtaskListProps {
  taskId: string;
  onAllCompleted?: () => void;
}

interface SubtaskItemProps {
  subtask: Subtask;
  depth: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, title: string) => void;
}

function SubtaskItem({
  subtask,
  depth,
  onToggle,
  onDelete,
  onAddChild,
}: SubtaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildTitle, setNewChildTitle] = useState('');
  const hasChildren = subtask.children && subtask.children.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleAddChild = () => {
    if (!newChildTitle.trim()) return;
    onAddChild(subtask.id, newChildTitle.trim());
    setNewChildTitle('');
    setIsAddingChild(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddChild();
    } else if (e.key === 'Escape') {
      setNewChildTitle('');
      setIsAddingChild(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'animate-fade-in',
        isDragging && 'opacity-50'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 group py-2 px-3 rounded-lg transition-all duration-200',
          'hover:bg-muted/50',
          depth > 0 && 'ml-6 border-l-2 border-border/60'
        )}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors',
            'text-muted-foreground/60 hover:text-foreground hover:bg-muted',
            !hasChildren && 'invisible'
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Drag handle */}
        <button
          className="flex-shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground transition-colors rounded p-0.5 hover:bg-muted"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Checkbox */}
        <button
          onClick={() => onToggle(subtask.id)}
          className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
        >
          {subtask.is_completed ? (
            <div className="h-5 w-5 rounded-full bg-success flex items-center justify-center">
              <Check className="h-3 w-3 text-success-foreground" />
            </div>
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        {/* Title */}
        <span
          className={cn(
            'flex-1 text-sm text-foreground',
            subtask.is_completed && 'line-through text-muted-foreground'
          )}
        >
          {subtask.title}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {depth < 2 && (
            <button
              onClick={() => setIsAddingChild(true)}
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all rounded-md"
              title="Add nested subtask"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => onDelete(subtask.id)}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-md"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Add child input */}
      {isAddingChild && (
        <div className={cn('flex items-center gap-2 mt-1 mb-2 pl-12', depth > 0 && 'ml-6')}>
          <Input
            value={newChildTitle}
            onChange={(e) => setNewChildTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add nested subtask..."
            className="h-8 text-sm flex-1 bg-background"
            autoFocus
          />
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-success/10 hover:text-success" onClick={handleAddChild}>
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              setNewChildTitle('');
              setIsAddingChild(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {subtask.children!.map((child) => (
            <SubtaskItem
              key={child.id}
              subtask={child}
              depth={depth + 1}
              onToggle={onToggle}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SubtaskList({ taskId, onAllCompleted }: SubtaskListProps) {
  const { subtasks, subtaskTree, loading, addSubtask, updateSubtask, deleteSubtask, reorderSubtasks } = useSubtasks(taskId, {
    onAllCompleted,
  });
  const [newSubtask, setNewSubtask] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleAdd = async () => {
    if (!newSubtask.trim()) return;
    
    await addSubtask(newSubtask.trim());
    setNewSubtask('');
    setIsAdding(false);
  };

  const handleAddChild = async (parentId: string, title: string) => {
    await addSubtask(title, parentId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setNewSubtask('');
      setIsAdding(false);
    }
  };

  const handleToggle = async (id: string) => {
    const subtask = subtasks.find(s => s.id === id);
    if (subtask) {
      await updateSubtask(id, { is_completed: !subtask.is_completed });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = subtasks.findIndex(s => s.id === active.id);
      const newIndex = subtasks.findIndex(s => s.id === over.id);
      const reordered = arrayMove(subtasks, oldIndex, newIndex);
      reorderSubtasks(reordered);
    }
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground py-3">Loading subtasks...</div>;
  }

  const completedCount = subtasks.filter(s => s.is_completed).length;
  const totalCount = subtasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="mt-4 pt-4 border-t border-border/40">
      {/* Progress header */}
      {totalCount > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-medium text-foreground">
            Subtasks
          </span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-success rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {completedCount}/{totalCount}
          </span>
        </div>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5">
            {subtaskTree.map((subtask) => (
              <SubtaskItem
                key={subtask.id}
                subtask={subtask}
                depth={0}
                onToggle={handleToggle}
                onDelete={deleteSubtask}
                onAddChild={handleAddChild}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isAdding ? (
        <div className="flex items-center gap-2 mt-3 pl-7">
          <Input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add subtask..."
            className="h-9 text-sm bg-background"
            autoFocus
          />
          <Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:bg-success/10 hover:text-success" onClick={handleAdd}>
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              setNewSubtask('');
              setIsAdding(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-sm mt-3 text-muted-foreground hover:text-foreground gap-2 hover:bg-muted/50"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4" />
          Add subtask
        </Button>
      )}
    </div>
  );
}
