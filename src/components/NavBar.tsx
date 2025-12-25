import { Link, useLocation } from 'react-router-dom';
import { ListTodo, FileText, BarChart3, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';

export function NavBar() {
  const { signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
      <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ListTodo className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="font-semibold text-lg">Minimalist</h1>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <Link to="/">
            <Button 
              variant={location.pathname === '/' ? 'secondary' : 'ghost'} 
              size="icon" 
              title="Tasks"
            >
              <ListTodo className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/notes">
            <Button 
              variant={location.pathname === '/notes' ? 'secondary' : 'ghost'} 
              size="icon" 
              title="Notes"
            >
              <FileText className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/analytics">
            <Button 
              variant={location.pathname === '/analytics' ? 'secondary' : 'ghost'} 
              size="icon" 
              title="Analytics"
            >
              <BarChart3 className="h-5 w-5" />
            </Button>
          </Link>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
