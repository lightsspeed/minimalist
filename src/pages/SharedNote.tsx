import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, ListTodo, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TagBadge } from '@/components/TagBadge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SubtaskData {
  id: string;
  title: string;
  is_completed: boolean;
}

interface SharedNote {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  subtasks: SubtaskData[];
  created_at: string;
}

export default function SharedNote() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [note, setNote] = useState<SharedNote | null>(null);
  const [noteExists, setNoteExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [notFound, setNotFound] = useState(false);
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

    // Use secure preview function - only returns id and created_at, no sensitive data
    const { data, error } = await supabase.rpc('shared_note_preview', {
      p_share_token: token
    });

    if (error || !data || data.length === 0) {
      setNotFound(true);
    } else {
      setNoteExists(true);
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
      // Hash the entered password
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Use secure fetch function - verifies password server-side
      const { data: noteData, error } = await supabase.rpc('fetch_shared_note', {
        p_share_token: token,
        p_password_hash: passwordHash
      });

      if (error || !noteData || noteData.length === 0) {
        toast({
          title: 'Incorrect password',
          description: 'The password you entered is incorrect.',
          variant: 'destructive',
        });
        return;
      }

      const fetchedNote = noteData[0] as unknown as {
        id: string;
        task_id: string;
        title: string;
        description: string | null;
        tags: string[] | null;
        subtasks: SubtaskData[] | null;
        expires_at: string | null;
        created_at: string;
      };

      // Password correct - show note
      setNote({
        id: fetchedNote.id,
        title: fetchedNote.title,
        description: fetchedNote.description,
        tags: fetchedNote.tags || [],
        subtasks: fetchedNote.subtasks || [],
        created_at: fetchedNote.created_at,
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
                <ListTodo className="h-8 w-8 text-muted-foreground" />
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
              <CardTitle>Protected Task</CardTitle>
              <CardDescription>
                Enter the password to view this shared task.
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
                  {verifying ? 'Verifying...' : 'Unlock Task'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : note && (
          <Card className="w-full max-w-2xl animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl">{note.title}</CardTitle>
              <CardDescription>
                Shared on {format(new Date(note.created_at), 'MMMM d, yyyy • h:mm a')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {note.description && (
                <p className="text-foreground whitespace-pre-wrap">{note.description}</p>
              )}
              
              {/* Subtasks */}
              {note.subtasks && note.subtasks.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Subtasks</h4>
                  <ul className="space-y-2">
                    {note.subtasks.map((subtask) => (
                      <li key={subtask.id} className="flex items-center gap-2 text-sm">
                        {subtask.is_completed ? (
                          <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className={subtask.is_completed ? 'line-through text-muted-foreground' : ''}>
                          {subtask.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {note.tags.map((tag) => (
                    <TagBadge key={tag} tag={tag} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
