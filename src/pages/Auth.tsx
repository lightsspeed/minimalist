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
    title: 'Elegant Notes',
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

  // Force light mode on auth page
  useEffect(() => {
    const root = document.documentElement;
    const wasInDarkMode = root.classList.contains('dark');
    
    // Remove dark mode for auth page
    root.classList.remove('dark');
    
    // Restore previous theme when leaving auth page
    return () => {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'dark' || wasInDarkMode) {
        root.classList.add('dark');
      }
    };
  }, []);

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
          toast({ title: 'Account created!', description: 'Please sign in with your credentials.' });
          setMode('login');
          setPassword('');
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
    <div className="min-h-screen flex bg-white dark:bg-black transition-theme overflow-hidden">
      {/* Left side - Feature showcase */}
      <div className="hidden lg:flex lg:w-[55%] relative">
        {/* Full background - white in light, black in dark */}
        <div className="absolute inset-0 bg-white dark:bg-black" />
        
        {/* Diagonal stripes pattern with shimmer - subtle */}
        <div className="dark:hidden absolute inset-0 opacity-[0.035] animate-shimmer" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 20px,
            rgba(0,0,0,0.4) 20px,
            rgba(0,0,0,0.4) 22px
          ), linear-gradient(
            90deg,
            transparent 0%,
            rgba(0,0,0,0.03) 50%,
            transparent 100%
          )`,
          backgroundSize: '100% 100%, 200% 200%'
        }} />
        <div className="hidden dark:block absolute inset-0 opacity-[0.045] animate-shimmer" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 20px,
            rgba(255,255,255,0.4) 20px,
            rgba(255,255,255,0.4) 22px
          ), linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.05) 50%,
            transparent 100%
          )`,
          backgroundSize: '100% 100%, 200% 200%'
        }} />
        
        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/[0.02] dark:from-white/[0.02] via-transparent to-black/[0.02] dark:to-white/[0.02]" />
        
        {/* Animated floating shapes */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 right-20 w-48 h-48 bg-primary/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-black/5 dark:bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full text-black dark:text-white">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-black/10 dark:bg-white/10 backdrop-blur-sm rounded-xl border border-black/10 dark:border-white/10">
                <img src={logo} alt="Minimalist" className="h-8 w-auto dark:brightness-0 dark:invert" />
              </div>
              <span className="text-2xl font-bold">Minimalist</span>
            </div>
            <p className="text-black/50 dark:text-white/50 text-sm">Task & Notes</p>
          </div>

          {/* Main content */}
          <div className="py-8">
            <h2 className="text-4xl xl:text-5xl font-bold mb-4 leading-tight">
              Capture ideas. Crush tasks.<br />
              <span className="text-black/80 dark:text-white/80">Stay minimal.</span>
            </h2>
            <p className="text-lg text-black/50 dark:text-white/50 mb-10 max-w-md">
              The minimalist productivity app that helps you focus on what matters most.
            </p>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group p-4 rounded-2xl bg-black/5 dark:bg-white/5 backdrop-blur-sm border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs text-black/40 dark:text-white/40 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer highlights */}
          <div className="flex items-center gap-6">
            {highlights.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-black/50 dark:text-white/50">
                <item.icon className="h-4 w-4" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex flex-col relative bg-white dark:bg-black">
        {/* Diagonal stripes pattern for form side with shimmer - subtle */}
        <div className="dark:hidden absolute inset-0 opacity-[0.025] animate-shimmer" style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 30px,
            rgba(0,0,0,0.3) 30px,
            rgba(0,0,0,0.3) 32px
          ), linear-gradient(
            -90deg,
            transparent 0%,
            rgba(0,0,0,0.03) 50%,
            transparent 100%
          )`,
          backgroundSize: '100% 100%, 200% 200%'
        }} />
        <div className="hidden dark:block absolute inset-0 opacity-[0.035] animate-shimmer" style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 30px,
            rgba(255,255,255,0.3) 30px,
            rgba(255,255,255,0.3) 32px
          ), linear-gradient(
            -90deg,
            transparent 0%,
            rgba(255,255,255,0.05) 50%,
            transparent 100%
          )`,
          backgroundSize: '100% 100%, 200% 200%'
        }} />
        
        {/* Subtle glow effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

        {/* Mobile header with logo - visible only on mobile */}
        <header className="lg:hidden relative z-20 flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-black/10 dark:bg-white/10 backdrop-blur-sm rounded-lg border border-black/10 dark:border-white/10">
              <img src={logo} alt="Minimalist" className="h-6 w-auto dark:brightness-0 dark:invert" />
            </div>
            <div>
              <span className="text-lg font-bold text-black dark:text-white">Minimalist</span>
              <p className="text-xs text-black/50 dark:text-white/50 -mt-0.5">Task & Notes</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Desktop theme toggle - hidden on mobile */}
        <div className="hidden lg:block absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        
        <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md animate-fade-in">
            {/* Back button for forgot/reset modes */}
            {(mode === 'forgot' || mode === 'reset') && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="flex items-center gap-1 text-sm text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>
            )}

            {/* Logo & Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-3 bg-black/10 dark:bg-white/10 rounded-2xl mb-6 border border-black/10 dark:border-white/10">
                <img src={logo} alt="Minimalist" className="h-10 w-auto dark:brightness-0 dark:invert" />
              </div>
              <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
                {getTitle()}
              </h1>
              <p className="text-black/60 dark:text-white/60">
                {getSubtitle()}
              </p>
            </div>

            {/* Form card */}
            <div className="bg-black/5 dark:bg-white/5 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl">
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode !== 'reset' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-black dark:text-white">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/50 dark:text-white/50" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }}
                        placeholder="you@example.com"
                        className="pl-10 h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && <p className="text-xs text-destructive pl-1">{errors.email}</p>}
                  </div>
                )}

                {mode !== 'forgot' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-black dark:text-white">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/50 dark:text-white/50" />
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }}
                        placeholder={mode === 'reset' ? 'New password' : '••••••••'}
                        className="pl-10 h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      />
                    </div>
                    {errors.password && <p className="text-xs text-destructive pl-1">{errors.password}</p>}
                  </div>
                )}

                {mode === 'reset' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-black dark:text-white">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/50 dark:text-white/50" />
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setErrors((prev) => ({ ...prev, confirmPassword: undefined })); }}
                        placeholder="••••••••"
                        className="pl-10 h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
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
                      className="text-sm text-black/50 dark:text-white/50 hover:text-primary transition-colors"
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
                <div className="mt-6 pt-6 border-t border-black/10 dark:border-white/10">
                  <p className="text-center text-sm text-black/60 dark:text-white/60">
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
                    <div key={feature.title} className="flex items-center gap-1.5 px-3 py-1.5 bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-full">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-black dark:text-white">{feature.title}</span>
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
