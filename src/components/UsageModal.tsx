import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { APP_VERSION_INFO } from '@/lib/version';
import { Tag, Sparkles } from 'lucide-react';

interface UsageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UsageModal({ open, onOpenChange }: UsageModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg mx-auto max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>How to Use & Keyboard Shortcuts</DialogTitle>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              v{APP_VERSION_INFO.version}
            </span>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-4 text-sm md:text-base">
          {/* Quick Start */}
          <section>
            <h3 className="font-semibold mb-2">Quick Start</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li>• Create tasks with titles, descriptions, and tags</li>
              <li>• Drag and drop to reorder tasks</li>
              <li>• Click on tags to filter tasks</li>
              <li>• Share tasks via secure password-protected links</li>
              <li>• Toggle light/dark mode with the sun/moon icon</li>
            </ul>
          </section>

          <Separator />

          {/* Keyboard Shortcuts */}
          <section>
            <h3 className="font-semibold mb-3">Keyboard Shortcuts</h3>
            
            {/* macOS */}
            <div className="mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">macOS</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                  <span>New task</span>
                  <kbd className="px-2 py-0.5 bg-background border rounded text-xs font-mono">⌘ N</kbd>
                </div>
                <div className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                  <span>Close modal</span>
                  <kbd className="px-2 py-0.5 bg-background border rounded text-xs font-mono">Esc</kbd>
                </div>
                <div className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                  <span>Toggle search</span>
                  <kbd className="px-2 py-0.5 bg-background border rounded text-xs font-mono">⌘ K</kbd>
                </div>
              </div>
            </div>

            {/* Windows / Linux */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Windows / Linux (Ubuntu)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                  <span>New task</span>
                  <kbd className="px-2 py-0.5 bg-background border rounded text-xs font-mono">Ctrl N</kbd>
                </div>
                <div className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                  <span>Close modal</span>
                  <kbd className="px-2 py-0.5 bg-background border rounded text-xs font-mono">Esc</kbd>
                </div>
                <div className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                  <span>Toggle search</span>
                  <kbd className="px-2 py-0.5 bg-background border rounded text-xs font-mono">Ctrl K</kbd>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Pages */}
          <section>
            <h3 className="font-semibold mb-2">Pages</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li><strong>Tasks:</strong> Manage your to-do list with drag-and-drop reordering</li>
              <li><strong>Notes:</strong> Rich text notes with formatting, custom fonts & AI actions</li>
              <li><strong>Analytics:</strong> View your productivity stats and progress</li>
            </ul>
          </section>

          <Separator />

          {/* App Versioning - SemVer */}
          <section className="p-3.5 rounded-lg border border-border/70 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" /> Application Versioning
              </span>
              <span className="font-mono text-xs font-bold text-primary">
                v{APP_VERSION_INFO.version}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Minimalist follows standard <strong>Semantic Versioning (SemVer 2.0.0)</strong> in the format <code className="text-foreground font-mono">MAJOR.MINOR.PATCH</code>:
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 text-xs font-mono text-center">
              <div className="p-1.5 rounded bg-background border border-border/50">
                <div className="text-[10px] text-muted-foreground uppercase">Major</div>
                <div className="font-bold text-foreground">{APP_VERSION_INFO.major}</div>
                <div className="text-[9px] text-muted-foreground">Core Platform</div>
              </div>
              <div className="p-1.5 rounded bg-background border border-border/50">
                <div className="text-[10px] text-muted-foreground uppercase">Minor</div>
                <div className="font-bold text-primary">{APP_VERSION_INFO.minor}</div>
                <div className="text-[9px] text-muted-foreground">Features (Novu/Editor)</div>
              </div>
              <div className="p-1.5 rounded bg-background border border-border/50">
                <div className="text-[10px] text-muted-foreground uppercase">Patch</div>
                <div className="font-bold text-foreground">{APP_VERSION_INFO.patch}</div>
                <div className="text-[9px] text-muted-foreground">Fixes & Stability</div>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
