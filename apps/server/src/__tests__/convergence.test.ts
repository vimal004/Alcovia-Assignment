/**
 * Extension 7: Convergence Property / Fuzz Test
 *
 * This test verifies that the server-side conflict resolution engine is
 * CONVERGENT \u2014 meaning that any permutation of the same set of offline
 * actions always produces the same final canonical task state.
 *
 * This is the key safety property of a CRDT-like sync system:
 *   forall orderings O of actions A: merge(O) == merge(reverse(O)) == merge(shuffle(O))
 *
 * Run with: npx ts-node --project tsconfig.json src/__tests__/convergence.test.ts
 * Or: node -e "require('./dist/__tests__/convergence.test.js')"
 */

import assert from 'assert';

// -----------------------------------------------------------------------
// Inline minimal conflict resolution logic (mirrors apps/server/src/index.ts)
// We inline this so the test is self-contained and doesn\u2019t need the full Express
// server running. If the server logic changes, this must be updated too.
// -----------------------------------------------------------------------

type TaskStatus = 'not_started' | 'in_progress' | 'done';

interface Task {
  id: string;
  chapterId: string;
  title: string;
  status: TaskStatus;
  updatedAt: string;
  version: number;
  deleted: boolean;
}

interface SyncAction {
  id: string;
  type: 'task_status_change' | 'task_delete';
  timestamp: string;
  payload: any;
}

function applyActions(
  initialTasks: Record<string, Task>,
  actions: SyncAction[]
): Record<string, Task> {
  const tasks = JSON.parse(JSON.stringify(initialTasks)) as Record<string, Task>;
  const processed = new Set<string>();

  const sorted = [...actions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const action of sorted) {
    if (processed.has(action.id)) continue;
    processed.add(action.id);

    if (action.type === 'task_status_change') {
      const { taskId, newStatus, version } = action.payload;
      const task = tasks[taskId];
      if (!task) continue;

      if (version > task.version) {
        tasks[taskId] = { ...task, status: newStatus, version, updatedAt: action.timestamp };
      } else if (version === task.version) {
        // Concurrent edit: apply precedence rule
        const precedence: Record<string, number> = { not_started: 1, in_progress: 2, done: 3 };
        if ((precedence[newStatus] || 0) > (precedence[task.status] || 0)) {
          tasks[taskId] = { ...task, status: newStatus, updatedAt: action.timestamp };
        }
      }
    } else if (action.type === 'task_delete') {
      const { taskId, version } = action.payload;
      const task = tasks[taskId];
      if (!task) continue;
      if (version >= task.version) {
        tasks[taskId] = { ...task, deleted: true, version, updatedAt: action.timestamp };
      }
    }
  }

  return tasks;
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeTask(id: string): Task {
  return {
    id,
    chapterId: 'ch-math-1',
    title: `Task ${id}`,
    status: 'not_started',
    updatedAt: new Date(2024, 0, 1).toISOString(),
    version: 0,
    deleted: false,
  };
}

function makeAction(
  type: SyncAction['type'],
  taskId: string,
  version: number,
  status: TaskStatus,
  offsetMs: number
): SyncAction {
  return {
    id: `action-${taskId}-${type}-${version}-${offsetMs}`,
    type,
    timestamp: new Date(Date.now() + offsetMs).toISOString(),
    payload: type === 'task_delete'
      ? { taskId, version }
      : { taskId, newStatus: status, version },
  };
}

// -----------------------------------------------------------------------
// Fuzz Convergence Test
// -----------------------------------------------------------------------

function runConvergenceTest(iterations: number, seed: number = Date.now()): void {
  console.log(`\n\u2699\ufe0f  [FuzzTest] Running ${iterations} convergence iterations (seed baseline: ${seed})\n`);

  const TASK_IDS = ['task-m1-1', 'task-m1-2', 'task-m2-1', 'task-p1-1', 'task-c1-1'];
  const STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'done'];
  let failures = 0;

  for (let i = 0; i < iterations; i++) {
    // Build a fresh initial task set
    const initialTasks: Record<string, Task> = {};
    TASK_IDS.forEach((id) => { initialTasks[id] = makeTask(id); });

    // Generate 5\u201315 random actions across 2\u20133 simulated devices
    const numActions = 5 + Math.floor(Math.random() * 11);
    const actions: SyncAction[] = [];

    for (let j = 0; j < numActions; j++) {
      const taskId = randomChoice(TASK_IDS);
      const version = 1 + Math.floor(Math.random() * 3);
      const status = randomChoice(STATUSES);
      const type: SyncAction['type'] = Math.random() < 0.2 ? 'task_delete' : 'task_status_change';
      // Timestamps spread over 10 seconds to create realistic ordering scenarios
      const offsetMs = Math.floor(Math.random() * 10000);
      actions.push(makeAction(type, taskId, version, status, offsetMs));
    }

    // Apply the same actions in 3 different orderings and assert convergence
    const result1 = applyActions(initialTasks, actions);
    const result2 = applyActions(initialTasks, shuffleArray(actions));
    const result3 = applyActions(initialTasks, [...actions].reverse());

    for (const taskId of TASK_IDS) {
      try {
        // Final status and deleted flag must converge regardless of ordering
        assert.strictEqual(
          result1[taskId].status,
          result2[taskId].status,
          `[Iteration ${i}] Task ${taskId} status diverged: ${result1[taskId].status} vs ${result2[taskId].status}`
        );
        assert.strictEqual(
          result1[taskId].status,
          result3[taskId].status,
          `[Iteration ${i}] Task ${taskId} status diverged (reversed): ${result1[taskId].status} vs ${result3[taskId].status}`
        );
        assert.strictEqual(
          result1[taskId].deleted,
          result2[taskId].deleted,
          `[Iteration ${i}] Task ${taskId} deleted flag diverged`
        );
        assert.strictEqual(
          result1[taskId].deleted,
          result3[taskId].deleted,
          `[Iteration ${i}] Task ${taskId} deleted flag diverged (reversed)`
        );
      } catch (err: any) {
        console.error('\u274c CONVERGENCE FAILURE:', err.message);
        console.error('   Actions:', JSON.stringify(actions, null, 2));
        failures++;
      }
    }

    if ((i + 1) % 20 === 0) {
      console.log(`   \u2705 Completed ${i + 1}/${iterations} iterations, ${failures} failures so far`);
    }
  }

  if (failures === 0) {
    console.log(`\n\u2705 All ${iterations} iterations converged correctly. Conflict resolution is deterministic.\n`);
  } else {
    console.error(`\n\u274c ${failures} convergence failures detected across ${iterations} iterations.\n`);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------
// Additional property: Idempotency test
// Applying the same action set twice must produce the same result as once
// -----------------------------------------------------------------------

function runIdempotencyTest(iterations: number): void {
  console.log(`\u2699\ufe0f  [IdempotencyTest] Running ${iterations} idempotency iterations\n`);

  const TASK_IDS = ['task-m1-1', 'task-m1-2', 'task-p1-1'];
  let failures = 0;

  for (let i = 0; i < iterations; i++) {
    const initialTasks: Record<string, Task> = {};
    TASK_IDS.forEach((id) => { initialTasks[id] = makeTask(id); });

    const numActions = 3 + Math.floor(Math.random() * 8);
    const actions: SyncAction[] = [];

    for (let j = 0; j < numActions; j++) {
      const taskId = randomChoice(TASK_IDS);
      const version = 1 + Math.floor(Math.random() * 3);
      const status = randomChoice(['not_started', 'in_progress', 'done'] as TaskStatus[]);
      actions.push(makeAction('task_status_change', taskId, version, status, j * 100));
    }

    // Apply once vs apply same set twice (simulating a retry / double-submit)
    const resultOnce = applyActions(initialTasks, actions);
    const resultTwice = applyActions(initialTasks, [...actions, ...actions]);

    for (const taskId of TASK_IDS) {
      try {
        assert.strictEqual(
          resultOnce[taskId].status,
          resultTwice[taskId].status,
          `[Idempotency Iter ${i}] Task ${taskId} status changed on double-apply: ${resultOnce[taskId].status} vs ${resultTwice[taskId].status}`
        );
      } catch (err: any) {
        console.error('\u274c IDEMPOTENCY FAILURE:', err.message);
        failures++;
      }
    }
  }

  if (failures === 0) {
    console.log(`\u2705 All ${iterations} idempotency iterations passed. Duplicate action submission is safe.\n`);
  } else {
    console.error(`\u274c ${failures} idempotency failures detected.\n`);
    process.exit(1);
  }
}

// Run tests
runConvergenceTest(100);
runIdempotencyTest(50);
