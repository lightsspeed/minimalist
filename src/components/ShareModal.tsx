import { useState } from 'react';
import { Copy, Check, QrCode, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Task } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}

export function ShareModal({ open, onOpenChange, task }: ShareModalProps) {
  const [password, setPassword] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'password' | 'share'>('password');

  const generateShareLink = async () => {
    if (!task || !password.trim()) {
      toast({
        title: 'Password required',
        description: 'Please enter a password to protect the shared note.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 4) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 4 characters.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Generate a unique token
      const shareToken = crypto.randomUUID();
      
      // Simple hash for the password (in production, use bcrypt on backend)
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Save to database
      const { error } = await supabase.from('shared_notes').insert({
        task_id: task.id,
        share_token: shareToken,
        password_hash: passwordHash,
        title: task.title,
        description: task.description,
        tags: task.tags,
      });

      if (error) throw error;

      const link = `${window.location.origin}/shared/${shareToken}`;
      setShareLink(link);
      setStep('share');
      
      toast({ title: 'Share link created!' });
    } catch (error: any) {
      toast({
        title: 'Error creating share link',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast({ title: 'Link copied to clipboard!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setPassword('');
      setShareLink('');
      setStep('password');
      setCopied(false);
    }, 200);
  };

  const qrCodeUrl = shareLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareLink)}`
    : '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Share Note
          </DialogTitle>
          <DialogDescription>
            {step === 'password' 
              ? 'Set a password to protect this note. Anyone with the link will need this password to view it.'
              : 'Share this link with anyone. They\'ll need the password you set to view the note.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'password' ? (
          <div className="space-y-4">
            <div className="p-3 bg-secondary rounded-lg">
              <p className="font-medium text-sm text-secondary-foreground">{task?.title}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min 4 characters)"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={generateShareLink} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Link'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR Code
              </Label>
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={qrCodeUrl}
                  alt="QR Code for share link"
                  className="w-48 h-48"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}