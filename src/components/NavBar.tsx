import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ListTodo, FileText, BarChart3, LogOut, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { UsageModal } from '@/components/UsageModal';
import logo from '@/assets/logo.png';

export function NavBar() {
  const { signOut } = useAuth();
  const location = useLocation();
  const [usageModalOpen, setUsageModalOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={logo} 
                alt="Minimalist Logo" 
                className="h-8 w-8 dark:brightness-0 dark:invert"
              />
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
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setUsageModalOpen(true)} 
              title="Usage & Shortcuts"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      
      <UsageModal open={usageModalOpen} onOpenChange={setUsageModalOpen} />
    </>
  );
}
