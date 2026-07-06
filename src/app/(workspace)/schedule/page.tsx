'use client';

import React, { useState, useEffect } from 'react';
import { useFlowTimeStore } from '@/store/use-flowtime-store';
import { Task, TimelineBlock } from '@/lib/scheduler';
import { SortableTaskItem } from '@/components/schedule/sortable-task-item';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { 
  Plus, 
  Clock, 
  Lock, 
  Tag, 
  Sparkles, 
  Calendar, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Trash2,
  CalendarDays,
  FileText
} from 'lucide-react';
import { format, addDays, parseISO, differenceInMinutes, parse } from 'date-fns';

export default function SchedulePage() {
  const tasks = useFlowTimeStore(state => state.tasks);
  const selectedDate = useFlowTimeStore(state => state.selectedDate);
  const setSelectedDate = useFlowTimeStore(state => state.setSelectedDate);
  const timelineBlocks = useFlowTimeStore(state => state.timelineBlocks);
  const settings = useFlowTimeStore(state => state.settings);
  const recalculate = useFlowTimeStore(state => state.recalculate);
  
  const addTask = useFlowTimeStore(state => state.addTask);
  const updateTask = useFlowTimeStore(state => state.updateTask);
  const reorderTasks = useFlowTimeStore(state => state.reorderTasks);

  // UI state
  const [isModalOpen, setIsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [estimatedDuration, setEstimatedDuration] = useState(30);
  const [tagsInput, setTagsInput] = useState('');
  const [fixedTime, setFixedTime] = useState(false);
  const [fixedStartTime, setFixedStartTime] = useState('12:00');
  const [color, setColor] = useState('#3b82f6');
  const [icon, setIcon] = useState('CheckSquare');

  // Trigger recalculation on load
  useEffect(() => {
    recalculate();
  }, [tasks, selectedDate, recalculate]);

  // Current time tracker line
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Set up sensors for Drag and Drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle reordering tasks
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = todaysTasks.findIndex(t => t.id === active.id);
      const newIndex = todaysTasks.findIndex(t => t.id === over.id);
      
      const newOrdered = [...todaysTasks];
      const [moved] = newOrdered.splice(oldIndex, 1);
      newOrdered.splice(newIndex, 0, moved);

      reorderTasks(newOrdered);
    }
  };

  // Filter tasks for selected date
  const todaysTasks = tasks
    .filter(t => t.date === selectedDate)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Quick Colors Grid
  const colors = [
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#a78bfa', // purple
    '#ec4899', // pink
    '#f43f5e', // rose
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#10b981', // emerald
    '#06b6d4', // cyan
  ];

  const openAddModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setNotes('');
    setPriority('medium');
    setEstimatedDuration(settings.defaultTaskDuration);
    setTagsInput('');
    setFixedTime(false);
    setFixedStartTime('12:00');
    setColor(colors[0]);
    setIcon('CheckSquare');
    setIsOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setNotes(task.notes || '');
    setPriority(task.priority);
    setEstimatedDuration(task.estimatedDuration);
    setTagsInput(task.tags.join(', '));
    setFixedTime(task.fixedTime);
    if (task.fixedTime && task.plannedStart) {
      setFixedStartTime(format(parseISO(task.plannedStart), 'HH:mm'));
    } else {
      setFixedStartTime('12:00');
    }
    setColor(task.color);
    setIcon(task.icon);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    let plannedStart: string | null = null;
    let plannedEnd: string | null = null;

    if (fixedTime) {
      // Build ISO plannedStart
      plannedStart = `${selectedDate}T${fixedStartTime}:00.000Z`;
      const startDate = parseISO(plannedStart);
      plannedEnd = new Date(startDate.getTime() + estimatedDuration * 60 * 1000).toISOString();
    }

    if (editingTask) {
      // Edit
      await updateTask(editingTask.id, {
        title,
        description,
        notes,
        priority,
        estimatedDuration,
        tags,
        fixedTime,
        plannedStart,
        plannedEnd,
        color,
        icon,
      });
    } else {
      // Add
      await addTask({
        title,
        description,
        notes,
        priority,
        estimatedDuration,
        actualDuration: 0,
        actualStart: null,
        actualEnd: null,
        tags,
        status: 'not_started',
        fixedTime,
        plannedStart,
        plannedEnd,
        color,
        icon,
        sortOrder: todaysTasks.length + 1,
        date: selectedDate
      });
    }

    setIsOpen(false);
  };

  // Switch Dates
  const adjustDate = (days: number) => {
    const current = parseISO(`${selectedDate}T00:00:00`);
    const next = addDays(current, days);
    setSelectedDate(format(next, 'yyyy-MM-dd'));
  };

  // Timeline Scale Settings (1 minute = 1.2px)
  const scale = 1.2;
  const [startHour, startMin] = settings.workStartTime.split(':').map(Number);
  const [endHour, endMin] = settings.workEndTime.split(':').map(Number);
  
  const timelineStart = new Date(currentTime);
  timelineStart.setHours(startHour, startMin, 0, 0);

  const getTimelineOffset = (blockTime: Date) => {
    return differenceInMinutes(blockTime, timelineStart) * scale;
  };

  const getTimelineHeight = (durationMin: number) => {
    return durationMin * scale;
  };

  // Generate Hour Grid ticks
  const hourTicks = [];
  for (let h = startHour; h <= endHour; h++) {
    const tickTime = new Date(currentTime);
    tickTime.setHours(h, 0, 0, 0);
    hourTicks.push(tickTime);
  }

  // Check if selectedDate is today
  const isTodayActive = selectedDate === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto min-h-full">
      
      {/* Schedule Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col text-left">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Today's Schedule <CalendarDays className="w-5 h-5 text-violet-400" />
          </h1>
          <p className="text-zinc-500 text-xs mt-0.5">Plan tasks, drag to reorder, and preview timeline flow</p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-zinc-950/40 border border-white/5 p-1 rounded-xl">
          <button 
            onClick={() => adjustDate(-1)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-white px-2.5 min-w-[120px]">
            {isTodayActive ? 'Today' : format(parseISO(`${selectedDate}T00:00:00`), 'EEE, MMM d')}
          </span>
          <button 
            onClick={() => adjustDate(1)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-violet-600/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Task
        </button>
      </div>

      {/* Main Panels Layout */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Sortable Checklist */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Tasks Checklist</span>
            <span className="text-xs font-semibold text-zinc-500">{todaysTasks.length} total</span>
          </div>

          {todaysTasks.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-sm flex flex-col items-center gap-3 border border-dashed border-white/5 rounded-3xl">
              <Calendar className="w-10 h-10 opacity-30" />
              <div>
                <p className="font-bold text-zinc-400">No tasks planned for today</p>
                <p className="text-zinc-500 text-xs mt-0.5">Click "Add New Task" above to get started.</p>
              </div>
            </div>
          ) : (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={todaysTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-3">
                  {todaysTasks.map(task => (
                    <SortableTaskItem 
                      key={task.id} 
                      task={task} 
                      onEdit={openEditModal} 
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Right Column: Visual Timeline Scroll Grid */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-sans">Dynamic Timeline</span>
            <span className="text-[10px] text-zinc-500 font-medium">Automatic Shift & Splitting Preview</span>
          </div>

          <div className="w-full bg-zinc-950/60 border border-white/5 rounded-3xl p-6 overflow-hidden max-h-[640px] overflow-y-auto relative timeline-gradient select-none">
            {/* Timeline Scroll Box Container */}
            <div 
              className="relative w-full"
              style={{ height: `${(hourTicks.length - 1) * 60 * scale + 40}px` }}
            >
              {/* Hour grid ticks background */}
              {hourTicks.map((tick, index) => {
                const top = index * 60 * scale;
                return (
                  <div 
                    key={tick.toISOString()} 
                    className="absolute w-full flex items-center border-t border-white/[0.03]"
                    style={{ top: `${top}px`, height: '1px' }}
                  >
                    <span className="absolute -left-1 text-[9px] font-mono font-bold text-zinc-600 bg-background/50 px-1 -translate-y-1/2">
                      {format(tick, 'hh:mm a')}
                    </span>
                  </div>
                );
              })}

              {/* Task blocks overlay */}
              {timelineBlocks.map((block) => {
                const top = getTimelineOffset(block.start);
                const height = getTimelineHeight(block.duration);
                const isOngoing = block.status === 'running';

                // Skip rendering if block starts after working hours limit or ends before
                if (top + height < 0) return null;

                return (
                  <div
                    key={block.id}
                    className={`absolute left-14 right-2 p-2.5 rounded-xl border flex flex-col justify-between overflow-hidden group shadow-md transition-all ${
                      isOngoing ? 'shadow-lg shadow-violet-500/5 glow scale-[1.01]' : ''
                    }`}
                    style={{
                      top: `${Math.max(0, top)}px`,
                      height: `${height}px`,
                      backgroundColor: `${block.color}0c`, // soft backdrop
                      borderColor: isOngoing ? '#8b5cf6' : `${block.color}30`,
                      color: block.color
                    }}
                  >
                    <div className="flex items-start justify-between gap-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {block.isFixed && <Lock className="w-3 h-3 flex-shrink-0" />}
                        <span className="text-[11px] font-bold truncate text-white">
                          {block.title}
                          {block.isSplit && block.splitIndex && ` (Part ${block.splitIndex}/${block.totalSplits})`}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-zinc-500 whitespace-nowrap">
                        {format(block.start, 'hh:mm')}
                      </span>
                    </div>

                    <div className="flex items-end justify-between text-[9px] text-zinc-500 mt-1">
                      <span className="font-semibold">{block.duration}m duration</span>
                      <span>{format(block.end, 'hh:mm a')}</span>
                    </div>
                  </div>
                );
              })}

              {/* Red current time tracking line */}
              {isTodayActive && (
                (() => {
                  const offset = getTimelineOffset(currentTime);
                  if (offset >= 0 && offset <= (hourTicks.length - 1) * 60 * scale) {
                    return (
                      <div 
                        className="absolute left-12 right-0 flex items-center z-10 pointer-events-none"
                        style={{ top: `${offset}px` }}
                      >
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-md shadow-red-500/50" />
                        <div className="flex-grow h-0.5 bg-red-500 shadow-md shadow-red-500/50" />
                      </div>
                    );
                  }
                  return null;
                })()
              )}

            </div>
          </div>
        </div>

      </div>

      {/* Add / Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5 select-none">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-violet-400" />
                {editingTask ? 'Edit Task Details' : 'Create Daily Task'}
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-white/5 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-left">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Work on FlowTime scheduler algorithm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Implement layout calculation algorithm..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Notes (Markdown checklist preview) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-zinc-500" /> Notes / Markdown
                </label>
                <textarea
                  placeholder="Use markdown here (checklists, lists, code)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 font-mono text-xs"
                />
              </div>

              {/* Estimations & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Estimate (min)</label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    required
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Task['priority'])}
                    className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="high">🔥 High</option>
                    <option value="medium">⚡ Medium</option>
                    <option value="low">💤 Low</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-zinc-500" /> Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Coding, Office, Personal"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Fixed Time Toggle & inputs */}
              <div className="flex flex-col gap-3.5 p-3.5 rounded-xl bg-white/[0.01] border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-white">Fixed Time Appointment</span>
                    <span className="text-[10px] text-zinc-500">This task cannot shift. It acts as an anchor.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={fixedTime}
                    onChange={(e) => setFixedTime(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-800 text-violet-600 focus:ring-violet-500 bg-zinc-900 cursor-pointer"
                  />
                </div>

                {fixedTime && (
                  <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-100">
                    <label className="text-xs font-semibold text-zinc-400">Select Start Time</label>
                    <input
                      type="time"
                      required
                      value={fixedStartTime}
                      onChange={(e) => setFixedStartTime(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Color Grid Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-400">Card Color</label>
                <div className="flex flex-wrap gap-2.5">
                  {colors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border cursor-pointer transition-all ${
                        color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/5 hover:bg-white/5 text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/10 cursor-pointer"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
