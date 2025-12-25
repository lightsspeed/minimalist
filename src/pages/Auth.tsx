import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, ListTodo, FileText, BarChart3, Share2, CheckCircle2, Zap, Shield, Clock } from 'lucide-react';
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
    title: 'Smart Task Management',
    description: 'Nested subtasks up to 3 levels with drag & drop',
  },
  {
    icon: FileText,
    title: 'Beautiful Notes',
    description: 'Organize with tags, folders & secure sharing',
  },
  {
    icon: BarChart3,
    title: 'Insightful Analytics',
    description: 'Track productivity with visual charts',
  },
  {
    icon: Share2,
    title: 'Password Protected Sharing',
    description: 'Share notes securely with expiration',
  },
];

const highlights = [
  { icon: Zap, text: 'Lightning fast' },
  { icon: Shield, text: 'Secure by design' },
  { icon: Clock, text: 'Real-time sync' },
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
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Check your email', description: 'We sent you a password reset link.' });
          setMode('login');
        }
      } else if (mode === 'reset') {
        const { error } = await updatePassword(password);
        if (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Password updated', description: 'Your password has been reset successfully.' });
          setMode('login');
        }
      } else {
        const { error } = mode === 'login' ? await signIn(email, password) : await signUp(email, password);
        if (error) {
          let message = error.message;
          if (error.message.includes('Invalid login credentials')) message = 'Invalid email or password';
          else if (error.message.includes('User already registered')) message = 'An account with this email already exists.';
          toast({ title: mode === 'login' ? 'Sign in failed' : 'Sign up failed', description: message, variant: 'destructive' });
        } else if (mode === 'signup') {
          toast({ title: 'Account created!', description: 'You are now signed in.' });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome back';
      case 'signup': return 'Get started free';
      case 'forgot': return 'Reset password';
      case 'reset': return 'New password';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'Sign in to your account';
      case 'signup': return 'Create your account in seconds';
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
    <div className="min-h-screen flex bg-background transition-theme overflow-hidden">
      {/* Left side - Feature showcase */}
      <div className="hidden lg:flex lg:w-[55%] relative">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-primary/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
        
        {/* Animated floating shapes */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-32 right-20 w-48 h-48 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white/5 rounded-full blur-lg animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full text-white">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <img src={logo} alt="Minimalist" className="h-8 w-auto brightness-0 invert" />
              </div>
              <span className="text-2xl font-bold">Minimalist</span>
            </div>
            <p className="text-white/70 text-sm">Task & Notes</p>
          </div>

          {/* Main content */}
          <div className="py-8">
            <h2 className="text-4xl xl:text-5xl font-bold mb-4 leading-tight">
              Organize your life,<br />
              <span className="text-white/90">beautifully.</span>
            </h2>
            <p className="text-lg text-white/70 mb-10 max-w-md">
              The minimalist productivity app that helps you focus on what matters most.
            </p>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 hover:border-white/20 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs text-white/60 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer highlights */}
          <div className="flex items-center gap-6">
            {highlights.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-white/70">
                <item.icon className="h-4 w-4" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex flex-col relative">
        {/* Subtle background pattern for form side */}
        <div className="absolute inset-0 bg-gradient-to-br from-muted/30 via-background to-muted/20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        {/* Theme toggle */}
        <header className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </header>
        
        <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md animate-fade-in">
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

            {/* Logo & Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-6">
                <img src={logo} alt="Minimalist" className="h-10 w-auto dark:brightness-0 dark:invert" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {getTitle()}
              </h1>
              <p className="text-muted-foreground">
                {getSubtitle()}
              </p>
            </div>

            {/* Form card */}
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-xl shadow-primary/5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode !== 'reset' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }}
                        placeholder="you@example.com"
                        className="pl-10 h-12 bg-background/50 border-border/50 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && <p className="text-xs text-destructive pl-1">{errors.email}</p>}
                  </div>
                )}

                {mode !== 'forgot' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }}
                        placeholder={mode === 'reset' ? 'New password' : '••••••••'}
                        className="pl-10 h-12 bg-background/50 border-border/50 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      />
                    </div>
                    {errors.password && <p className="text-xs text-destructive pl-1">{errors.password}</p>}
                  </div>
                )}

                {mode === 'reset' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setErrors((prev) => ({ ...prev, confirmPassword: undefined })); }}
                        placeholder="••••••••"
                        className="pl-10 h-12 bg-background/50 border-border/50 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                        autoComplete="new-password"
                      />
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-destructive pl-1">{errors.confirmPassword}</p>}
                  </div>
                )}

                {mode === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setErrors({}); }}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full h-12 text-base font-medium" disabled={isSubmitting}>
                  {getButtonText()}
                </Button>
              </form>

              {(mode === 'login' || mode === 'signup') && (
                <div className="mt-6 pt-6 border-t border-border/50">
                  <p className="text-center text-sm text-muted-foreground">
                    {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                    <button
                      type="button"
                      onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErrors({}); }}
                      className="text-primary font-semibold hover:underline"
                    >
                      {mode === 'login' ? 'Sign up' : 'Sign in'}
                    </button>
                  </p>
                </div>
              )}
            </div>

            {/* Mobile feature highlights */}
            {(mode === 'login' || mode === 'signup') && (
              <div className="lg:hidden mt-8">
                <div className="flex flex-wrap justify-center gap-3">
                  {features.map((feature) => (
                    <div key={feature.title} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-foreground">{feature.title}</span>
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
