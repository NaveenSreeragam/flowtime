'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useFlowTimeStore } from '@/store/use-flowtime-store';
import { CommandPalette } from '@/components/command-palette';
import { FirstLaunchTour } from '@/components/first-launch-tour';
import { 
  Clock, 
  Calendar, 
  BarChart3, 
  LayoutTemplate, 
  Settings as SettingsIcon,
  Compass,
  LogOut,
  User as UserIcon,
  Search,
  Sparkles,
  Play,
  Pause,
  AlertCircle
} from 'lucide-react';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  
  const user = useFlowTimeStore((state) => state.user);
  const setUser = useFlowTimeStore((state) => state.setUser);
  const activeTaskId = useFlowTimeStore((state) => state.activeTaskId);
  const timerStatus = useFlowTimeStore((state) => state.timerStatus);
  const tasks = useFlowTimeStore((state) => state.tasks);
  const selectedDate = useFlowTimeStore((state) => state.selectedDate);
  const startTask = useFlowTimeStore((state) => state.startTask);
  const pauseTask = useFlowTimeStore((state) => state.pauseTask);
  const finishTask = useFlowTimeStore((state) => state.finishTask);
  const hasConflict = useFlowTimeStore((state) => state.hasConflict);
  const estimatedFinishTime = useFlowTimeStore((state) => state.estimatedFinishTime);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing shortcuts inside inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Space: Start/Pause Active Task
      if (e.key === ' ') {
        e.preventDefault();
        if (activeTaskId) {
          if (timerStatus === 'running') {
            pauseTask(activeTaskId);
          } else {
            startTask(activeTaskId);
          }
        } else {
          // Start first incomplete task
          const incomplete = tasks.filter(t => t.date === selectedDate && t.status !== 'completed' && t.status !== 'skipped');
          if (incomplete.length > 0) {
            startTask(incomplete[0].id);
          }
        }
      }

      // N: Next Task (Complete current and start next)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (activeTaskId) {
          finishTask(activeTaskId).then(() => {
            const incomplete = tasks.filter(t => t.date === selectedDate && t.status !== 'completed' && t.status !== 'skipped');
            if (incomplete.length > 0) {
              startTask(incomplete[0].id);
            }
          });
        }
      }

      // Quick Nav shortcuts: D -> Dashboard, S/T -> Today's Schedule, A -> Analytics, M -> Templates, P -> Settings
      if (e.key === 'd' || e.key === 'D') {
        router.push('/dashboard');
      }
      if (e.key === 't' || e.key === 'T' || e.key === 's' || e.key === 'S') {
        router.push('/schedule');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTaskId, timerStatus, tasks, selectedDate, startTask, pauseTask, finishTask, router]);

  const handleSignOut = () => {
    setUser(null);
    router.push('/');
  };

  const navItems = [
    { label: 'My Day', href: '/dashboard', icon: Clock },
    { label: 'Plan', href: '/schedule', icon: Calendar },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Templates', href: '/templates', icon: LayoutTemplate },
    { label: 'Guidance', href: '/guidance', icon: Compass },
    { label: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4 justify-between select-none">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="p-1.5 bg-foreground rounded-lg shadow-sm">
              <Clock className="w-5 h-5 text-background" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">FlowTime</span>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-foreground text-background shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className="w-4 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card footer */}
        <div className="flex flex-col gap-3.5 border-t border-border pt-4">
          
          {hasConflict && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-secondary border border-border text-[10px] leading-normal text-foreground">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div>
                <span>Schedule Overflow! ETA goes past workday end time.</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground text-sm overflow-hidden">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                  {user?.user_metadata?.full_name || 'Guest User'}
                </span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {user?.email || 'Local Sandbox'}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        
        {/* Workspace Sub-header */}
        <header className="h-14 border-b border-border px-6 flex items-center justify-between select-none bg-card">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <span className="uppercase tracking-wider font-extrabold text-foreground">Flowtime</span>
            <span className="text-muted-foreground/45">/</span>
            <span className="text-foreground capitalize">{pathname?.split('/')[1] || 'Dashboard'}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Search command shortcut trigger button */}
            <button 
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-foreground/20 rounded-lg px-2.5 py-1.5 bg-secondary/30 transition-all cursor-pointer select-none"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Actions...</span>
              <kbd className="bg-secondary border border-border rounded px-1 text-[9px] font-mono">Ctrl K</kbd>
            </button>
            
            {/* Mode Tag */}
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
              user ? 'bg-foreground text-background border-foreground' : 'bg-transparent border-foreground/30 text-foreground'
            }`}>
              {user ? 'Cloud Sync' : 'Sandbox'}
            </div>
          </div>
        </header>

        {/* Dynamic content render view */}
        <main className="flex-grow overflow-y-auto relative">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden h-16 border-t border-border bg-card flex items-center justify-around z-20 px-2 select-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  isActive ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Global Command Palette */}
      <CommandPalette />
      <FirstLaunchTour />
    </div>
  );
}
