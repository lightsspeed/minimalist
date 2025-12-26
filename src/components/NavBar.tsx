import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ListTodo, FileText, BarChart3, LogOut, HelpCircle, Archive, Bug, Mail, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { UsageModal } from '@/components/UsageModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/">
                    <Button 
                      variant={location.pathname === '/' ? 'secondary' : 'ghost'} 
                      size="icon"
                    >
                      <ListTodo className="h-5 w-5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Tasks</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/notes">
                    <Button 
                      variant={location.pathname === '/notes' ? 'secondary' : 'ghost'} 
                      size="icon"
                    >
                      <FileText className="h-5 w-5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Notes</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/archive">
                    <Button 
                      variant={location.pathname === '/archive' ? 'secondary' : 'ghost'} 
                      size="icon"
                    >
                      <Archive className="h-5 w-5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Archive</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/analytics">
                    <Button 
                      variant={location.pathname === '/analytics' ? 'secondary' : 'ghost'} 
                      size="icon"
                    >
                      <BarChart3 className="h-5 w-5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Analytics</TooltipContent>
              </Tooltip>
              <ThemeToggle />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setUsageModalOpen(true)}
                  >
                    <HelpCircle className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Usage & Shortcuts</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Bug className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Report a Bug</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <a 
                      href="mailto:akhileshchoure1@gmail.com" 
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Mail className="h-4 w-4" />
                      Email: akhileshchoure1@gmail.com
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a 
                      href="https://github.com/lightsspeed/minimalist/issues/new" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Github className="h-4 w-4" />
                      Raise an Issue on GitHub
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign Out</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </header>
      
      <UsageModal open={usageModalOpen} onOpenChange={setUsageModalOpen} />
    </>
  );
}
