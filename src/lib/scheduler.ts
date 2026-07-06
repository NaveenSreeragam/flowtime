import { addMinutes, differenceInMinutes, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export interface Task {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: number; // in minutes
  actualDuration: number; // in seconds
  plannedStart: string | null; // ISO string
  plannedEnd: string | null; // ISO string
  actualStart: string | null; // ISO string
  actualEnd: string | null; // ISO string
  tags: string[];
  status: 'not_started' | 'running' | 'paused' | 'completed' | 'skipped' | 'cancelled';
  fixedTime: boolean;
  color: string;
  icon: string;
  sortOrder: number;
  date: string; // YYYY-MM-DD
}

export interface TimelineBlock {
  id: string; // taskId-part-N or taskId
  taskId: string;
  title: string;
  start: Date;
  end: Date;
  duration: number; // in minutes
  isFixed: boolean;
  status: Task['status'];
  color: string;
  icon: string;
  priority: Task['priority'];
  isSplit: boolean;
  splitIndex?: number;
  totalSplits?: number;
  task: Task;
}

export interface ScheduleResult {
  blocks: TimelineBlock[];
  hasConflict: boolean;
  estimatedFinishTime: Date | null;
}

/**
 * Recalculates the daily schedule based on current task states, time, and user's workday bounds.
 */
export function calculateSchedule(
  tasks: Task[],
  dateStr: string,
  now: Date,
  workStartStr: string = '09:00',
  workEndStr: string = '22:00'
): ScheduleResult {
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  // Parse work hours relative to the active date
  const [wStartHour, wStartMin] = workStartStr.split(':').map(Number);
  const [wEndHour, wEndMin] = workEndStr.split(':').map(Number);

  const workStart = new Date(now);
  workStart.setHours(wStartHour, wStartMin, 0, 0);

  const workEnd = new Date(now);
  workEnd.setHours(wEndHour, wEndMin, 0, 0);

  // 1. Separate completed, skipped, and cancelled tasks (historical blocks)
  const historicalTasks = tasks.filter(t => 
    t.status === 'completed' || t.status === 'skipped' || t.status === 'cancelled'
  );

  const historicalBlocks: TimelineBlock[] = historicalTasks.map(t => {
    const start = t.actualStart ? parseISO(t.actualStart) : (t.plannedStart ? parseISO(t.plannedStart) : now);
    const end = t.actualEnd ? parseISO(t.actualEnd) : (t.plannedEnd ? parseISO(t.plannedEnd) : addMinutes(start, t.estimatedDuration));
    return {
      id: `${t.id}-history`,
      taskId: t.id,
      title: t.title,
      start,
      end,
      duration: Math.max(1, differenceInMinutes(end, start)),
      isFixed: true,
      status: t.status,
      color: t.color,
      icon: t.icon,
      priority: t.priority,
      isSplit: false,
      task: t
    };
  });

  // 2. Identify fixed tasks for the day (rigid obstacles) that are NOT historical
  const activeFixedTasks = tasks.filter(t => 
    t.fixedTime && t.status !== 'completed' && t.status !== 'skipped' && t.status !== 'cancelled'
  );

  const fixedBlocks: TimelineBlock[] = activeFixedTasks.map(t => {
    const start = t.plannedStart ? parseISO(t.plannedStart) : workStart;
    const end = t.plannedEnd ? parseISO(t.plannedEnd) : addMinutes(start, t.estimatedDuration);
    return {
      id: `${t.id}-fixed`,
      taskId: t.id,
      title: t.title,
      start,
      end,
      duration: Math.max(1, differenceInMinutes(end, start)),
      isFixed: true,
      status: t.status,
      color: t.color,
      icon: t.icon,
      priority: t.priority,
      isSplit: false,
      task: t
    };
  });

  // Combine historical and active fixed blocks as "obstacles"
  const obstacles = [...historicalBlocks, ...fixedBlocks].sort((a, b) => a.start.getTime() - b.start.getTime());

  // 3. Get non-fixed, active/upcoming tasks (those that need to be dynamically scheduled)
  const dynamicTasks = tasks.filter(t => 
    !t.fixedTime && t.status !== 'completed' && t.status !== 'skipped' && t.status !== 'cancelled'
  ).sort((a, b) => a.sortOrder - b.sortOrder);

  const scheduledBlocks: TimelineBlock[] = [];

  // Determine starting point for dynamic scheduling
  // We schedule starting from 'now', or the start of the workday if 'now' is in the past, or the end of the last historical task
  let simTime = new Date(Math.max(now.getTime(), workStart.getTime()));

  // If there is a running task, we must handle it first. Let's find it.
  const runningTask = dynamicTasks.find(t => t.status === 'running');
  
  // Arrange dynamic tasks queue: running task first, then others
  const queue: { task: Task; isRunning: boolean }[] = [];
  if (runningTask) {
    queue.push({ task: runningTask, isRunning: true });
    dynamicTasks.filter(t => t.id !== runningTask.id).forEach(t => queue.push({ task: t, isRunning: false }));
  } else {
    dynamicTasks.forEach(t => queue.push({ task: t, isRunning: false }));
  }

  // Helper to check if simTime falls within any obstacle and advances it
  const advanceSimTimePastObstacles = () => {
    let advanced = true;
    while (advanced) {
      advanced = false;
      for (const obs of obstacles) {
        // If simulation time is inside an obstacle, jump to the end of it
        if (simTime >= obs.start && simTime < obs.end) {
          simTime = new Date(obs.end);
          advanced = true;
        }
      }
    }
  };

  for (const item of queue) {
    const t = item.task;
    
    // Remaining duration in minutes
    let remainingDuration = t.estimatedDuration;
    if (item.isRunning) {
      // Calculate remaining minutes from estimated duration minus actual duration spent so far
      const actualMinutes = t.actualDuration / 60;
      remainingDuration = Math.max(1, t.estimatedDuration - actualMinutes);
    }

    let taskBlocks: Omit<TimelineBlock, 'isSplit' | 'splitIndex' | 'totalSplits'>[] = [];

    // Loop to schedule this task (it might get split across multiple slots)
    while (remainingDuration > 0.01) {
      // Make sure we aren't starting inside an obstacle
      advanceSimTimePastObstacles();

      // Find the next obstacle starting after simTime
      const nextObstacle = obstacles.find(obs => obs.start > simTime);
      const potentialEnd = addMinutes(simTime, remainingDuration);

      if (nextObstacle && nextObstacle.start < potentialEnd) {
        // There is an overlap! Split the task.
        const availableMinutes = differenceInMinutes(nextObstacle.start, simTime);
        
        if (availableMinutes > 1) { // Only schedule a block if it's at least 1 minute
          taskBlocks.push({
            id: `${t.id}-split-${taskBlocks.length}`,
            taskId: t.id,
            title: t.title,
            start: new Date(simTime),
            end: new Date(nextObstacle.start),
            duration: availableMinutes,
            isFixed: false,
            status: t.status,
            color: t.color,
            icon: t.icon,
            priority: t.priority,
            task: t
          });
          remainingDuration -= availableMinutes;
        } else {
          // If the gap is less than a minute, just skip this small gap and start after the obstacle
        }
        
        // Move simulation cursor to the end of the obstacle
        simTime = new Date(nextObstacle.end);
      } else {
        // No overlapping obstacles. Schedule the remainder of the task.
        taskBlocks.push({
          id: `${t.id}-${taskBlocks.length === 0 ? 'full' : `split-${taskBlocks.length}`}`,
          taskId: t.id,
          title: t.title,
          start: new Date(simTime),
          end: new Date(potentialEnd),
          duration: remainingDuration,
          isFixed: false,
          status: t.status,
          color: t.color,
          icon: t.icon,
          priority: t.priority,
          task: t
        });
        simTime = new Date(potentialEnd);
        remainingDuration = 0;
      }
    }

    // Add splits information to the task blocks
    const totalSplits = taskBlocks.length;
    const isSplit = totalSplits > 1;

    taskBlocks.forEach((tb, index) => {
      scheduledBlocks.push({
        ...tb,
        isSplit,
        splitIndex: isSplit ? index + 1 : undefined,
        totalSplits: isSplit ? totalSplits : undefined
      });
    });
  }

  // Combine historical blocks, scheduled blocks, and remaining active fixed blocks
  // Note: we filter out duplicate entries for fixed tasks that might have been processed
  const allBlocks = [...historicalBlocks, ...fixedBlocks, ...scheduledBlocks]
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // Check if any block ends past the workEnd time
  const lastBlock = allBlocks.length > 0 
    ? allBlocks.reduce((latest, b) => b.end > latest.end ? b : latest, allBlocks[0])
    : null;
  const estimatedFinishTime = lastBlock ? lastBlock.end : null;
  const hasConflict = estimatedFinishTime ? isAfter(estimatedFinishTime, workEnd) : false;

  return {
    blocks: allBlocks,
    hasConflict,
    estimatedFinishTime
  };
}
