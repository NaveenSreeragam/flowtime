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
  FileText,
  Save,
  FolderPlus
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
  const addTemplate = useFlowTimeStore(state => state.addTemplate);

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

  // Save Template Modal state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

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

  const openSaveTemplateModal = () => {
    setTemplateName(format(parseISO(`${selectedDate}T00:00:00`), 'MMMM d') + ' Routine');
    setTemplateDescription('Reusable routine from ' + selectedDate);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (todaysTasks.length === 0) return;
    
    const taskIds = todaysTasks.map(t => t.id);
    await addTemplate(templateName, templateDescription, taskIds);
    setIsTemplateModalOpen(false);
  };

  // Timeline Layout configs
  const scale = 2; // pixel per minute
  const startHour = 7;
  const endHour = 22;

  const getTimelineOffset = (timeStr: string | Date) => {
    let blockTime: Date;
    if (typeof timeStr === 'string') {
      if (timeStr.includes('T')) {
        blockTime = parseISO(timeStr);
      } else {
        blockTime = parse(timeStr, 'HH:mm', new Date());
      }
    } else {
      blockTime = timeStr;
    }

    const timelineStart = new Date(blockTime);
    timelineStart.setHours(startHour, 0, 0, 0);

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
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Today's Schedule <CalendarDays className="w-5 h-5 text-foreground" />
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">Plan tasks, drag to reorder, and preview timeline flow</p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-xl">
          <button 
            onClick={() => adjustDate(-1)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-foreground px-2.5 min-w-[120px]">
            {isTodayActive ? 'Today' : format(parseISO(`${selectedDate}T00:00:00`), 'EEE, MMM d')}
          </span>
          <button 
            onClick={() => adjustDate(1)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openSaveTemplateModal}
            disabled={todaysTasks.length === 0}
            className="flex items-center justify-center gap-1.5 bg-secondary border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-foreground font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            title={todaysTasks.length === 0 ? "Add tasks first to save as a template" : "Save this day's tasks as a reusable template"}
          >
            <Save className="w-4 h-4 text-foreground" /> Save as Template
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-1.5 bg-foreground text-background font-semibold text-xs px-4 py-2.5 rounded-xl hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New Task
          </button>
        </div>
      </div>

      {/* Main Panels Layout */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Sortable Checklist */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tasks Checklist</span>
            <span className="text-xs font-semibold text-muted-foreground">{todaysTasks.length} total</span>
          </div>

          {todaysTasks.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-3 border border-dashed border-border bg-card rounded-3xl">
              <Calendar className="w-10 h-10 opacity-30 text-foreground" />
              <div>
                <p className="font-bold text-foreground">No tasks planned for today</p>
                <p className="text-muted-foreground text-xs mt-0.5">Click "Add New Task" above to get started.</p>
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
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">Dynamic Timeline</span>
            <span className="text-[10px] text-muted-foreground font-medium">Automatic Shift & Splitting Preview</span>
          </div>

          <div className="w-full bg-card border border-border rounded-3xl p-6 overflow-hidden max-h-[640px] overflow-y-auto relative timeline-gradient select-none">
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
                    className="absolute w-full flex items-center border-t border-border/40"
                    style={{ top: `${top}px`, height: '1px' }}
                  >
                    <span className="absolute -left-1 text-[9px] font-mono font-bold text-muted-foreground bg-card/85 px-1 -translate-y-1/2">
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

                if (top + height < 0) return null;

                return (
                  <div
                    key={block.id}
                    className={`absolute left-14 right-2 p-2.5 rounded-xl border flex flex-col justify-between overflow-hidden group shadow-sm transition-all ${
                      isOngoing ? 'scale-[1.01] border-foreground' : ''
                    }`}
                    style={{
                      top: `${Math.max(0, top)}px`,
                      height: `${height}px`,
                      backgroundColor: isOngoing ? 'rgba(0, 0, 0, 0.05)' : 'var(--secondary)',
                      borderColor: isOngoing ? 'var(--foreground)' : 'var(--border)',
                      color: 'var(--foreground)'
                    }}
                  >
                    <div className="flex items-start justify-between gap-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {block.isFixed && <Lock className="w-3 h-3 flex-shrink-0 text-foreground" />}
                        <span className="text-[11px] font-bold truncate text-foreground">
                          {block.title}
                          {block.isSplit && block.splitIndex && ` (Part ${block.splitIndex}/${block.totalSplits})`}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-muted-foreground whitespace-nowrap">
                        {format(block.start, 'hh:mm')}
                      </span>
                    </div>

                    <div className="flex items-end justify-between text-[9px] text-muted-foreground mt-1">
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
                        <div className="w-2 h-2 rounded-full bg-foreground -ml-1 shadow-sm" />
                        <div className="flex-grow h-0.5 bg-foreground/75" />
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
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border select-none">
              <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-foreground" />
                {editingTask ? 'Edit Task Details' : 'Create Daily Task'}
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-left">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Work on FlowTime scheduler algorithm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Implement layout calculation algorithm..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground"
                />
              </div>

              {/* Notes (Markdown checklist preview) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Notes / Markdown
                </label>
                <textarea
                  placeholder="Use markdown here (checklists, lists, code)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground font-mono text-xs"
                />
              </div>

              {/* Estimations & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Estimate (min)</label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    required
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Task['priority'])}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
                  >
                    <option value="high">🔥 High</option>
                    <option value="medium">⚡ Medium</option>
                    <option value="low">💤 Low</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" /> Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Coding, Office, Personal"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground"
                />
              </div>

              {/* Fixed Time Toggle & inputs */}
              <div className="flex flex-col gap-3.5 p-3.5 rounded-xl bg-secondary/40 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-foreground">Fixed Time Appointment</span>
                    <span className="text-[10px] text-muted-foreground">This task cannot shift. It acts as an anchor.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={fixedTime}
                    onChange={(e) => setFixedTime(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-foreground focus:ring-foreground bg-background cursor-pointer"
                  />
                </div>

                {fixedTime && (
                  <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-100">
                    <label className="text-xs font-semibold text-muted-foreground">Select Start Time</label>
                    <input
                      type="time"
                      required
                      value={fixedStartTime}
                      onChange={(e) => setFixedStartTime(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Color Grid Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground">Card Color</label>
                <div className="flex flex-wrap gap-2.5">
                  {colors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border cursor-pointer transition-all ${
                        color === c ? 'border-foreground scale-110 shadow-sm' : 'border-border/40 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 border-t border-border pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-border hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 cursor-pointer"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Save Day as Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border select-none">
              <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-foreground" />
                Save Schedule as Template
              </span>
              <button 
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSaveTemplateSubmit} className="p-5 flex flex-col gap-4 text-left">
              {/* Template Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Template Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Focus Block"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground"
                />
              </div>

              {/* Template Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Standard morning coding routine..."
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground"
                />
              </div>

              {/* Info panel */}
              <div className="p-3.5 rounded-xl bg-secondary border border-border text-xs text-muted-foreground leading-normal">
                This will save <span className="text-foreground font-bold">{todaysTasks.length} tasks</span> from your current schedule as a template. You can apply it to any other day via the Templates tab.
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 border-t border-border pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-border hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
