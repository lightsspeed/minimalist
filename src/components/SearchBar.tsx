import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep expanded if there's a value
  useEffect(() => {
    if (value) {
      setIsExpanded(true);
    }
  }, [value]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Keyboard shortcut: Cmd/Ctrl + K to toggle search
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsExpanded((prev) => {
        if (!prev) {
          return true;
        } else {
          onChange('');
          return false;
        }
      });
    }
  }, [onChange]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleClose = () => {
    onChange('');
    setIsExpanded(false);
  };

  return (
    <div className="relative flex items-center">
      {/* Collapsed state: just the search icon button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "transition-all duration-300 ease-in-out",
          isExpanded ? "w-0 opacity-0 overflow-hidden p-0" : "w-10 opacity-100"
        )}
        onClick={() => setIsExpanded(true)}
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Expanded state: the full search input */}
      <div
        className={cn(
          "flex items-center transition-all duration-300 ease-in-out overflow-hidden",
          isExpanded ? "w-full opacity-100" : "w-0 opacity-0"
        )}
      >
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search tasks..."
            className="pl-9 pr-9 focus:bg-hover-blue transition-colors"
            onBlur={() => {
              if (!value) {
                setIsExpanded(false);
              }
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}