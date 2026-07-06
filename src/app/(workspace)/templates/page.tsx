'use client';

import React, { useState } from 'react';
import { useFlowTimeStore } from '@/store/use-flowtime-store';
import { format } from 'date-fns';
import {
  LayoutTemplate, Plus, Trash2, Play, X, Sparkles, Clock,
  ChevronRight, FileText, Check
} from 'lucide-react';

const PRESET_TEMPLATES = [
  {
    id: 'preset-morning',
    name: '☀️ Morning Routine',
    description: 'Energizing start to the day',
    tasks: [
      { title: 'Wake up & Hydrate', estimatedDuration: 10, priority: 'medium', fixedTime: false, color: '#6366f1', icon: 'Sun', sortOrder: 0 },
      { title: 'Exercise / Yoga', estimatedDuration: 30, priority: 'high', fixedTime: false, color: '#10b981', icon: 'Dumbbell', sortOrder: 1 },
      { title: 'Shower & Freshen up', estimatedDuration: 15, priority: 'medium', fixedTime: false, color: '#3b82f6', icon: 'Droplets', sortOrder: 2 },
      { title: 'Breakfast & Review Day', estimatedDuration: 20, priority: 'low', fixedTime: false, color: '#f97316', icon: 'Coffee', sortOrder: 3 },
    ]
  },
  {
    id: 'preset-coding',
    name: '💻 Deep Work Day',
    description: 'Maximize coding focus',
    tasks: [
      { title: 'Plan & Prioritize Tasks', estimatedDuration: 15, priority: 'high', fixedTime: false, color: '#7c3aed', icon: 'CheckSquare', sortOrder: 0 },
      { title: 'Deep Focus Session 1', estimatedDuration: 90, priority: 'high', fixedTime: false, color: '#6366f1', icon: 'Code', sortOrder: 1 },
      { title: 'Short Break', estimatedDuration: 10, priority: 'low', fixedTime: false, color: '#10b981', icon: 'Coffee', sortOrder: 2 },
      { title: 'Deep Focus Session 2', estimatedDuration: 90, priority: 'high', fixedTime: false, color: '#6366f1', icon: 'Code', sortOrder: 3 },
      { title: 'Review & Commit Code', estimatedDuration: 30, priority: 'medium', fixedTime: false, color: '#a78bfa', icon: 'GitBranch', sortOrder: 4 },
    ]
  },
  {
    id: 'preset-exam',
    name: '📚 Exam Day',
    description: 'Focused study & revision',
    tasks: [
      { title: 'Warm up Reading', estimatedDuration: 20, priority: 'medium', fixedTime: false, color: '#f97316', icon: 'BookOpen', sortOrder: 0 },
      { title: 'Chapter 1 Review', estimatedDuration: 60, priority: 'high', fixedTime: false, color: '#ec4899', icon: 'BookOpen', sortOrder: 1 },
      { title: 'Practice Questions', estimatedDuration: 45, priority: 'high', fixedTime: false, color: '#7c3aed', icon: 'PenTool', sortOrder: 2 },
      { title: 'Chapter 2 Review', estimatedDuration: 60, priority: 'high', fixedTime: false, color: '#ec4899', icon: 'BookOpen', sortOrder: 3 },
      { title: 'Mock Test', estimatedDuration: 90, priority: 'high', fixedTime: false, color: '#f43f5e', icon: 'FileText', sortOrder: 4 },
    ]
  },
  {
    id: 'preset-weekend',
    name: '🎉 Weekend Balance',
    description: 'Rest, fun, and light tasks',
    tasks: [
      { title: 'Leisurely Morning', estimatedDuration: 60, priority: 'low', fixedTime: false, color: '#eab308', icon: 'Sun', sortOrder: 0 },
      { title: 'Hobbies / Creative Work', estimatedDuration: 90, priority: 'medium', fixedTime: false, color: '#a78bfa', icon: 'Palette', sortOrder: 1 },
      { title: 'Social / Family Time', estimatedDuration: 120, priority: 'high', fixedTime: false, color: '#10b981', icon: 'Users', sortOrder: 2 },
      { title: 'Light Reading / Journal', estimatedDuration: 30, priority: 'low', fixedTime: false, color: '#6366f1', icon: 'BookOpen', sortOrder: 3 },
    ]
  }
];

export default function TemplatesPage() {
  const templates = useFlowTimeStore(s => s.templates);
  const selectedDate = useFlowTimeStore(s => s.selectedDate);
  const applyTemplate = useFlowTimeStore(s => s.applyTemplate);
  const deleteTemplate = useFlowTimeStore(s => s.deleteTemplate);
  const addTask = useFlowTimeStore(s => s.addTask);

  const [applyingId, setApplyingId] = useState<string | null>(null);

  const handleApplyPreset = async (preset: typeof PRESET_TEMPLATES[0]) => {
    setApplyingId(preset.id);
    for (const t of preset.tasks) {
      await addTask({
        title: t.title,
        estimatedDuration: t.estimatedDuration,
        actualDuration: 0,
        actualStart: null,
        actualEnd: null,
        priority: t.priority as any,
        fixedTime: t.fixedTime,
        color: t.color,
        icon: t.icon,
        sortOrder: t.sortOrder,
        date: selectedDate,
        tags: [],
        status: 'not_started',
        plannedStart: null,
        plannedEnd: null,
      });
    }
    setApplyingId(null);
  };

  const allTemplates = [...PRESET_TEMPLATES, ...templates];

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Schedule Templates <LayoutTemplate className="w-5 h-5 text-violet-400" />
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Apply reusable daily routines to <span className="text-white font-semibold">{format(new Date(`${selectedDate}T00:00:00`), 'EEEE, MMMM d')}</span>
          </p>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {allTemplates.map(template => {
          const taskList = (template as any).tasks || [];
          const isPreset = template.id.startsWith('preset-');
          const isApplying = applyingId === template.id;

          return (
            <div
              key={template.id}
              className="group p-5 rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-sm">{template.name}</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">{template.description}</p>
                </div>
                {!isPreset && (
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Task list */}
              <div className="flex flex-col gap-1.5">
                {taskList.slice(0, 4).map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="truncate flex-1">{t.title}</span>
                    <span className="text-zinc-600 font-mono">{t.estimatedDuration}m</span>
                  </div>
                ))}
                {taskList.length > 4 && (
                  <span className="text-[10px] text-zinc-600 pl-3.5">+{taskList.length - 4} more tasks</span>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-[10px] text-zinc-500 border-t border-white/5 pt-3">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {taskList.length} tasks
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {taskList.reduce((s: number, t: any) => s + t.estimatedDuration, 0)}m total
                </span>
                {isPreset && (
                  <span className="ml-auto px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 font-bold uppercase tracking-wider text-[9px]">
                    Preset
                  </span>
                )}
              </div>

              {/* Apply button */}
              <button
                onClick={() => isPreset ? handleApplyPreset(template as any) : applyTemplate(template.id, selectedDate)}
                disabled={isApplying}
                className="w-full py-2.5 rounded-xl bg-violet-600/90 hover:bg-violet-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-violet-600/10 cursor-pointer disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Apply to Today
                  </>
                )}
              </button>
            </div>
          );
        })}

        {/* Empty custom template slot */}
        <div className="p-5 rounded-2xl border border-dashed border-white/10 hover:border-violet-500/30 transition-all flex flex-col items-center justify-center gap-3 text-center min-h-[200px] cursor-pointer group">
          <div className="p-3 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">Create Custom Template</p>
            <p className="text-xs text-zinc-600 mt-1">Save your current schedule as a reusable routine</p>
          </div>
          <span className="text-[10px] text-zinc-600">Coming Soon via Schedule page</span>
        </div>
      </div>
    </div>
  );
}
