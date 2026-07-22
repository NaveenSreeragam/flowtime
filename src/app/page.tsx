'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useFlowTimeStore } from '@/store/use-flowtime-store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { 
  Sparkles, 
  ArrowRight, 
  Play, 
  Pause, 
  Check, 
  Clock, 
  Lock, 
  Mail, 
  User, 
  Zap, 
  Calendar,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface MockDemoTask {
  id: string;
  title: string;
  duration: number;
  timeStr: string;
  fixed: boolean;
}

export default function LandingPage() {
  const router = useRouter();
  const user = useFlowTimeStore(state => state.user);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Demo Simulation State
  const [demoOffset, setDemoOffset] = useState(0); // minutes shift
  const [demoActiveTaskState, setDemoActiveTaskState] = useState<'idle' | 'running' | 'done'>('idle');

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Demo task layout calculation
  const getDemoTasks = (): MockDemoTask[] => {
    const baseTasks = [
      { id: '1', title: 'Strategic planning', duration: 45, startHour: 9, startMin: 0, fixed: false },
      { id: '2', title: 'Product standup', duration: 30, startHour: 9, startMin: 45, fixed: true },
      { id: '3', title: 'Deep work: launch brief', duration: 90, startHour: 10, startMin: 15, fixed: false },
      { id: '4', title: 'Reset and review', duration: 45, startHour: 11, startMin: 45, fixed: false }
    ];

    return baseTasks.map(t => {
      let finalDuration = t.duration;
      let startOffset = 0;

      // Simulate shifts
      if (!t.fixed) {
        if (t.id === '1') {
          if (demoActiveTaskState === 'done') {
            finalDuration = 25;
            startOffset = 0;
          }
        } else if (t.id === '3') {
          startOffset = demoOffset;
        } else if (t.id === '4') {
          startOffset = demoOffset;
        }
      }

      let totalMinutes = t.startHour * 60 + t.startMin + startOffset;
      if (t.fixed) {
        totalMinutes = t.startHour * 60 + t.startMin;
      }
      
      const hours = Math.floor(totalMinutes / 60) % 24;
      const mins = Math.floor(totalMinutes % 60);
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

      return {
        id: t.id,
        title: t.title,
        duration: finalDuration,
        timeStr,
        fixed: t.fixed
      };
    });
  };

  const handleDemoFinishEarly = () => {
    setDemoActiveTaskState('done');
    setDemoOffset(-20);
  };

  const handleDemoFinishLate = () => {
    setDemoActiveTaskState('done');
    setDemoOffset(30);
  };

  const handleDemoReset = () => {
    setDemoActiveTaskState('idle');
    setDemoOffset(0);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (!isSupabaseConfigured) {
        const mockUser = { id: 'mock-user-id', email: email || 'local@flowtime.app', user_metadata: { full_name: name || 'Local Explorer' } };
        useFlowTimeStore.getState().setUser(mockUser);
        router.push('/dashboard');
        return;
      }

      if (authMode === 'login') {
        const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) throw error;
        useFlowTimeStore.getState().setUser(data.user);
        router.push('/dashboard');
      } else if (authMode === 'register') {
        const { data, error } = await supabase!.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });
        if (error) throw error;
        if (data.user) {
          useFlowTimeStore.getState().setUser(data.user);
          router.push('/dashboard');
        }
      } else {
        const { error } = await supabase!.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        alert('Check your email for the password reset link!');
      }
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during authentication.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) {
      const mockUser = { id: 'mock-google-id', email: 'google.user@flowtime.app', user_metadata: { full_name: 'Google Traveler', avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150' } };
      useFlowTimeStore.getState().setUser(mockUser);
      router.push('/dashboard');
      return;
    }

    try {
      const { error } = await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` }
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || 'Google authentication failed.');
    }
  };

  const handleLocalMode = () => {
    useFlowTimeStore.getState().setUser(null); 
    router.push('/dashboard');
  };

  return (
    <div className="flex-1 min-h-screen bg-background relative overflow-hidden flex flex-col justify-between font-sans selection:bg-foreground/10 selection:text-foreground">
      
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 border-b border-border bg-card/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-foreground rounded-xl">
            <Clock className="w-6 h-6 text-background" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground bg-clip-text">FlowTime</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLocalMode}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-4 py-2 rounded-lg hover:bg-secondary"
          >
            Launch Local Mode
          </button>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center py-12 z-10 flex-1">
        
        <div className="lg:col-span-7 flex flex-col gap-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary w-fit text-xs font-semibold text-foreground tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" /> Adaptive workday planning
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-none">
            Make room for the work that <span className="underline decoration-1 decoration-foreground/30">actually matters.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl">
            FlowTime automatically shifts and splits your remaining tasks in real-time when life changes. Finish early, finish late, or take a break — your calendar recalculates instantly.
          </p>

          <div className="mt-4 p-5 rounded-2xl bg-card border border-border glow max-w-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-foreground" /> See your plan adapt
              </span>
              <div className="flex gap-2">
                {demoActiveTaskState === 'idle' ? (
                  <>
                    <button 
                      onClick={handleDemoFinishEarly}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border bg-secondary hover:bg-muted text-foreground transition-all cursor-pointer"
                    >
                      Finish Early (-20m)
                    </button>
                    <button 
                      onClick={handleDemoFinishLate}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border bg-secondary hover:bg-muted text-foreground transition-all cursor-pointer"
                    >
                      Finish Late (+30m)
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleDemoReset}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-foreground hover:bg-muted transition-all cursor-pointer"
                  >
                    Reset Demo
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <AnimatePresence mode="popLayout">
                {getDemoTasks().map((t) => (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/40 text-foreground text-sm font-medium"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1 rounded-md bg-secondary border border-border">
                        {t.fixed ? <Lock className="w-3.5 h-3.5 text-foreground" /> : <Clock className="w-3.5 h-3.5 text-foreground" />}
                      </div>
                      <div>
                        <div className="text-foreground">{t.title}</div>
                        {t.fixed && <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Fixed Time</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground text-xs">
                      <span>{t.duration} min</span>
                      <span className="font-mono bg-card px-2 py-0.5 rounded text-foreground border border-border">{t.timeStr}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 w-full flex justify-center">
          <div className="w-full max-w-md p-8 rounded-3xl bg-card border border-border shadow-md flex flex-col gap-6 relative z-10">
            
            {authMode !== 'forgot' && (
              <div className="flex border-b border-border">
                <button
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                    authMode === 'login' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                    authMode === 'register' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {authMode === 'forgot' && (
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-foreground">Reset Password</h2>
                <p className="text-xs text-muted-foreground">Enter your email and we will send you a recovery link.</p>
              </div>
            )}

            {authError && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="flex flex-col gap-4 text-left">
              {authMode === 'register' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                  />
                </div>
              </div>

              {authMode !== 'forgot' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-muted-foreground">Password</label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setAuthMode('forgot')}
                        className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-foreground text-background text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer mt-2 hover:opacity-90"
              >
                {authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : authMode === 'register' ? 'Sign Up' : 'Send Recovery Email'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center gap-3 my-1">
              <div className="h-px bg-border flex-grow" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Or Connect</span>
              <div className="h-px bg-border flex-grow" />
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full py-2.5 border border-border rounded-xl flex items-center justify-center gap-2.5 bg-secondary hover:bg-muted text-sm text-foreground font-medium transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            {authMode === 'forgot' ? (
              <button
                onClick={() => setAuthMode('login')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-center font-medium"
              >
                Back to Sign In
              </button>
            ) : (
              <button
                onClick={handleLocalMode}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-center font-semibold bg-secondary py-2.5 rounded-xl border border-border"
              >
                ⚡ Open App in Local Sandbox Mode
              </button>
            )}

            {!isSupabaseConfigured && (
              <span className="text-[10px] text-foreground leading-normal text-center bg-secondary p-2 rounded-lg border border-border">
                ⚠️ Supabase environment variables are missing. All accounts are simulated locally for developer speed.
              </span>
            )}
          </div>
        </div>

      </main>

      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-border text-center z-10 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} FlowTime. Crafted with Next.js, Zustand, Tailwind, and Supabase. All rights reserved.
      </footer>
    </div>
  );
}
