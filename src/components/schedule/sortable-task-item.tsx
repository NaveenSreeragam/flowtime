'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/lib/scheduler';
import { useFlowTimeStore } from '@/store/use-flowtime-store';
import { 
  GripVertical, 
  Play, 
  Pause, 
  Check, 
  Lock, 
  Trash2, 
  Edit3, 
  Copy,
  Clock,
  ArrowRight,
  SkipForward
} from 'lucide-react';

interface SortableTaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export function SortableTaskItem({ task, onEdit }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const activeTaskId = useFlowTimeStore(state => state.activeTaskId);
  const timerStatus = useFlowTimeStore(state => state.timerStatus);
  const startTask = useFlowTimeStore(state => state.startTask);
  const pauseTask = useFlowTimeStore(state => state.pauseTask);
  const finishTask = useFlowTimeStore(state => state.finishTask);
  const skipTask = useFlowTimeStore(state => state.skipTask);
  const deleteTask = useFlowTimeStore(state => state.deleteTask);
  const addTask = useFlowTimeStore(state => state.addTask);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : 'auto',
    opacity: isDragging ? 0.4 : 1
  };

  const handleDuplicate = () => {
    const { id, user_id, ...details } = task as any;
    addTask({
      ...details,
      title: `${task.title} (Copy)`,
      sortOrder: task.sortOrder + 1
    });
  };

  const isRunning = activeTaskId === task.id && timerStatus === 'running';

  const priorityColors = {
    high: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  };

  const statusLabels = {
    not_started: 'Not Started',
    running: 'Running',
    paused: 'Paused',
    completed: 'Completed',
    skipped: 'Skipped',
    cancelled: 'Cancelled'
  };

  const statusColors = {
    not_started: 'text-zinc-500 border-zinc-800',
    running: 'text-violet-400 border-violet-500/30 bg-violet-500/5',
    paused: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
    completed: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
    skipped: 'text-zinc-500 border-zinc-800 bg-zinc-900/50',
    cancelled: 'text-red-400 border-red-500/30 bg-red-500/5'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between p-4 rounded-2xl bg-zinc-950/60 border ${
        isRunning ? 'border-violet-500/30 shadow-lg shadow-violet-500/5' : 'border-white/5'
      } hover:border-white/10 transition-all`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Drag Grip Handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-white/5 text-zinc-600 group-hover:text-zinc-400 cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Color Indicator Pillar */}
        <div 
          className="w-1 self-stretch rounded-full" 
          style={{ backgroundColor: task.color }}
        />

        {/* Task content */}
        <div className="flex flex-col text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold truncate max-w-[200px] md:max-w-[280px] ${
              task.status === 'completed' ? 'line-through text-zinc-500' : 'text-white'
            }`}>
              {task.title}
            </span>
            {task.fixedTime && (
              <span className="p-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Fixed Time Task">
                <Lock className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
          
          <div className="flex items-center flex-wrap gap-2 mt-1.5 text-[10px]">
            {/* Priority */}
            <span className={`px-2 py-0.5 rounded-full border font-semibold capitalize ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
            
            {/* Estimate */}
            <span className="flex items-center gap-1 text-zinc-500">
              <Clock className="w-3 h-3" /> {task.estimatedDuration}m
            </span>

            {/* Status */}
            <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${statusColors[task.status]}`}>
              {statusLabels[task.status]}
            </span>

            {/* Tags */}
            {task.tags.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 font-semibold">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity">
        {task.status !== 'completed' && task.status !== 'skipped' && (
          <>
            {isRunning ? (
              <button
                onClick={() => pauseTask(task.id)}
                title="Pause task"
                className="p-1.5 rounded-lg hover:bg-white/5 text-amber-400 transition-colors cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={() => startTask(task.id)}
                title="Start focus timer"
                className="p-1.5 rounded-lg hover:bg-white/5 text-violet-400 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
            
            <button
              onClick={() => finishTask(task.id)}
              title="Complete task"
              className="p-1.5 rounded-lg hover:bg-white/5 text-emerald-400 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => skipTask(task.id)}
              title="Skip task"
              className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        <button
          onClick={() => onEdit(task)}
          title="Edit Details"
          className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleDuplicate}
          title="Duplicate task"
          className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => deleteTask(task.id)}
          title="Delete task"
          className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
