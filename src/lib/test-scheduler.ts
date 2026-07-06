import { calculateSchedule, Task } from './scheduler';
import { parseISO } from 'date-fns';

// Setup Mock Date: 2026-07-06 10:00:00
const now = new Date('2026-07-06T10:00:00Z');
const dateStr = '2026-07-06';

const mockTasks: Task[] = [
  // 1. A completed task in the past (9:00 - 9:45)
  {
    id: 'task-1',
    title: 'Completed Task',
    priority: 'medium',
    estimatedDuration: 45,
    actualDuration: 2700, // 45 mins in seconds
    plannedStart: '2026-07-06T09:00:00Z',
    plannedEnd: '2026-07-06T09:45:00Z',
    actualStart: '2026-07-06T09:00:00Z',
    actualEnd: '2026-07-06T09:45:00Z',
    tags: [],
    status: 'completed',
    fixedTime: false,
    color: '#000000',
    icon: 'Check',
    sortOrder: 1,
    date: dateStr
  },
  // 2. A running task (started at 9:45, estimated 30 mins, elapsed 15 mins (900s), should finish at 10:15)
  {
    id: 'task-2',
    title: 'Running Task',
    priority: 'high',
    estimatedDuration: 30,
    actualDuration: 900, // 15 mins elapsed
    plannedStart: '2026-07-06T09:45:00Z',
    plannedEnd: '2026-07-06T10:15:00Z',
    actualStart: '2026-07-06T09:45:00Z',
    actualEnd: null,
    tags: [],
    status: 'running',
    fixedTime: false,
    color: '#000000',
    icon: 'Play',
    sortOrder: 2,
    date: dateStr
  },
  // 3. A fixed event: Gym (11:00 - 12:00)
  {
    id: 'task-3',
    title: 'Gym Session',
    priority: 'high',
    estimatedDuration: 60,
    actualDuration: 0,
    plannedStart: '2026-07-06T11:00:00Z',
    plannedEnd: '2026-07-06T12:00:00Z',
    actualStart: null,
    actualEnd: null,
    tags: [],
    status: 'not_started',
    fixedTime: true,
    color: '#000000',
    icon: 'Gym',
    sortOrder: 3,
    date: dateStr
  },
  // 4. A dynamic task: Coding (estimated 90 mins, should start after running task at 10:15)
  // Since Gym starts at 11:00, Coding has 45 mins before Gym (10:15 - 11:00) and 45 mins after Gym (12:00 - 12:45)
  // It should be SPLIT!
  {
    id: 'task-4',
    title: 'Coding FlowTime',
    priority: 'high',
    estimatedDuration: 90,
    actualDuration: 0,
    plannedStart: null,
    plannedEnd: null,
    actualStart: null,
    actualEnd: null,
    tags: [],
    status: 'not_started',
    fixedTime: false,
    color: '#000000',
    icon: 'Code',
    sortOrder: 4,
    date: dateStr
  }
];

function runTests() {
  console.log('--- RUNNING SCHEDULER ENGINE TESTS ---');
  
  const result = calculateSchedule(mockTasks, dateStr, now, '09:00', '22:00');
  
  console.log(`Total Timeline Blocks generated: ${result.blocks.length}`);
  
  // Verify completed task is at 9:00 - 9:45
  const t1Block = result.blocks.find(b => b.taskId === 'task-1');
  console.log('Task 1 (Completed):', t1Block?.start.toISOString(), 'to', t1Block?.end.toISOString());
  if (t1Block && t1Block.start.toISOString() === '2026-07-06T09:00:00.000Z' && t1Block.end.toISOString() === '2026-07-06T09:45:00.000Z') {
    console.log('✅ Task 1 correctly historical.');
  } else {
    console.error('❌ Task 1 historical check failed.');
  }

  // Verify running task runs from 10:00 (now) to 10:15 (since it has 15 mins remaining of its 30 min estimate)
  // Wait, let's verify if the running task start in calculation is `now` or its `actualStart` (if actualStart is in the past, its block should start from actualStart to show the whole block, but we schedule remaining starting from now).
  // In our engine, we sorted:
  // - Completed/historical tasks are kept at their past times.
  // - The running task has its remaining duration scheduled starting at `now`.
  // - Wait, in the historical blocks, we only added completed/skipped/cancelled tasks.
  // - In scheduledBlocks, we scheduled the running task from `now` to `now + remaining`.
  // - So the block for the running task starts at 10:00 (now) and ends at 10:15.
  const t2Block = result.blocks.find(b => b.taskId === 'task-2');
  console.log('Task 2 (Running):', t2Block?.start.toISOString(), 'to', t2Block?.end.toISOString());
  if (t2Block && t2Block.start.toISOString() === '2026-07-06T10:00:00.000Z' && t2Block.end.toISOString() === '2026-07-06T10:15:00.000Z') {
    console.log('✅ Task 2 correctly scheduled from now until remaining duration ends.');
  } else {
    console.error('❌ Task 2 running calculation failed.');
  }

  // Verify Gym is fixed at 11:00 - 12:00
  const gymBlock = result.blocks.find(b => b.taskId === 'task-3');
  console.log('Gym Block:', gymBlock?.start.toISOString(), 'to', gymBlock?.end.toISOString());
  if (gymBlock && gymBlock.start.toISOString() === '2026-07-06T11:00:00.000Z' && gymBlock.end.toISOString() === '2026-07-06T12:00:00.000Z') {
    console.log('✅ Gym correctly anchored.');
  } else {
    console.error('❌ Gym anchor check failed.');
  }

  // Verify Coding (Task 4) is split:
  // - Split 1: 10:15 to 11:00 (45 mins)
  // - Gym: 11:00 to 12:00 (obstacle)
  // - Split 2: 12:00 to 12:45 (45 mins)
  const codingBlocks = result.blocks.filter(b => b.taskId === 'task-4');
  console.log(`Coding Split Count: ${codingBlocks.length}`);
  
  if (codingBlocks.length === 2) {
    const [c1, c2] = codingBlocks;
    console.log('Coding Split 1:', c1.start.toISOString(), 'to', c1.end.toISOString());
    console.log('Coding Split 2:', c2.start.toISOString(), 'to', c2.end.toISOString());
    
    const c1Ok = c1.start.toISOString() === '2026-07-06T10:15:00.000Z' && c1.end.toISOString() === '2026-07-06T11:00:00.000Z';
    const c2Ok = c2.start.toISOString() === '2026-07-06T12:00:00.000Z' && c2.end.toISOString() === '2026-07-06T12:45:00.000Z';
    
    if (c1Ok && c2Ok && c1.isSplit && c2.isSplit && c1.splitIndex === 1 && c2.splitIndex === 2) {
      console.log('✅ Coding task correctly split and flows around Gym fixed obstacle!');
    } else {
      console.error('❌ Coding task split details mismatch.');
    }
  } else {
    console.error('❌ Coding task was not split correctly into 2 parts.');
  }

  console.log('Estimated Finish Time:', result.estimatedFinishTime?.toISOString());
  console.log('Workday Conflict:', result.hasConflict);
  console.log('--- TESTS FINISHED ---');
}

runTests();
