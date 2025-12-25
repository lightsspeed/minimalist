import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, CheckCircle2, ListTodo, FileText, BarChart3, Share2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import logo from '@/assets/logo.png';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

const features = [
  {
    icon: ListTodo,
    title: 'Tasks & Subtasks',
    description: 'Organize with nested subtasks up to 3 levels deep',
  },
  {
    icon: FileText,
    title: 'Personal Notes',
    description: 'Capture ideas with tags and folders',
  },
  {
    icon: Share2,
    title: 'Secure Sharing',
    description: 'Share notes with password protection',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Track your productivity over time',
  },
];

export default function Auth() {
  const { user, loading, signIn, signUp, resetPassword, updatePassword } = useAuth();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

  // Check if we're in password reset mode (redirected from email)
  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      setMode('reset');
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Only redirect if not in reset mode
  if (user && mode !== 'reset') {
    return <Navigate to="/" replace />;
  }

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; confirmPassword?: string } = {};

    if (mode !== 'reset') {
      try {
        emailSchema.parse(email);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.email = e.errors[0]?.message;
        }
      }
    }

    if (mode === 'login' || mode === 'signup' || mode === 'reset') {
      try {
        passwordSchema.parse(password);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.password = e.errors[0]?.message;
        }
      }
    }

    if (mode === 'reset' && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Check your email',
            description: 'We sent you a password reset link.',
          });
          setMode('login');
        }
      } else if (mode === 'reset') {
        const { error } = await updatePassword(password);
        if (error) {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Password updated',
            description: 'Your password has been reset successfully.',
          });
          setMode('login');
        }
      } else {
        const { error } = mode === 'login' 
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
            title: mode === 'login' ? 'Sign in failed' : 'Sign up failed',
            description: message,
            variant: 'destructive',
          });
        } else if (mode === 'signup') {
          toast({
            title: 'Account created!',
            description: 'You are now signed in.',
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome back';
      case 'signup': return 'Create account';
      case 'forgot': return 'Reset password';
      case 'reset': return 'New password';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'Sign in to continue';
      case 'signup': return 'Get started for free';
      case 'forgot': return 'Enter your email to reset';
      case 'reset': return 'Choose a new password';
    }
  };

  const getButtonText = () => {
    if (isSubmitting) return 'Please wait...';
    switch (mode) {
      case 'login': return 'Sign in';
      case 'signup': return 'Create account';
      case 'forgot': return 'Send reset link';
      case 'reset': return 'Update password';
    }
  };

  return (
    <div className="min-h-screen flex bg-background transition-theme">
      {/* Left side - Feature showcase (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 w-full">
          {/* Logo & Branding */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={logo} 
                alt="Minimalist" 
                className="h-10 w-auto dark:brightness-0 dark:invert"
              />
              <span className="text-2xl font-semibold text-foreground">Minimalist</span>
            </div>
            <p className="text-lg text-muted-foreground max-w-md">
              A beautifully simple way to manage your tasks and notes. Stay organized, stay focused.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="flex items-start gap-4 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom quote */}
          <div className="mt-auto pt-12">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Simple. Elegant. Effective.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex flex-col">
        {/* Theme toggle */}
        <header className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </header>
        
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm animate-fade-in">
            {/* Back button for forgot/reset modes */}
            {(mode === 'forgot' || mode === 'reset') && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>
            )}

            {/* Logo (mobile only) & Title */}
            <div className="text-center mb-10">
              <img 
                src={logo} 
                alt="Minimalist" 
                className="h-12 w-auto mx-auto mb-6 dark:brightness-0 dark:invert lg:hidden"
              />
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                {getTitle()}
              </h1>
              <p className="text-sm text-muted-foreground">
                {getSubtitle()}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field (not shown in reset mode) */}
              {mode !== 'reset' && (
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
              )}

              {/* Password field (not shown in forgot mode) */}
              {mode !== 'forgot' && (
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
                      placeholder={mode === 'reset' ? 'New password' : 'Password'}
                      className="pl-10 h-11 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive pl-1">{errors.password}</p>
                  )}
                </div>
              )}

              {/* Confirm password (only in reset mode) */}
              {mode === 'reset' && (
                <div className="space-y-1.5">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      }}
                      placeholder="Confirm new password"
                      className="pl-10 h-11 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                      autoComplete="new-password"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive pl-1">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              {/* Forgot password link (only in login mode) */}
              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrors({});
                    }}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isSubmitting}
              >
                {getButtonText()}
              </Button>
            </form>

            {/* Toggle (only for login/signup) */}
            {(mode === 'login' || mode === 'signup') && (
              <p className="text-center mt-8 text-sm text-muted-foreground">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setErrors({});
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            )}

            {/* Feature highlights for mobile */}
            {(mode === 'login' || mode === 'signup') && (
              <div className="lg:hidden mt-12 pt-8 border-t border-border/50">
                <div className="grid grid-cols-2 gap-4">
                  {features.map((feature) => (
                    <div key={feature.title} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">{feature.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
