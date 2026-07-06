'use client';

import React, { useState } from 'react';
import { useFlowTimeStore } from '@/store/use-flowtime-store';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Settings, Moon, Sun, Monitor, Bell, BellOff, Clock, LogOut,
  Save, Timer, Keyboard, ChevronRight, AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const settings = useFlowTimeStore(s => s.settings);
  const updateSettings = useFlowTimeStore(s => s.updateSettings);
  const user = useFlowTimeStore(s => s.user);
  const setUser = useFlowTimeStore(s => s.setUser);
  const router = useRouter();

  const [saved, setSaved] = useState(false);

  const handleSave = async (updates: any) => {
    await updateSettings(updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">{title}</h2>
      {children}
    </div>
  );

  const Row = ({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/[0.03]">
      <div className="flex flex-col text-left flex-1">
        <span className="text-sm font-semibold text-white">{label}</span>
        {description && <span className="text-xs text-zinc-500 mt-0.5">{description}</span>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          Settings <Settings className="w-5 h-5 text-violet-400" />
        </h1>
        <p className="text-zinc-400 text-xs mt-1">Personalize your FlowTime experience</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
          <Save className="w-3.5 h-3.5" /> Settings saved successfully!
        </div>
      )}

      {/* Theme */}
      <Section title="Appearance">
        <Row label="Color Theme" description="Choose your preferred color scheme">
          <div className="flex bg-zinc-900 border border-white/5 rounded-xl p-1 gap-1">
            {([['dark', Moon], ['light', Sun], ['system', Monitor]] as const).map(([t, Icon]) => (
              <button
                key={t}
                onClick={() => handleSave({ theme: t })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                  settings.theme === t ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* Work Hours */}
      <Section title="Work Hours">
        <Row label="Work Start Time" description="Your day's starting anchor time">
          <input
            type="time"
            value={settings.workStartTime}
            onChange={(e) => handleSave({ workStartTime: e.target.value })}
            className="bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-mono cursor-pointer"
          />
        </Row>
        <Row label="Work End Time" description="Trigger conflict warnings beyond this time">
          <input
            type="time"
            value={settings.workEndTime}
            onChange={(e) => handleSave({ workEndTime: e.target.value })}
            className="bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-mono cursor-pointer"
          />
        </Row>
        <Row label="Default Task Duration" description="Pre-filled duration when adding new tasks">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={5}
              max={240}
              value={settings.defaultTaskDuration}
              onChange={(e) => handleSave({ defaultTaskDuration: Number(e.target.value) })}
              className="w-20 bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-violet-500 font-mono"
            />
            <span className="text-xs text-zinc-500">min</span>
          </div>
        </Row>
      </Section>

      {/* Pomodoro */}
      <Section title="Pomodoro Timer">
        <Row label="Focus Duration" description="Length of a single focus block">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={5} max={120}
              value={settings.pomodoroFocusDuration}
              onChange={(e) => handleSave({ pomodoroFocusDuration: Number(e.target.value) })}
              className="w-20 bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-violet-500 font-mono"
            />
            <span className="text-xs text-zinc-500">min</span>
          </div>
        </Row>
        <Row label="Short Break" description="Rest after each focus block">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1} max={30}
              value={settings.pomodoroShortBreak}
              onChange={(e) => handleSave({ pomodoroShortBreak: Number(e.target.value) })}
              className="w-20 bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-violet-500 font-mono"
            />
            <span className="text-xs text-zinc-500">min</span>
          </div>
        </Row>
        <Row label="Long Break" description="Extended rest after multiple cycles">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={5} max={60}
              value={settings.pomodoroLongBreak}
              onChange={(e) => handleSave({ pomodoroLongBreak: Number(e.target.value) })}
              className="w-20 bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-violet-500 font-mono"
            />
            <span className="text-xs text-zinc-500">min</span>
          </div>
        </Row>
        <Row label="Cycles Until Long Break" description="How many focus blocks before a long rest">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={2} max={8}
              value={settings.pomodoroLongBreakInterval}
              onChange={(e) => handleSave({ pomodoroLongBreakInterval: Number(e.target.value) })}
              className="w-20 bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-violet-500 font-mono"
            />
            <span className="text-xs text-zinc-500">cycles</span>
          </div>
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row label="Browser Notifications" description="Alerts for task completions, breaks, and conflicts">
          <button
            onClick={() => handleSave({ notificationsEnabled: !settings.notificationsEnabled })}
            className={`relative w-11 h-6 rounded-full border transition-all cursor-pointer ${
              settings.notificationsEnabled
                ? 'bg-violet-600 border-violet-500'
                : 'bg-zinc-800 border-zinc-700'
            }`}
          >
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              settings.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </Row>
      </Section>

      {/* Keyboard Shortcuts Reference */}
      <Section title="Keyboard Shortcuts">
        <div className="grid grid-cols-2 gap-2">
          {[
            ['Space', 'Start / Pause active task'],
            ['N', 'Complete & start next task'],
            ['D', 'Go to Dashboard'],
            ['T', 'Go to Schedule'],
            ['Ctrl + K', 'Open Command Palette'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-white/5">
              <span className="text-xs text-zinc-400">{desc}</span>
              <kbd className="font-mono text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-zinc-300 whitespace-nowrap">{key}</kbd>
            </div>
          ))}
        </div>
      </Section>

      {/* Account */}
      <Section title="Account">
        {user ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-950/60 border border-white/5">
              <div className="w-10 h-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 overflow-hidden">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{(user.user_metadata?.full_name || user.email || 'G')[0].toUpperCase()}</span>
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-white">{user.user_metadata?.full_name || 'User'}</span>
                <span className="text-xs text-zinc-500">{user.email}</span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-rose-400 text-sm font-semibold cursor-pointer transition-all"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-zinc-400 leading-normal">
              You are in <span className="text-white font-semibold">Local Sandbox Mode</span>. Data is saved to browser storage only.
              Sign in from the home page to enable cloud sync via Supabase.
            </p>
          </div>
        )}
      </Section>
    </div>
  );
}
