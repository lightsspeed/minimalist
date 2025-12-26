import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [step, setStep] = useState<'options' | 'success'>('options');
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
      setStep('success');
      
      toast({ title: 'Note shared successfully!' });
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

  const qrCodeSvgUrl = shareLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(shareLink)}`
    : '';

  const exportQRCodePng = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'note-qr-code.png';
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
      link.download = 'note-qr-code.svg';
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

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared Note',
          text: 'Check out this note I shared with you!',
          url: shareLink,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === 'options' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Share Note
              </DialogTitle>
              <DialogDescription>
                Set options to share this note securely.
              </DialogDescription>
            </DialogHeader>
            
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
              <h2 className="text-xl font-semibold mb-1">Note created successfully</h2>
              <p className="text-sm text-muted-foreground">
                Your note has been created. You can now share it using the following link.
              </p>
            </div>

            {/* Share Link */}
            <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground break-all text-left">
              {shareLink}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={copyToClipboard}
                className="gap-2 border-foreground text-foreground hover:bg-foreground hover:text-background"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy link
              </Button>
              <Button
                variant="outline"
                onClick={shareNative}
                className="gap-2 border-foreground text-foreground hover:bg-foreground hover:text-background"
              >
                <Share2 className="h-4 w-4" />
                Share note
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
                  <h3 className="font-medium mb-1">Share this note on mobile</h3>
                  <p className="text-sm text-muted-foreground">
                    You can scan this QR code to view the note on your mobile device. You can also export the QR code image to share it with others.
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 border-foreground text-foreground hover:bg-foreground hover:text-background">
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
