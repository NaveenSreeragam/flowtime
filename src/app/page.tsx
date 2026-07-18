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
  color: string;
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
      { id: '1', title: 'Strategic planning', duration: 45, startHour: 9, startMin: 0, fixed: false, color: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/25' },
      { id: '2', title: 'Product standup', duration: 30, startHour: 9, startMin: 45, fixed: true, color: 'bg-amber-500/15 text-amber-200 border-amber-400/25' },
      { id: '3', title: 'Deep work: launch brief', duration: 90, startHour: 10, startMin: 15, fixed: false, color: 'bg-teal-500/15 text-teal-200 border-teal-400/25' },
      { id: '4', title: 'Reset and review', duration: 45, startHour: 11, startMin: 45, fixed: false, color: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25' }
    ];

    return baseTasks.map(t => {
      let finalDuration = t.duration;
      let startOffset = 0;

      // Simulate shifts
      if (!t.fixed) {
        if (t.id === '1') {
          if (demoActiveTaskState === 'done') {
            // Finished 20m early
            finalDuration = 25;
            startOffset = 0;
          }
        } else if (t.id === '3') {
          // Coding starts early because standup finishes and lunch shifts
          startOffset = demoOffset;
        } else if (t.id === '4') {
          startOffset = demoOffset;
        }
      }

      // Calculate time string
      let totalMinutes = t.startHour * 60 + t.startMin + startOffset;
      // Fixed items do not move
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
        fixed: t.fixed,
        color: t.color
      };
    });
  };

  const handleDemoFinishEarly = () => {
    setDemoActiveTaskState('done');
    setDemoOffset(-20); // shift everything else 20m early
  };

  const handleDemoFinishLate = () => {
    setDemoActiveTaskState('done');
    setDemoOffset(30); // shift everything else 30m late
  };

  const handleDemoReset = () => {
    setDemoActiveTaskState('idle');
    setDemoOffset(0);
  };

  // Auth Handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (!isSupabaseConfigured) {
        // Mock success in local mode
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
      // Mock Google Login
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
    // Directly go to dashboard
    useFlowTimeStore.getState().setUser(null); // No registered user
    router.push('/dashboard');
  };

  return (
    <div className="flex-1 min-h-screen bg-[#0b1218] relative overflow-hidden flex flex-col justify-between font-sans selection:bg-teal-400/30 selection:text-teal-100">
      
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      {/* Main Grid Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-tr from-teal-600 to-cyan-500 rounded-xl shadow-lg shadow-teal-500/20">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white bg-clip-text">FlowTime</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLocalMode}
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer px-4 py-2 rounded-lg hover:bg-white/5"
          >
            Launch Local Mode
          </button>
        </div>
      </header>

      {/* Content Container */}
      <main className="w-full max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center py-12 z-10 flex-1">
        
        {/* Left Info Column */}
        <div className="lg:col-span-7 flex flex-col gap-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-400/25 bg-teal-400/10 w-fit text-xs font-semibold text-teal-200 tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" /> Adaptive workday planning
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-none">
            Make room for the work that <span className="bg-gradient-to-r from-teal-300 via-cyan-200 to-emerald-300 bg-clip-text text-transparent">actually matters.</span>
          </h1>

          <p className="text-lg text-zinc-400 max-w-xl">
            FlowTime automatically shifts and splits your remaining tasks in real-time when life changes. Finish early, finish late, or take a break — your calendar recalculates instantly.
          </p>

          {/* Interactive Widget Box */}
          <div className="mt-4 p-5 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md glow max-w-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-300" /> See your plan adapt
              </span>
              <div className="flex gap-2">
                {demoActiveTaskState === 'idle' ? (
                  <>
                    <button 
                      onClick={handleDemoFinishEarly}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                    >
                      Finish Early (-20m)
                    </button>
                    <button 
                      onClick={handleDemoFinishLate}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                    >
                      Finish Late (+30m)
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleDemoReset}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-all cursor-pointer"
                  >
                    Reset Demo
                  </button>
                )}
              </div>
            </div>

            {/* Simulated Timeline Blocks */}
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
                    className={`flex items-center justify-between p-3 rounded-xl border ${t.color} text-sm font-medium`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1 rounded-md bg-white/5">
                        {t.fixed ? <Lock className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div>{t.title}</div>
                        {t.fixed && <span className="text-[10px] uppercase font-bold text-amber-500/80 tracking-wider">Fixed Time</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400 text-xs">
                      <span>{t.duration} min</span>
                      <span className="font-mono bg-black/30 px-2 py-0.5 rounded text-white border border-white/5">{t.timeStr}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Auth Column */}
        <div className="lg:col-span-5 w-full flex justify-center">
          <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-950/80 border border-white/10 glow flex flex-col gap-6 relative z-10 backdrop-blur-lg">
            
            {/* Auth Tab selectors */}
            {authMode !== 'forgot' && (
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                    authMode === 'login' ? 'border-violet-500 text-white' : 'border-transparent text-zinc-500'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                    authMode === 'register' ? 'border-violet-500 text-white' : 'border-transparent text-zinc-500'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {authMode === 'forgot' && (
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-white">Reset Password</h2>
                <p className="text-xs text-zinc-400">Enter your email and we will send you a recovery link.</p>
              </div>
            )}

            {/* Error Message */}
            {authError && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth} className="flex flex-col gap-4 text-left">
              {authMode === 'register' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>

              {authMode !== 'forgot' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-zinc-400">Password</label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setAuthMode('forgot')}
                        className="text-xs text-violet-400 hover:text-violet-300 font-medium cursor-pointer"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 disabled:opacity-50 transition-all cursor-pointer mt-2"
              >
                {authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : authMode === 'register' ? 'Sign Up' : 'Send Recovery Email'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Social Authentication or Fallback Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="h-px bg-white/5 flex-grow" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Or Connect</span>
              <div className="h-px bg-white/5 flex-grow" />
            </div>

            {/* Social logins */}
            <button
              onClick={handleGoogleLogin}
              className="w-full py-2.5 border border-white/10 rounded-xl flex items-center justify-center gap-2.5 bg-white/[0.02] hover:bg-white/[0.06] text-sm text-white font-medium transition-all cursor-pointer"
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
                className="text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer text-center font-medium"
              >
                Back to Sign In
              </button>
            ) : (
              <button
                onClick={handleLocalMode}
                className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer text-center font-semibold bg-white/5 py-2.5 rounded-xl border border-white/5"
              >
                ⚡ Open App in Local Sandbox Mode
              </button>
            )}

            {!isSupabaseConfigured && (
              <span className="text-[10px] text-amber-500/80 leading-normal text-center bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                ⚠️ Supabase environment variables are missing. All accounts are simulated locally for developer speed.
              </span>
            )}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/5 text-center z-10 text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} FlowTime. Crafted with Next.js, Zustand, Tailwind, and Supabase. All rights reserved.
      </footer>
    </div>
  );
}
