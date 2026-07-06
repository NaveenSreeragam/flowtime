import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateSchedule, Task, TimelineBlock, ScheduleResult } from '@/lib/scheduler';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { parseISO, addMinutes, differenceInSeconds, format } from 'date-fns';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  pomodoroFocusDuration: number; // minutes
  pomodoroShortBreak: number; // minutes
  pomodoroLongBreak: number; // minutes
  pomodoroLongBreakInterval: number; // cycles
  workStartTime: string; // "HH:MM"
  workEndTime: string; // "HH:MM"
  defaultTaskDuration: number; // minutes
}

export interface FocusSession {
  id: string;
  taskId: string;
  startTime: string;
  endTime: string | null;
  sessionType: 'focus' | 'break';
}

export interface Template {
  id: string;
  name: string;
  description: string;
  tasks: Omit<Task, 'id' | 'user_id' | 'actualStart' | 'actualEnd' | 'actualDuration' | 'status'>[];
}

interface FlowTimeState {
  tasks: Task[];
  settings: UserSettings;
  templates: Template[];
  sessions: FocusSession[];
  
  // App state
  selectedDate: string; // YYYY-MM-DD
  activeTaskId: string | null;
  timerStatus: 'idle' | 'running' | 'paused';
  elapsedSeconds: number;
  lastTickTime: number | null;
  isLoading: boolean;
  error: string | null;
  user: any | null; // Supabase user profile

  // Computed timeline blocks
  timelineBlocks: TimelineBlock[];
  hasConflict: boolean;
  estimatedFinishTime: string | null;

  // Actions
  loadInitialData: () => Promise<void>;
  setUser: (user: any) => void;
  setSelectedDate: (date: string) => void;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  
  // Task Actions
  addTask: (task: Omit<Task, 'id' | 'user_id'>) => Promise<string>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reorderTasks: (reorderedTasks: Task[]) => Promise<void>;
  
  // Timer & Session Actions
  startTask: (id: string) => Promise<void>;
  pauseTask: (id: string) => Promise<void>;
  resumeTask: (id: string) => Promise<void>;
  finishTask: (id: string) => Promise<void>;
  skipTask: (id: string) => Promise<void>;
  cancelTask: (id: string) => Promise<void>;
  tick: () => void;

  // Template Actions
  addTemplate: (name: string, description: string, taskIds: string[]) => Promise<void>;
  applyTemplate: (templateId: string, date: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  // Internal helpers
  recalculate: () => void;
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  notificationsEnabled: true,
  pomodoroFocusDuration: 25,
  pomodoroShortBreak: 5,
  pomodoroLongBreak: 15,
  pomodoroLongBreakInterval: 4,
  workStartTime: '09:00',
  workEndTime: '22:00',
  defaultTaskDuration: 30,
};

const getStarterTasks = (date: string): Task[] => [
  {
    id: 'starter-1',
    title: '✨ Welcome to FlowTime',
    description: 'A dynamic scheduling system that moves around your day',
    notes: '### Features to explore:\n- **Dynamic scheduling**: Shift durations and see future times slide!\n- **Keyboard Shortcuts**: Press `Ctrl + K` to open the Command Palette\n- **Fixed Events**: Add tasks with "Fixed Time" toggle to act as structural anchors',
    priority: 'high',
    estimatedDuration: 15,
    actualDuration: 900,
    plannedStart: `${date}T09:00:00Z`,
    plannedEnd: `${date}T09:15:00Z`,
    actualStart: `${date}T09:00:00Z`,
    actualEnd: `${date}T09:15:00Z`,
    tags: ['Personal'],
    status: 'completed',
    fixedTime: false,
    color: '#a78bfa', // purple
    icon: 'Sparkles',
    sortOrder: 1,
    date
  },
  {
    id: 'starter-2',
    title: '💻 Build a new feature',
    description: 'Start the focus timer on this task to see timeline shift',
    notes: 'Start this task! Then pause it to record a break, or complete it early/late to shift remaining tasks.',
    priority: 'high',
    estimatedDuration: 60,
    actualDuration: 0,
    plannedStart: `${date}T09:15:00Z`,
    plannedEnd: `${date}T10:15:00Z`,
    actualStart: null,
    actualEnd: null,
    tags: ['Coding'],
    status: 'not_started',
    fixedTime: false,
    color: '#6366f1', // indigo
    icon: 'Code',
    sortOrder: 2,
    date
  },
  {
    id: 'starter-3',
    title: '📅 Client Standup Meeting',
    description: 'This is a fixed time event. Dynamic tasks flow around it.',
    notes: 'Fixed events never move. If dynamic tasks run late, they will split into segments before and after this event.',
    priority: 'medium',
    estimatedDuration: 30,
    actualDuration: 0,
    plannedStart: `${date}T11:00:00.000Z`,
    plannedEnd: `${date}T11:30:00.000Z`,
    actualStart: null,
    actualEnd: null,
    tags: ['Meetings'],
    status: 'not_started',
    fixedTime: true,
    color: '#f97316', // orange
    icon: 'Calendar',
    sortOrder: 3,
    date
  },
  {
    id: 'starter-4',
    title: '🏃 Gym Workout',
    description: 'Stretch and run on treadmill',
    notes: 'Healthy body, healthy mind!',
    priority: 'low',
    estimatedDuration: 45,
    actualDuration: 0,
    plannedStart: `${date}T11:30:00Z`,
    plannedEnd: `${date}T12:15:00Z`,
    actualStart: null,
    actualEnd: null,
    tags: ['Health'],
    status: 'not_started',
    fixedTime: false,
    color: '#10b981', // emerald
    icon: 'Dumbbell',
    sortOrder: 4,
    date
  }
];

export const useFlowTimeStore = create<FlowTimeState>()(
  persist(
    (set, get) => ({
      tasks: [],
      settings: defaultSettings,
      templates: [],
      sessions: [],
      selectedDate: new Date().toISOString().split('T')[0],
      activeTaskId: null,
      timerStatus: 'idle',
      elapsedSeconds: 0,
      lastTickTime: null,
      isLoading: false,
      error: null,
      user: null,
      timelineBlocks: [],
      hasConflict: false,
      estimatedFinishTime: null,

      recalculate: () => {
        const { tasks, selectedDate, settings } = get();
        const now = new Date();
        const result = calculateSchedule(
          tasks,
          selectedDate,
          now,
          settings.workStartTime,
          settings.workEndTime
        );
        set({
          timelineBlocks: result.blocks,
          hasConflict: result.hasConflict,
          estimatedFinishTime: result.estimatedFinishTime ? result.estimatedFinishTime.toISOString() : null
        });
      },

      loadInitialData: async () => {
        set({ isLoading: true });
        try {
          const { selectedDate, user } = get();
          
          if (user && supabase) {
            // Load tasks from Supabase
            const { data: dbTasks, error: taskError } = await supabase
              .from('tasks')
              .select('*')
              .eq('date', selectedDate);
              
            if (taskError) throw taskError;

            // Load settings
            const { data: dbSettings, error: settingsError } = await supabase
              .from('settings')
              .select('*')
              .eq('user_id', user.id)
              .single();

            if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

            // Load templates
            const { data: dbTemplates, error: templatesError } = await supabase
              .from('templates')
              .select('*')
              .eq('user_id', user.id);
            if (templatesError) throw templatesError;

            const mappedTasks: Task[] = (dbTasks || []).map(t => ({
              id: t.id,
              title: t.title,
              description: t.description,
              notes: t.notes,
              priority: t.priority,
              estimatedDuration: t.estimated_duration,
              actualDuration: t.actual_duration,
              plannedStart: t.planned_start,
              plannedEnd: t.planned_end,
              actualStart: t.actual_start,
              actualEnd: t.actual_end,
              tags: t.tags || [],
              status: t.status,
              fixedTime: t.fixed_time,
              color: t.color,
              icon: t.icon,
              sortOrder: t.sort_order,
              date: t.date
            }));

            set({
              tasks: mappedTasks,
              settings: dbSettings 
                ? {
                    theme: dbSettings.theme,
                    notificationsEnabled: dbSettings.notifications_enabled,
                    pomodoroFocusDuration: dbSettings.pomodoro_focus_duration,
                    pomodoroShortBreak: dbSettings.pomodoro_short_break,
                    pomodoroLongBreak: dbSettings.pomodoro_long_break,
                    pomodoroLongBreakInterval: dbSettings.pomodoro_long_break_interval,
                    workStartTime: dbSettings.work_start_time,
                    workEndTime: dbSettings.work_end_time,
                    defaultTaskDuration: dbSettings.default_task_duration,
                  }
                : get().settings,
              templates: dbTemplates || []
            });
          } else {
            // Local fallback logic: if tasks are empty for this date, load starter tasks
            const localTasks = get().tasks;
            const dateTasks = localTasks.filter(t => t.date === selectedDate);
            if (dateTasks.length === 0) {
              const starters = getStarterTasks(selectedDate);
              set({ tasks: [...localTasks, ...starters] });
            }
          }
          get().recalculate();
        } catch (error: any) {
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      setUser: (user) => {
        set({ user });
        get().loadInitialData();
      },

      setSelectedDate: (selectedDate) => {
        set({ selectedDate });
        get().loadInitialData();
      },

      updateSettings: async (updates) => {
        const newSettings = { ...get().settings, ...updates };
        set({ settings: newSettings });

        const { user } = get();
        if (user && supabase) {
          const { error } = await supabase
            .from('settings')
            .upsert({
              user_id: user.id,
              theme: newSettings.theme,
              notifications_enabled: newSettings.notificationsEnabled,
              pomodoro_focus_duration: newSettings.pomodoroFocusDuration,
              pomodoro_short_break: newSettings.pomodoroShortBreak,
              pomodoro_long_break: newSettings.pomodoroLongBreak,
              pomodoro_long_break_interval: newSettings.pomodoroLongBreakInterval,
              work_start_time: newSettings.workStartTime,
              work_end_time: newSettings.workEndTime,
              default_task_duration: newSettings.defaultTaskDuration,
              updated_at: new Date().toISOString()
            });
          if (error) set({ error: error.message });
        }
        get().recalculate();
      },

      addTask: async (taskDetails) => {
        const id = crypto.randomUUID();
        const newTask: Task = {
          ...taskDetails,
          id,
          actualDuration: 0,
          actualStart: null,
          actualEnd: null,
          status: 'not_started'
        };

        const updatedTasks = [...get().tasks, newTask];
        set({ tasks: updatedTasks });

        const { user } = get();
        if (user && supabase) {
          const { error } = await supabase
            .from('tasks')
            .insert({
              id,
              user_id: user.id,
              title: newTask.title,
              description: newTask.description,
              notes: newTask.notes,
              priority: newTask.priority,
              estimated_duration: newTask.estimatedDuration,
              actual_duration: 0,
              tags: newTask.tags,
              status: newTask.status,
              fixed_time: newTask.fixedTime,
              planned_start: newTask.plannedStart,
              planned_end: newTask.plannedEnd,
              color: newTask.color,
              icon: newTask.icon,
              sort_order: newTask.sortOrder,
              date: newTask.date
            });
          if (error) set({ error: error.message });
        }
        
        get().recalculate();
        return id;
      },

      updateTask: async (id, updates) => {
        const updatedTasks = get().tasks.map(t => t.id === id ? { ...t, ...updates } : t);
        set({ tasks: updatedTasks });

        const { user } = get();
        if (user && supabase) {
          const { error } = await supabase
            .from('tasks')
            .update({
              title: updates.title,
              description: updates.description,
              notes: updates.notes,
              priority: updates.priority,
              estimated_duration: updates.estimatedDuration,
              actual_duration: updates.actualDuration,
              tags: updates.tags,
              status: updates.status,
              fixed_time: updates.fixedTime,
              planned_start: updates.plannedStart,
              planned_end: updates.plannedEnd,
              actual_start: updates.actualStart,
              actual_end: updates.actualEnd,
              color: updates.color,
              icon: updates.icon,
              sort_order: updates.sortOrder
            })
            .eq('id', id);
          if (error) set({ error: error.message });
        }

        get().recalculate();
      },

      deleteTask: async (id) => {
        const updatedTasks = get().tasks.filter(t => t.id !== id);
        set({ tasks: updatedTasks });

        if (get().activeTaskId === id) {
          set({ activeTaskId: null, timerStatus: 'idle', elapsedSeconds: 0, lastTickTime: null });
        }

        const { user } = get();
        if (user && supabase) {
          const { error } = await supabase.from('tasks').delete().eq('id', id);
          if (error) set({ error: error.message });
        }

        get().recalculate();
      },

      reorderTasks: async (reorderedTasks) => {
        const localTasksMap = new Map(get().tasks.map(t => [t.id, t]));
        
        // Re-assign sort orders sequentially
        const updated = reorderedTasks.map((t, idx) => {
          const original = localTasksMap.get(t.id);
          return original ? { ...original, sortOrder: idx } : t;
        });

        // Merge updated back into full task list
        const updatedMap = new Map(updated.map(t => [t.id, t]));
        const merged = get().tasks.map(t => updatedMap.get(t.id) || t);
        
        set({ tasks: merged });

        const { user } = get();
        if (user && supabase) {
          // Send bulk update or sequence updates to Supabase
          const updates = reorderedTasks.map((t, idx) => ({
            id: t.id,
            user_id: user.id,
            title: t.title,
            estimated_duration: t.estimatedDuration,
            sort_order: idx
          }));
          
          const { error } = await supabase.from('tasks').upsert(updates);
          if (error) set({ error: error.message });
        }

        get().recalculate();
      },

      startTask: async (id) => {
        const nowStr = new Date().toISOString();
        
        // If there's already a task running, pause it first
        const activeId = get().activeTaskId;
        if (activeId && activeId !== id) {
          await get().pauseTask(activeId);
        }

        const task = get().tasks.find(t => t.id === id);
        if (!task) return;

        const updates: Partial<Task> = {
          status: 'running',
          actualStart: task.actualStart || nowStr // Set actualStart if it is the first time starting
        };

        set({
          activeTaskId: id,
          timerStatus: 'running',
          elapsedSeconds: task.actualDuration,
          lastTickTime: Date.now()
        });

        await get().updateTask(id, updates);
        
        // Insert a new task session
        const session: FocusSession = {
          id: crypto.randomUUID(),
          taskId: id,
          startTime: nowStr,
          endTime: null,
          sessionType: 'focus'
        };
        set({ sessions: [...get().sessions, session] });

        const { user } = get();
        if (user && supabase) {
          await supabase.from('task_sessions').insert({
            id: session.id,
            task_id: id,
            start_time: session.startTime,
            session_type: 'focus'
          });
        }
      },

      pauseTask: async (id) => {
        if (get().activeTaskId !== id || get().timerStatus !== 'running') return;
        
        const nowStr = new Date().toISOString();
        const task = get().tasks.find(t => t.id === id);
        if (!task) return;

        // Calculate final actual duration
        const finalDurationSec = get().elapsedSeconds;

        set({
          timerStatus: 'paused',
          lastTickTime: null
        });

        await get().updateTask(id, {
          status: 'paused',
          actualDuration: finalDurationSec
        });

        // Close the current session
        const activeSession = get().sessions.find(s => s.taskId === id && s.endTime === null);
        if (activeSession) {
          const updatedSessions = get().sessions.map(s => 
            s.id === activeSession.id ? { ...s, endTime: nowStr } : s
          );
          set({ sessions: updatedSessions });

          const { user } = get();
          if (user && supabase) {
            await supabase
              .from('task_sessions')
              .update({ end_time: nowStr })
              .eq('id', activeSession.id);
          }
        }
      },

      resumeTask: async (id) => {
        await get().startTask(id);
      },

      finishTask: async (id) => {
        const nowStr = new Date().toISOString();
        const task = get().tasks.find(t => t.id === id);
        if (!task) return;

        const isRunning = get().activeTaskId === id && get().timerStatus === 'running';
        const finalDurationSec = isRunning ? get().elapsedSeconds : task.actualDuration;

        set({
          activeTaskId: null,
          timerStatus: 'idle',
          elapsedSeconds: 0,
          lastTickTime: null
        });

        // Find the planned end calculated by the scheduler
        const block = get().timelineBlocks.find(b => b.taskId === id);
        const actualEnd = nowStr;

        await get().updateTask(id, {
          status: 'completed',
          actualDuration: finalDurationSec,
          actualEnd,
          actualStart: task.actualStart || nowStr
        });

        // Close any active focus session
        const activeSession = get().sessions.find(s => s.taskId === id && s.endTime === null);
        if (activeSession) {
          const updatedSessions = get().sessions.map(s => 
            s.id === activeSession.id ? { ...s, endTime: nowStr } : s
          );
          set({ sessions: updatedSessions });

          const { user } = get();
          if (user && supabase) {
            await supabase
              .from('task_sessions')
              .update({ end_time: nowStr })
              .eq('id', activeSession.id);
          }
        }
      },

      skipTask: async (id) => {
        const isRunning = get().activeTaskId === id;
        if (isRunning) {
          set({
            activeTaskId: null,
            timerStatus: 'idle',
            elapsedSeconds: 0,
            lastTickTime: null
          });
        }
        await get().updateTask(id, { status: 'skipped' });
      },

      cancelTask: async (id) => {
        const isRunning = get().activeTaskId === id;
        if (isRunning) {
          set({
            activeTaskId: null,
            timerStatus: 'idle',
            elapsedSeconds: 0,
            lastTickTime: null
          });
        }
        await get().updateTask(id, { status: 'cancelled' });
      },

      tick: () => {
        const { timerStatus, activeTaskId, lastTickTime, elapsedSeconds } = get();
        if (timerStatus !== 'running' || !activeTaskId || !lastTickTime) return;

        const now = Date.now();
        const delta = Math.round((now - lastTickTime) / 1000);
        
        if (delta >= 1) {
          const newElapsed = elapsedSeconds + delta;
          
          // Optimistically update the active task duration inside local tasks state
          const updatedTasks = get().tasks.map(t => 
            t.id === activeTaskId ? { ...t, actualDuration: newElapsed } : t
          );

          set({
            elapsedSeconds: newElapsed,
            lastTickTime: now,
            tasks: updatedTasks
          });

          // Run recalculation to keep timeline moving reactively in real-time!
          get().recalculate();
        }
      },

      addTemplate: async (name, description, taskIds) => {
        const { tasks } = get();
        const selectedTasks = tasks.filter(t => taskIds.includes(t.id));
        
        const templateTasks: Template['tasks'] = selectedTasks.map(t => ({
          title: t.title,
          description: t.description,
          notes: t.notes,
          priority: t.priority,
          estimatedDuration: t.estimatedDuration,
          fixedTime: t.fixedTime,
          plannedStart: t.fixedTime && t.plannedStart ? t.plannedStart : null,
          plannedEnd: t.fixedTime && t.plannedEnd ? t.plannedEnd : null,
          color: t.color,
          icon: t.icon,
          sortOrder: t.sortOrder,
          tags: t.tags,
          date: t.date
        }));

        const newTemplate: Template = {
          id: crypto.randomUUID(),
          name,
          description,
          tasks: templateTasks
        };

        set({ templates: [...get().templates, newTemplate] });

        const { user } = get();
        if (user && supabase) {
          const { data: dbTemplate, error: tError } = await supabase
            .from('templates')
            .insert({
              id: newTemplate.id,
              user_id: user.id,
              name: newTemplate.name,
              description: newTemplate.description
            })
            .select()
            .single();

          if (tError) {
            set({ error: tError.message });
            return;
          }

          const dbTemplateTasks = templateTasks.map(tt => ({
            template_id: dbTemplate.id,
            title: tt.title,
            description: tt.description,
            priority: tt.priority,
            estimated_duration: tt.estimatedDuration,
            fixed_time: tt.fixedTime,
            planned_start_time: tt.plannedStart ? tt.plannedStart.split('T')[1]?.substring(0, 5) : null,
            color: tt.color,
            icon: tt.icon,
            sort_order: tt.sortOrder
          }));

          const { error: ttError } = await supabase.from('template_tasks').insert(dbTemplateTasks);
          if (ttError) set({ error: ttError.message });
        }
      },

      applyTemplate: async (templateId, date) => {
        const template = get().templates.find(t => t.id === templateId);
        if (!template) return;

        const newTasks: Task[] = template.tasks.map((tt, idx) => {
          const id = crypto.randomUUID();
          
          let plannedStart: string | null = null;
          let plannedEnd: string | null = null;
          
          if (tt.fixedTime && tt.plannedStart) {
            plannedStart = tt.plannedStart.includes('T') 
              ? `${date}T${tt.plannedStart.split('T')[1]}` 
              : `${date}T${tt.plannedStart}:00Z`;
            plannedEnd = addMinutes(parseISO(plannedStart), tt.estimatedDuration).toISOString();
          }

          return {
            id,
            title: tt.title,
            description: tt.description,
            priority: tt.priority,
            estimatedDuration: tt.estimatedDuration,
            actualDuration: 0,
            plannedStart,
            plannedEnd,
            actualStart: null,
            actualEnd: null,
            tags: [],
            status: 'not_started',
            fixedTime: tt.fixedTime,
            color: tt.color,
            icon: tt.icon,
            sortOrder: tt.sortOrder,
            date
          };
        });

        set({ tasks: [...get().tasks, ...newTasks] });

        const { user } = get();
        if (user && supabase) {
          const dbTasks = newTasks.map(nt => ({
            id: nt.id,
            user_id: user.id,
            title: nt.title,
            description: nt.description,
            priority: nt.priority,
            estimated_duration: nt.estimatedDuration,
            actual_duration: 0,
            status: nt.status,
            fixed_time: nt.fixedTime,
            planned_start: nt.plannedStart,
            planned_end: nt.plannedEnd,
            color: nt.color,
            icon: nt.icon,
            sort_order: nt.sortOrder,
            date: nt.date
          }));
          
          const { error } = await supabase.from('tasks').insert(dbTasks);
          if (error) set({ error: error.message });
        }

        get().recalculate();
      },

      deleteTemplate: async (id) => {
        set({ templates: get().templates.filter(t => t.id !== id) });
        
        const { user } = get();
        if (user && supabase) {
          const { error } = await supabase.from('templates').delete().eq('id', id);
          if (error) set({ error: error.message });
        }
      }
    }),
    {
      name: 'flowtime-storage',
      partialize: (state) => ({
        tasks: state.tasks,
        settings: state.settings,
        templates: state.templates,
        sessions: state.sessions
      })
    }
  )
);
