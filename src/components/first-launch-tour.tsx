'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarPlus, Check, Clock3, Lock, Play, Sparkles, X } from 'lucide-react';

const completionKey = 'flowtime-first-launch-tour-complete';

const tourSteps = [
  {
    title: 'Welcome to FlowTime',
    description: 'Plan a flexible day, then let your schedule adapt when real life changes your timing.',
    icon: Sparkles,
    accent: 'text-violet-300 bg-violet-500/15 border-violet-500/25',
  },
  {
    title: 'Start with your task list',
    description: 'Add the work you want to do today and give each task a realistic time estimate.',
    icon: CalendarPlus,
    accent: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/25',
  },
  {
    title: 'Anchor what cannot move',
    description: 'Mark meetings and appointments as fixed-time events. Flexible tasks will flow around them automatically.',
    icon: Lock,
    accent: 'text-amber-300 bg-amber-500/15 border-amber-500/25',
  },
  {
    title: 'Focus, then adjust',
    description: 'Start a task when you begin. Finish early or late, and FlowTime recalculates the rest of your day.',
    icon: Play,
    accent: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/25',
  },
];

export function FirstLaunchTour() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsOpen(window.localStorage.getItem(completionKey) !== 'true');
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const closeTour = () => {
    window.localStorage.setItem(completionKey, 'true');
    setIsOpen(false);
  };

  const finishTour = () => {
    closeTour();
    router.push('/schedule');
  };

  if (!isOpen) return null;

  const step = tourSteps[stepIndex];
  const Icon = step.icon;
  const isLastStep = stepIndex === tourSteps.length - 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/50">
        <div className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative p-6 md:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              <Clock3 className="h-4 w-4 text-violet-400" /> Getting started
            </div>
            <button onClick={closeTour} className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white cursor-pointer" aria-label="Skip app walkthrough">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border ${step.accent}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-h-32">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-300">Step {stepIndex + 1} of {tourSteps.length}</p>
            <h1 id="tour-title" className="text-2xl font-bold tracking-tight text-white">{step.title}</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{step.description}</p>
          </div>

          <div className="mt-7 flex gap-1.5" aria-label="Walkthrough progress">
            {tourSteps.map((tourStep, index) => (
              <div key={tourStep.title} className={`h-1.5 flex-1 rounded-full transition-colors ${index <= stepIndex ? 'bg-violet-500' : 'bg-white/10'}`} />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            {stepIndex === 0 ? (
              <button onClick={closeTour} className="text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-200 cursor-pointer">Skip for now</button>
            ) : (
              <button onClick={() => setStepIndex((index) => index - 1)} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:text-white cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            )}
            <button onClick={isLastStep ? finishTour : () => setStepIndex((index) => index + 1)} className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-violet-500 cursor-pointer">
              {isLastStep ? <>Plan my day <Check className="h-3.5 w-3.5" /></> : <>Continue <ArrowRight className="h-3.5 w-3.5" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
