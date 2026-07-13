'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useFlowTimeStore } from '@/store/use-flowtime-store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  SkipForward, 
  XOctagon, 
  Clock, 
  Flame, 
  Compass, 
  Timer,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Moon,
  Coffee,
  AlertTriangle,
  Award,
  Sparkles
} from 'lucide-react';
import { format, differenceInMinutes, parseISO } from 'date-fns';

export default function DashboardPage() {
  const tasks = useFlowTimeStore((state) => state.tasks);
  const selectedDate = useFlowTimeStore((state) => state.selectedDate);
  const activeTaskId = useFlowTimeStore((state) => state.activeTaskId);
  const timerStatus = useFlowTimeStore((state) => state.timerStatus);
  const elapsedSeconds = useFlowTimeStore((state) => state.elapsedSeconds);
  const settings = useFlowTimeStore((state) => state.settings);
  const timelineBlocks = useFlowTimeStore((state) => state.timelineBlocks);
  const estimatedFinishTime = useFlowTimeStore((state) => state.estimatedFinishTime);
  const hasConflict = useFlowTimeStore((state) => state.hasConflict);
  const sessions = useFlowTimeStore((state) => state.sessions);

  const startTask = useFlowTimeStore((state) => state.startTask);
  const pauseTask = useFlowTimeStore((state) => state.pauseTask);
  const finishTask = useFlowTimeStore((state) => state.finishTask);
  const skipTask = useFlowTimeStore((state) => state.skipTask);
  const cancelTask = useFlowTimeStore((state) => state.cancelTask);

  // Filter tasks for today
  const todaysTasks = tasks.filter(t => t.date === selectedDate);
  const completedTasks = todaysTasks.filter(t => t.status === 'completed');
  const activeTask = todaysTasks.find(t => t.id === activeTaskId);
  
  // Find next task
  const nextBlock = timelineBlocks.find(b => 
    b.status !== 'completed' && 
    b.status !== 'skipped' && 
    b.status !== 'cancelled' && 
    b.taskId !== activeTaskId
  );

  // Focus and Break calculations
  const totalFocusSec = todaysTasks.reduce((sum, t) => sum + t.actualDuration, 0);
  const formattedFocusTime = `${Math.floor(totalFocusSec / 3600)}h ${Math.floor((totalFocusSec % 3600) / 60)}m`;

  // Calculate dynamic break time from gaps between focus sessions
  const breakTimeMin = useMemo(() => {
    const todaysSessions = sessions.filter(s => 
      s.startTime.startsWith(selectedDate)
    ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (todaysSessions.length === 0) return 0;

    let totalBreakSeconds = 0;
    for (let i = 0; i < todaysSessions.length - 1; i++) {
      const currentEnd = todaysSessions[i].endTime ? new Date(todaysSessions[i].endTime!) : null;
      const nextStart = new Date(todaysSessions[i+1].startTime);
      if (currentEnd && nextStart > currentEnd) {
        totalBreakSeconds += Math.max(0, (nextStart.getTime() - currentEnd.getTime()) / 1000);
      }
    }

    // Add current ongoing break if last session is closed and we are in sandbox/active mode
    const lastSession = todaysSessions[todaysSessions.length - 1];
    if (lastSession && lastSession.endTime && activeTaskId === null) {
      const lastEnd = new Date(lastSession.endTime);
      const now = new Date();
      if (now > lastEnd && selectedDate === format(now, 'yyyy-MM-dd')) {
        totalBreakSeconds += Math.max(0, (now.getTime() - lastEnd.getTime()) / 1000);
      }
    }

    return Math.round(totalBreakSeconds / 60);
  }, [sessions, selectedDate, activeTaskId]);

  const isOnBreak = useMemo(() => {
    if (activeTaskId !== null) return false;
    const todaysSessions = sessions.filter(s => s.startTime.startsWith(selectedDate));
    if (todaysSessions.length === 0) return false;
    const lastSession = todaysSessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[todaysSessions.length - 1];
    return lastSession && lastSession.endTime !== null;
  }, [sessions, selectedDate, activeTaskId]);
  
  // Calculate Schedule Offset (Ahead/Behind)
  // Let's sum estimated durations of tasks completed/running vs original schedule expectation
  const originalDurationMin = todaysTasks.reduce((sum, t) => sum + t.estimatedDuration, 0);
  const [scheduleOffsetMin, setScheduleOffsetMin] = useState(0);

  useEffect(() => {
    if (todaysTasks.length === 0 || !estimatedFinishTime) return;
    
    // Parse work start
    const [wStartHour, wStartMin] = settings.workStartTime.split(':').map(Number);
    const originalEnd = new Date();
    originalEnd.setHours(wStartHour, wStartMin, 0, 0);
    const finalOriginalEnd = new Date(originalEnd.getTime() + originalDurationMin * 60 * 1000);
    
    const actualEnd = new Date(estimatedFinishTime);
    const diffMin = differenceInMinutes(actualEnd, finalOriginalEnd);
    setScheduleOffsetMin(diffMin);
  }, [todaysTasks, estimatedFinishTime, originalDurationMin, settings.workStartTime]);

  // Format Elapsed Timer
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer Progress Calculation
  const progressPercent = activeTask 
    ? Math.min(100, (elapsedSeconds / (activeTask.estimatedDuration * 60)) * 100)
    : 0;

  // Streak calculation (mocked for preview)
  const streakDays = 4;

  const isAllTasksCompleted = todaysTasks.length > 0 && todaysTasks.every(t => 
    t.status === 'completed' || t.status === 'skipped' || t.status === 'cancelled'
  );

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto min-h-full">
      
      {/* Title greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Focus Dashboard <Sparkles className="w-5 h-5 text-violet-400" />
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} • Today's schedule focus center
          </p>
        </div>

        {/* Schedule offset badge */}
        {todaysTasks.length > 0 && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            scheduleOffsetMin > 0 
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
              : scheduleOffsetMin < 0 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
          }`}>
            {scheduleOffsetMin > 0 ? (
              <>
                <TrendingDown className="w-4 h-4" />
                <span>Behind schedule by {scheduleOffsetMin}m</span>
              </>
            ) : scheduleOffsetMin < 0 ? (
              <>
                <TrendingUp className="w-4 h-4" />
                <span>Ahead of schedule by {Math.abs(scheduleOffsetMin)}m</span>
              </>
            ) : (
              <>
                <Compass className="w-4 h-4" />
                <span>On Track with Schedule</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Grid Layout */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Active Focus Timer / End of Day Summary */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {isAllTasksCompleted ? (
              // End of Day Summary Widget
              <motion.div
                key="end-of-day"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="p-8 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md glow flex flex-col items-center text-center gap-6"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                  <Award className="w-8 h-8 animate-bounce" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-white">Daily Schedule Completed!</h2>
                  <p className="text-zinc-400 text-sm mt-2 max-w-md mx-auto">
                    Excellent work! You've finished all your tasks for today. Here is your productivity breakdown:
                  </p>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-2">
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-1.5">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Focus Session</span>
                    <span className="text-sm font-bold text-white">{formattedFocusTime}</span>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-1.5">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Tasks Finished</span>
                    <span className="text-sm font-bold text-white">{completedTasks.length} / {todaysTasks.length}</span>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-1.5">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Time Saved</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {scheduleOffsetMin < 0 ? `${Math.abs(scheduleOffsetMin)}m` : '0m'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : activeTask ? (
              // Focus Timer Box
              <motion.div
                key="active-timer"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="p-8 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md glow flex flex-col gap-6"
              >
                {/* Active Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                    </span>
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                      {timerStatus === 'running' ? 'Focus Session Active' : 'Session Paused'}
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-300">
                    Est: {activeTask.estimatedDuration}m
                  </div>
                </div>

                {/* Task Titles */}
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-white">{activeTask.title}</h2>
                  {activeTask.description && (
                    <p className="text-zinc-400 text-sm mt-1.5">{activeTask.description}</p>
                  )}
                </div>

                {/* Big Timer display */}
                <div className="py-6 flex justify-center">
                  <div className="relative w-56 h-56 flex items-center justify-center">
                    {/* SVG Progress Circle */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="112"
                        cy="112"
                        r="96"
                        className="stroke-zinc-800"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <motion.circle
                        cx="112"
                        cy="112"
                        r="96"
                        className="stroke-violet-600 shadow-inner"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 96}
                        animate={{ strokeDashoffset: (2 * Math.PI * 96) * (1 - progressPercent / 100) }}
                        transition={{ duration: 0.5 }}
                      />
                    </svg>
                    
                    {/* Digital display overlay */}
                    <div className="absolute flex flex-col items-center">
                      <span className="text-4xl font-mono font-bold text-white tracking-tighter">
                        {formatTime(elapsedSeconds)}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">
                        Elapsed Time
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-center items-center gap-4 border-t border-white/5 pt-6">
                  
                  {/* Cancel Button */}
                  <button 
                    onClick={() => cancelTask(activeTask.id)}
                    title="Cancel task"
                    className="p-3 rounded-2xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                  >
                    <XOctagon className="w-5 h-5" />
                  </button>

                  {/* Play/Pause Main Toggle */}
                  {timerStatus === 'running' ? (
                    <button 
                      onClick={() => pauseTask(activeTask.id)}
                      className="px-8 py-4 rounded-2xl bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Pause className="w-5 h-5 fill-current" /> Pause Focus
                    </button>
                  ) : (
                    <button 
                      onClick={() => startTask(activeTask.id)}
                      className="px-8 py-4 rounded-2xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2 cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-current" /> Resume Focus
                    </button>
                  )}

                  {/* Skip Button */}
                  <button 
                    onClick={() => skipTask(activeTask.id)}
                    title="Skip task"
                    className="p-3 rounded-2xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>

                  {/* Finish Task Button */}
                  <button 
                    onClick={() => finishTask(activeTask.id)}
                    title="Finish task"
                    className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 transition-all cursor-pointer"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              // Empty Timer state (Select a task to focus)
              <motion.div
                key="empty-timer"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="p-12 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md glow flex flex-col items-center justify-center text-center gap-4 min-h-[360px]"
              >
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-full text-zinc-500">
                  {isOnBreak ? <Coffee className="w-12 h-12 text-indigo-400 animate-pulse" /> : <Timer className="w-12 h-12" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isOnBreak ? 'You are on a break' : 'No active task running'}
                  </h3>
                  <p className="text-zinc-500 text-sm mt-1 max-w-xs mx-auto">
                    {isOnBreak 
                      ? 'FlowTime is automatically tracking your dynamic break session. When you are ready to focus, select a task below.' 
                      : 'Go to the Today\'s Schedule tab or click below to choose a task and start focusing.'
                    }
                  </p>
                </div>

                {todaysTasks.filter(t => t.status !== 'completed' && t.status !== 'skipped').length > 0 ? (
                  <button 
                    onClick={() => {
                      const incomplete = todaysTasks.filter(t => t.status !== 'completed' && t.status !== 'skipped');
                      if (incomplete.length > 0) startTask(incomplete[0].id);
                    }}
                    className="mt-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-violet-600/15"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Start Next Task
                  </button>
                ) : (
                  <Link
                    href="/schedule"
                    className="mt-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/5 text-white hover:bg-zinc-800 transition-all flex items-center gap-1"
                  >
                    Create a Task
                  </Link>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Widgets & Next Tasks */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Quick Stat Cards */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Focus widget */}
            <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col justify-between gap-4 text-left">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Today's Focus</span>
                <Clock className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{formattedFocusTime}</div>
                <p className="text-[10px] text-zinc-500 mt-1">Total active work logged</p>
              </div>
            </div>

            {/* Break time widget */}
            <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col justify-between gap-4 text-left">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Break Time</span>
                <Coffee className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{breakTimeMin}m</div>
                <p className="text-[10px] text-zinc-500 mt-1">Idle breaks & pauses</p>
              </div>
            </div>

            {/* Streak widget */}
            <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col justify-between gap-4 text-left">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Active Streak</span>
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{streakDays} Days</div>
                <p className="text-[10px] text-zinc-500 mt-1">Consistency booster</p>
              </div>
            </div>

            {/* ETA finish widget */}
            <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col justify-between gap-4 text-left">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Completion</span>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {completedTasks.length} / {todaysTasks.length}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Daily checklist rate</p>
              </div>
            </div>

          </div>

          {/* Conflict Warning widget */}
          {hasConflict && estimatedFinishTime && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-left">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-bold text-amber-400">Scheduling Conflict Detected</span>
                <span className="text-zinc-400 leading-normal">
                  Your estimated finish time ({format(parseISO(estimatedFinishTime), 'hh:mm a')}) exceeds your set workday end time of {settings.workEndTime}.
                </span>
                <Link 
                  href="/schedule" 
                  className="text-amber-400 hover:text-amber-300 font-semibold mt-1.5 flex items-center gap-0.5"
                >
                  Resolve in Schedule <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Next Up Widget Card */}
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col gap-3 text-left">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Next Up in Timeline</span>
            
            {nextBlock ? (
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: nextBlock.color }}
                  />
                  <div>
                    <div className="text-sm font-semibold text-white truncate max-w-[180px]">{nextBlock.title}</div>
                    <span className="text-[10px] text-zinc-500">Planned Start: {format(nextBlock.start, 'hh:mm a')}</span>
                  </div>
                </div>
                <div className="text-xs font-semibold text-zinc-400">
                  {nextBlock.duration} mins
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-zinc-600 border border-dashed border-white/5 rounded-xl">
                No subsequent tasks scheduled.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
