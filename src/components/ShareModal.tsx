import { useState, useEffect } from 'react';
import { Copy, Check, Lock, Eye, EyeOff, RefreshCw, Share2, Download, ChevronDown } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Task } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}

interface SubtaskData {
  id: string;
  title: string;
  is_completed: boolean;
}

export function ShareModal({ open, onOpenChange, task }: ShareModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'password' | 'share'>('password');
  const [subtasks, setSubtasks] = useState<SubtaskData[]>([]);

  // Fetch subtasks when modal opens
  useEffect(() => {
    if (open && task) {
      fetchSubtasks();
    }
  }, [open, task]);

  const fetchSubtasks = async () => {
    if (!task) return;
    
    const { data } = await supabase
      .from('subtasks')
      .select('id, title, is_completed')
      .eq('task_id', task.id)
      .order('position', { ascending: true });
    
    setSubtasks(data || []);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  const generateShareLink = async () => {
    if (!task || !password.trim()) {
      toast({
        title: 'Password required',
        description: 'Please enter a password to protect the shared note.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Generate a unique token
      const shareToken = crypto.randomUUID();
      
      // Hash password using bcrypt via edge function
      const hashResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hash-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hash', password }),
      });
      
      if (!hashResponse.ok) {
        throw new Error('Failed to hash password');
      }
      
      const { hash: passwordHash } = await hashResponse.json();

      // Save to database with subtasks
      const { error } = await supabase.from('shared_notes').insert({
        task_id: task.id,
        share_token: shareToken,
        password_hash: passwordHash,
        title: task.title,
        description: task.description,
        tags: task.tags,
        subtasks: subtasks as unknown as any,
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
      setSubtasks([]);
    }, 200);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: task?.title || 'Shared Task',
          text: 'Check out this task I shared with you!',
          url: shareLink,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      copyToClipboard();
    }
  };

  const qrCodeUrl = shareLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareLink)}`
    : '';

  const qrCodeSvgUrl = shareLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(shareLink)}`
    : '';

  const exportQRCodePng = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'task-qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'QR code downloaded as PNG!' });
  };

  const exportQRCodeSvg = async () => {
    try {
      const response = await fetch(qrCodeSvgUrl);
      const svgText = await response.text();
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'task-qr-code.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'QR code downloaded as SVG!' });
    } catch {
      toast({ title: 'Failed to download SVG', variant: 'destructive' });
    }
  };

  const copyQRCodeSvg = async () => {
    try {
      const response = await fetch(qrCodeSvgUrl);
      const svgText = await response.text();
      await navigator.clipboard.writeText(svgText);
      toast({ title: 'SVG code copied to clipboard!' });
    } catch {
      toast({ title: 'Failed to copy SVG', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === 'password' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Share Task
              </DialogTitle>
              <DialogDescription>
                Set a password to protect this task. Anyone with the link will need this password to view it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="font-medium text-sm text-secondary-foreground">{task?.title}</p>
                {subtasks.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {subtasks.length} subtask{subtasks.length > 1 ? 's' : ''} will be included
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password (min 8 characters)"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generatePassword}
                    title="Generate password"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
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
          </>
        ) : (
          <div className="text-center space-y-6 py-4">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full border-2 border-foreground flex items-center justify-center">
                <Check className="h-7 w-7 text-foreground" />
              </div>
            </div>

            {/* Success Message */}
            <div>
              <h2 className="text-xl font-semibold mb-1">Task shared successfully</h2>
              <p className="text-sm text-muted-foreground">
                Your task has been shared. You can now share it using the following link.
              </p>
            </div>

            {/* Share Link */}
            <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground break-all text-left">
              {shareLink}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={copyToClipboard} className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy link
              </Button>
              <Button variant="outline" onClick={shareNative} className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>

            {/* QR Code Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-24 h-24"
                  />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-medium mb-1">Share this task on mobile</h3>
                  <p className="text-sm text-muted-foreground">
                    You can scan this QR code to view the task on your mobile device. You can also export the QR code image to share it with others.
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    Export QR code
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={exportQRCodePng}>
                    <Download className="h-4 w-4 mr-2" />
                    Download as PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportQRCodeSvg}>
                    <Download className="h-4 w-4 mr-2" />
                    Download as SVG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyQRCodeSvg}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy SVG code
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Done Button */}
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
