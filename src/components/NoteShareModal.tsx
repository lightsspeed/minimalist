import { useState } from 'react';
import { Copy, Check, QrCode, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Note } from '@/hooks/useNotes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface NoteShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
}

type ExpirationOption = '1hour' | '1day' | '1week' | '1month';

export function NoteShareModal({ open, onOpenChange, note }: NoteShareModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'options' | 'share'>('options');
  const [expiration, setExpiration] = useState<ExpirationOption>('1day');
  const [deleteAfterReading, setDeleteAfterReading] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  const getExpirationDate = (): Date => {
    const now = new Date();
    switch (expiration) {
      case '1hour':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case '1day':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '1week':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case '1month':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  };

  const generateShareLink = async () => {
    if (!note || !password.trim()) {
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
      const shareToken = crypto.randomUUID();
      
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const expiresAt = getExpirationDate();
      const noteTitle = note.content.split('\n')[0] || 'Shared Note';

      const { error } = await supabase.from('shared_personal_notes').insert({
        note_id: note.id,
        share_token: shareToken,
        password_hash: passwordHash,
        title: noteTitle.substring(0, 100),
        content: note.content,
        expires_at: expiresAt.toISOString(),
        delete_after_reading: deleteAfterReading,
      });

      if (error) throw error;

      const link = `${window.location.origin}/shared-note/${shareToken}`;
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
    setTimeout(() => {
      setPassword('');
      setShareLink('');
      setStep('options');
      setCopied(false);
      setExpiration('1day');
      setDeleteAfterReading(false);
    }, 200);
  };

  const qrCodeUrl = shareLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareLink)}`
    : '';

  const expirationOptions: { value: ExpirationOption; label: string }[] = [
    { value: '1hour', label: '1 hour' },
    { value: '1day', label: '1 day' },
    { value: '1week', label: '1 week' },
    { value: '1month', label: '1 month' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Share Note
          </DialogTitle>
          <DialogDescription>
            {step === 'options' 
              ? 'Set options to share this note securely.'
              : 'Share this link with anyone. They\'ll need the password you set to view the note.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'options' ? (
          <div className="space-y-5">
            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-primary">Note password</Label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password..."
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

            {/* Expiration */}
            <div className="space-y-2">
              <Label className="text-primary">Expiration delay</Label>
              <div className="flex gap-2">
                {expirationOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={expiration === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExpiration(opt.value)}
                    className="flex-1"
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Delete after reading */}
            <div className="space-y-2">
              <Label className="text-primary">Delete after reading</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Delete the note after reading
                </span>
                <Switch
                  checked={deleteAfterReading}
                  onCheckedChange={setDeleteAfterReading}
                />
              </div>
            </div>

            <Button onClick={generateShareLink} disabled={loading} className="w-full">
              {loading ? 'Creating...' : '+ Create note'}
            </Button>
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
