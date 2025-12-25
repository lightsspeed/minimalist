import { cn } from '@/lib/utils';

interface TagBadgeProps {
  tag: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export function TagBadge({ tag, onClick, active, className }: TagBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-theme',
        onClick && 'cursor-pointer hover:opacity-80',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-tag text-tag-foreground',
        className
      )}
    >
      {tag}
    </span>
  );
}