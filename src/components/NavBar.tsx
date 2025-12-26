import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ListTodo, FileText, BarChart3, LogOut, HelpCircle, Archive, Bug, Mail, Github, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { UsageModal } from '@/components/UsageModal';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
  };

  const navItems = [
    { to: '/', icon: ListTodo, label: 'Tasks' },
    { to: '/notes', icon: FileText, label: 'Notes' },
    { to: '/archive', icon: Archive, label: 'Archive' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
            <Link to="/" className="flex items-center gap-2 min-w-0">
              <img 
                src={logo} 
                alt="Minimalist Logo" 
                className="h-8 w-8 flex-shrink-0 dark:brightness-0 dark:invert"
              />
              <h1 className="font-semibold text-lg truncate">Minimalist</h1>
            </Link>
          </div>

          {/* Mobile Navigation */}
          {isMobile ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-background">
                  {navItems.map((item) => (
                    <DropdownMenuItem key={item.to} asChild>
                      <Link 
                        to={item.to} 
                        className={`flex items-center gap-2 w-full ${location.pathname === item.to ? 'bg-secondary' : ''}`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setUsageModalOpen(true)}>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Usage & Shortcuts
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Bug className="h-4 w-4 mr-2" />
                      Report a Bug
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="bg-background">
                      <DropdownMenuItem asChild>
                        <a 
                          href="mailto:akhileshchoure1@gmail.com" 
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Mail className="h-4 w-4" />
                          Email
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
                          GitHub Issue
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            /* Desktop Navigation */
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-1">
                {navItems.map((item) => (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>
                      <Link to={item.to}>
                        <Button 
                          variant={location.pathname === item.to ? 'secondary' : 'ghost'} 
                          size="icon"
                        >
                          <item.icon className="h-5 w-5" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>{item.label}</TooltipContent>
                  </Tooltip>
                ))}
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
                  <DropdownMenuContent align="end" className="bg-background">
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
          )}
        </div>
      </header>
      
      <UsageModal open={usageModalOpen} onOpenChange={setUsageModalOpen} />
    </>
  );
}
