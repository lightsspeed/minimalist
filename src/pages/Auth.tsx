import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import logo from '@/assets/logo.png';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0]?.message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0]?.message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        let message = error.message;
        
        if (error.message.includes('Invalid login credentials')) {
          message = 'Invalid email or password';
        } else if (error.message.includes('User already registered')) {
          message = 'An account with this email already exists. Please sign in.';
        }
        
        toast({
          title: isLogin ? 'Sign in failed' : 'Sign up failed',
          description: message,
          variant: 'destructive',
        });
      } else if (!isLogin) {
        toast({
          title: 'Account created!',
          description: 'You are now signed in.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background transition-theme">
      {/* Theme toggle */}
      <header className="absolute top-4 right-4">
        <ThemeToggle />
      </header>
      
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Logo & Title */}
          <div className="text-center mb-10">
            <img 
              src={logo} 
              alt="Minimalist" 
              className="h-12 w-auto mx-auto mb-6 dark:brightness-0 dark:invert"
            />
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLogin 
                ? 'Sign in to continue'
                : 'Get started for free'
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="Email"
                  className="pl-10 h-11 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive pl-1">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="Password"
                  className="pl-10 h-11 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive pl-1">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? 'Please wait...' 
                : isLogin ? 'Sign in' : 'Create account'
              }
            </Button>
          </form>

          {/* Toggle */}
          <p className="text-center mt-8 text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}