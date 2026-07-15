'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useFlowTimeStore } from '@/store/use-flowtime-store';
import {
  ArrowRight,
  CalendarPlus,
  Check,
  Circle,
  Clock3,
  Lightbulb,
  ListChecks,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const storageKey = 'flowtime-guidance-progress';

const guidanceSteps = [
  {
    id: 'add-task',
    title: 'Plan your first task',
    description: 'Give it a realistic time estimate so FlowTime can place it on your day.',
    href: '/schedule',
    action: 'Open schedule',
    icon: CalendarPlus,
  },
  {
    id: 'fixed-event',
    title: 'Add a fixed-time event',
    description: 'Meetings and appointments stay anchored while flexible tasks move around them.',
    href: '/schedule',
    action: 'Add an anchor',
    icon: Lock,
  },
  {
    id: 'focus-timer',
    title: 'Start a focus session',
    description: 'Start a task when you begin; the timeline recalculates as your actual time changes.',
    href: '/dashboard',
    action: 'Go to dashboard',
    icon: Play,
  },
  {
    id: 'review-day',
    title: 'Review the dynamic timeline',
    description: 'Use the schedule view to spot conflicts and see when your day is expected to finish.',
    href: '/schedule',
    action: 'Review timeline',
    icon: Clock3,
  },
];

export default function GuidancePage() {
  const tasks = useFlowTimeStore((state) => state.tasks);
  const selectedDate = useFlowTimeStore((state) => state.selectedDate);
  const activeTaskId = useFlowTimeStore((state) => state.activeTaskId);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedProgress = window.localStorage.getItem(storageKey);
      if (savedProgress) {
        try {
          setCompletedSteps(JSON.parse(savedProgress));
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }
      setHasLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const todayTasks = useMemo(
    () => tasks.filter((task) => task.date === selectedDate),
    [tasks, selectedDate],
  );

  const suggestedComplete = useMemo(() => {
    const completed = new Set<string>();
    if (todayTasks.length > 0) completed.add('add-task');
    if (todayTasks.some((task) => task.fixedTime)) completed.add('fixed-event');
    if (activeTaskId || todayTasks.some((task) => task.actualDuration > 0)) completed.add('focus-timer');
    if (todayTasks.length > 0) completed.add('review-day');
    return completed;
  }, [activeTaskId, todayTasks]);

  const isComplete = (id: string) => completedSteps.includes(id) || suggestedComplete.has(id);
  const completedCount = guidanceSteps.filter((step) => isComplete(step.id)).length;
  const progress = Math.round((completedCount / guidanceSteps.length) * 100);

  const toggleStep = (id: string) => {
    const updated = completedSteps.includes(id)
      ? completedSteps.filter((step) => step !== id)
      : [...completedSteps, id];
    setCompletedSteps(updated);
    window.localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const resetProgress = () => {
    setCompletedSteps([]);
    window.localStorage.removeItem(storageKey);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/20 via-zinc-950 to-indigo-600/10 p-7 md:p-9">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
            <Sparkles className="h-4 w-4" /> FlowTime guidance
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Make your schedule work with you.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              FlowTime protects fixed commitments and automatically reshapes flexible work as your day changes. Follow these four steps to set up a reliable daily flow.
            </p>
          </div>
          <div className="max-w-xl">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-zinc-300">
              <span>{hasLoaded ? `${completedCount} of ${guidanceSteps.length} steps complete` : 'Loading progress…'}</span>
              <span className="text-violet-300">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
            <ListChecks className="h-4 w-4" /> Your setup checklist
          </div>
          {completedSteps.length > 0 && (
            <button onClick={resetProgress} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer">
              <RotateCcw className="h-3.5 w-3.5" /> Reset manual progress
            </button>
          )}
        </div>

        {guidanceSteps.map((step, index) => {
          const Icon = step.icon;
          const complete = isComplete(step.id);
          return (
            <article key={step.id} className={`flex flex-col gap-4 rounded-2xl border p-5 md:flex-row md:items-center ${complete ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-white/5 bg-zinc-950/40'}`}>
              <button
                onClick={() => toggleStep(step.id)}
                aria-label={`Mark ${step.title} as ${complete ? 'incomplete' : 'complete'}`}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer ${complete ? 'border-emerald-500 bg-emerald-500 text-zinc-950' : 'border-zinc-700 text-zinc-500 hover:border-violet-400 hover:text-violet-300'}`}
              >
                {complete ? <Check className="h-5 w-5" strokeWidth={3} /> : <span className="text-xs font-bold">{index + 1}</span>}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${complete ? 'text-emerald-400' : 'text-violet-400'}`} />
                  <h2 className={`text-sm font-bold ${complete ? 'text-emerald-100' : 'text-white'}`}>{step.title}</h2>
                </div>
                <p className="mt-1 text-xs leading-5 text-zinc-400">{step.description}</p>
              </div>
              <Link href={step.href} className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:bg-violet-600 hover:text-white">
                {step.action} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-200"><Lightbulb className="h-4 w-4" /> A useful rule of thumb</div>
          <p className="mt-2 text-xs leading-5 text-zinc-400">Only mark truly immovable commitments as fixed. Keep project work flexible so FlowTime can adapt it when reality changes.</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-zinc-950/40 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white"><Circle className="h-4 w-4 text-violet-400" /> Keep estimates honest</div>
          <p className="mt-2 text-xs leading-5 text-zinc-400">A realistic estimate is more helpful than an optimistic one. Review your analytics over time to calibrate how long similar work actually takes.</p>
        </div>
      </section>
    </div>
  );
}
