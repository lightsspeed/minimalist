import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface UsageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UsageModal({ open, onOpenChange }: UsageModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>How to Use & Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
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
              <div className="grid grid-cols-2 gap-2 text-sm">
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
              <div className="grid grid-cols-2 gap-2 text-sm">
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
              <li><strong>Notes:</strong> Quick notes with file attachments and sharing</li>
              <li><strong>Analytics:</strong> View your productivity stats and progress</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
