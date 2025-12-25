import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SharedNoteData {
  id: string;
  title: string;
  content: string;
  created_at: string;
  expires_at: string | null;
  delete_after_reading: boolean;
}

export default function SharedPersonalNote() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [note, setNote] = useState<SharedNoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [expired, setExpired] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    checkNoteExists();
  }, [token]);

  const checkNoteExists = async () => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('shared_personal_notes')
      .select('id, title, content, created_at, expires_at, delete_after_reading, password_hash, is_read')
      .eq('share_token', token)
      .maybeSingle();

    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setExpired(true);
      setLoading(false);
      return;
    }

    // Check if already read and delete_after_reading is true
    if (data.delete_after_reading && data.is_read) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast({
        title: 'Password required',
        description: 'Please enter the password to view this note.',
        variant: 'destructive',
      });
      return;
    }

    setVerifying(true);

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: noteData, error } = await supabase
        .from('shared_personal_notes')
        .select('id, title, content, created_at, expires_at, delete_after_reading, password_hash, is_read')
        .eq('share_token', token)
        .maybeSingle();

      if (error || !noteData) {
        toast({
          title: 'Note not found',
          description: 'This shared note may have been deleted.',
          variant: 'destructive',
        });
        return;
      }

      if (noteData.password_hash !== passwordHash) {
        toast({
          title: 'Incorrect password',
          description: 'The password you entered is incorrect.',
          variant: 'destructive',
        });
        return;
      }

      // Mark as read if delete_after_reading
      if (noteData.delete_after_reading && !noteData.is_read) {
        await supabase
          .from('shared_personal_notes')
          .update({ is_read: true })
          .eq('id', noteData.id);
      }

      setNote({
        id: noteData.id,
        title: noteData.title,
        content: noteData.content,
        created_at: noteData.created_at,
        expires_at: noteData.expires_at,
        delete_after_reading: noteData.delete_after_reading,
      });
      setUnlocked(true);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex flex-col bg-background transition-theme">
        <header className="flex justify-end p-4">
          <ThemeToggle />
        </header>
        <main className="flex-1 flex items-center justify-center px-4 pb-16">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Note expired</CardTitle>
              <CardDescription>
                This shared note has expired and is no longer accessible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Go to app
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col bg-background transition-theme">
        <header className="flex justify-end p-4">
          <ThemeToggle />
        </header>
        <main className="flex-1 flex items-center justify-center px-4 pb-16">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-2">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle>Note not found</CardTitle>
              <CardDescription>
                This shared note doesn't exist or has been deleted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Go to app
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background transition-theme">
      <header className="flex justify-between items-center p-4">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Button>
        </Link>
        <ThemeToggle />
      </header>
      
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        {!unlocked ? (
          <Card className="w-full max-w-md animate-fade-in">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Protected Note</CardTitle>
              <CardDescription>
                Enter the password to view this shared note.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={verifying}>
                  {verifying ? 'Verifying...' : 'Unlock Note'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : note && (
          <Card className="w-full max-w-2xl animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl">{note.title}</CardTitle>
              <CardDescription className="flex flex-col gap-1">
                <span>Shared on {format(new Date(note.created_at), 'MMMM d, yyyy • h:mm a')}</span>
                {note.delete_after_reading && (
                  <span className="text-destructive text-xs flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    This note will be deleted after you leave this page
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
