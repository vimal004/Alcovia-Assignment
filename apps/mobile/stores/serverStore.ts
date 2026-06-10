import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FocusSession, Task, StudentState, SyncAction, ClientId, Subject, Chapter } from '../../../packages/shared/types';
import { generateSeedData } from '../utils/seedData';
import { getTodayDate, generateId } from '../utils/helpers';

export interface WebhookLog {
  id: string;
  timestamp: string;
  url: string;
  payload: any;
  status: 'success' | 'ignored';
  reason?: string;
}

interface ServerState {
  // Canonical Database
  tasks: Record<string, Task>;               // taskId -> Task
  sessions: FocusSession[];                  // All sessions
  studentState: StudentState;                // Recalculated state
  processedActionIds: Record<string, boolean>; // actionId -> true (idempotency)

  // Webhook Console (n8n simulator)
  n8nWebhookUrl: string;
  n8nLogs: WebhookLog[];

  // Actions
  setN8nWebhookUrl: (url: string) => void;
  clearWebhookLogs: () => void;
  syncClient: (clientId: ClientId, clientActions: SyncAction[], clientTasks: Subject[]) => {
    syncedActionIds: string[];
    canonicalTasks: Record<string, Task>;
    canonicalSessions: FocusSession[];
    canonicalStudentState: StudentState;
  };
  resetServer: () => void;
}

const getInitialTasks = (): Record<string, Task> => {
  const tasks: Record<string, Task> = {};
  generateSeedData().forEach((sub: Subject) => {
    sub.chapters.forEach((ch: Chapter) => {
      ch.tasks.forEach((t: Task) => {
        tasks[t.id] = { ...t };
      });
    });
  });
  return tasks;
};

const defaultStudentState = (today: string): StudentState => ({
  studentId: 'student-001',
  coins: 0,
  streak: 0,
  lastStreakDate: null,
  todayFocusMinutes: 0,
  todayDate: today,
});

function isYesterday(dateStr: string, compareDateStr: string): boolean {
  const d1 = new Date(dateStr);
  const d2 = new Date(compareDateStr);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

export function recalculateStudentState(sessions: FocusSession[], today: string): StudentState {
  const successSessions = sessions.filter((s) => s.status === 'success');

  // 1. Calculate coins
  const coins = successSessions.reduce((sum, s) => sum + s.targetDuration, 0);

  // 2. Calculate today's focus minutes
  const todayFocusMinutes = successSessions
    .filter((s) => s.endedAt && s.endedAt.split('T')[0] === today)
    .reduce((sum, s) => sum + s.targetDuration, 0);

  // 3. Calculate streak (consecutive focus days going backwards from latest success date)
  const dates = Array.from(
    new Set(
      successSessions
        .map((s) => (s.endedAt ? s.endedAt.split('T')[0] : null))
        .filter((d): d is string => d !== null)
    )
  ).sort();

  let streak = 0;
  let lastStreakDate: string | null = null;

  if (dates.length > 0) {
    const latestDateStr = dates[dates.length - 1];

    if (latestDateStr === today || isYesterday(latestDateStr, today)) {
      streak = 1;
      lastStreakDate = latestDateStr;

      let currentDateStr = latestDateStr;
      for (let i = dates.length - 2; i >= 0; i--) {
        const prevDateStr = dates[i];
        if (isYesterday(prevDateStr, currentDateStr)) {
          streak++;
          currentDateStr = prevDateStr;
        } else if (prevDateStr === currentDateStr) {
          continue;
        } else {
          break;
        }
      }
    }
  }

  return {
    studentId: 'student-001',
    coins,
    streak,
    lastStreakDate,
    todayFocusMinutes,
    todayDate: today,
  };
}

export const useServerStore = create<ServerState>()(
  persist(
    (set, get) => ({
      tasks: getInitialTasks(),
      sessions: [],
      studentState: defaultStudentState(getTodayDate()),
      processedActionIds: {},
      n8nWebhookUrl: '',
      n8nLogs: [],

      setN8nWebhookUrl: (url) => set({ n8nWebhookUrl: url }),

      clearWebhookLogs: () => set({ n8nLogs: [] }),

      resetServer: () =>
        set({
          tasks: getInitialTasks(),
          sessions: [],
          studentState: defaultStudentState(getTodayDate()),
          processedActionIds: {},
          n8nLogs: [],
        }),

      syncClient: (clientId, clientActions, clientTasks) => {
        const today = getTodayDate();
        const serverState = get();

        const updatedTasks = { ...serverState.tasks };
        let updatedSessions = [...serverState.sessions];
        const updatedProcessedActionIds = { ...serverState.processedActionIds };
        const newWebhookLogs: WebhookLog[] = [];
        const syncedActionIds: string[] = [];

        // Seed any client tasks not currently known to server (just in case)
        clientTasks.forEach((sub: Subject) => {
          sub.chapters.forEach((ch: Chapter) => {
            ch.tasks.forEach((t: Task) => {
              if (!updatedTasks[t.id]) {
                updatedTasks[t.id] = { ...t };
              }
            });
          });
        });

        // Sort client actions by timestamp to process in order of execution
        const actionsToProcess = [...clientActions].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        actionsToProcess.forEach((action) => {
          // Idempotency: skip if this specific action ID was already processed
          if (updatedProcessedActionIds[action.id]) {
            syncedActionIds.push(action.id);
            return;
          }

          updatedProcessedActionIds[action.id] = true;
          syncedActionIds.push(action.id);

          switch (action.type) {
            case 'focus_session_complete': {
              const { session } = action.payload;
              const exists = updatedSessions.some((s) => s.id === session.id);

              if (!exists) {
                updatedSessions.push({ ...session, synced: true });

                // Recalculate streak/coins temporarily to obtain state for the webhook log
                const tempState = recalculateStudentState(updatedSessions, today);

                // Construct webhook payload
                const webhookPayload = {
                  eventId: session.id,
                  studentId: 'student-001',
                  session: {
                    id: session.id,
                    targetDuration: session.targetDuration,
                    endedAt: session.endedAt,
                  },
                  streak: tempState.streak,
                  coinsAwarded: session.targetDuration,
                  totalCoins: tempState.coins,
                  message: `Streak now ${tempState.streak} days, +${session.targetDuration} coins.`,
                };

                const logEntry: WebhookLog = {
                  id: generateId(),
                  timestamp: new Date().toISOString(),
                  url: serverState.n8nWebhookUrl || 'http://localhost:5678/webhook-test/focus-complete',
                  payload: webhookPayload,
                  status: 'success',
                };

                newWebhookLogs.push(logEntry);

                // If a real n8n webhook URL is set, fire it in the background asynchronously
                if (serverState.n8nWebhookUrl) {
                  fetch(serverState.n8nWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(webhookPayload),
                  }).catch((err) => {
                    console.warn('Real Webhook dispatch failed (Network Error):', err);
                  });
                }
              } else {
                // Duplicate focus session: skip rewards and log the deduplication
                const logEntry: WebhookLog = {
                  id: generateId(),
                  timestamp: new Date().toISOString(),
                  url: serverState.n8nWebhookUrl || 'http://localhost:5678/webhook-test/focus-complete',
                  payload: { sessionId: session.id },
                  status: 'ignored',
                  reason: 'Idempotent Filter: Session ID already registered.',
                };
                newWebhookLogs.push(logEntry);
              }
              break;
            }

            case 'focus_session_fail': {
              const { session } = action.payload;
              const exists = updatedSessions.some((s) => s.id === session.id);
              if (!exists) {
                updatedSessions.push({ ...session, synced: true });
              }
              break;
            }

            case 'task_status_change': {
              const { taskId, newStatus, version } = action.payload;
              const serverTask = updatedTasks[taskId];

              if (serverTask) {
                if (version > serverTask.version) {
                  // Client has a newer version: accept
                  updatedTasks[taskId] = {
                    ...serverTask,
                    status: newStatus,
                    version: version,
                    updatedAt: action.timestamp,
                  };
                } else if (version === serverTask.version) {
                  // Version conflict! Resolve deterministically
                  // Order: deleted wins, then done > in_progress > not_started
                  const precedence: Record<string, number> = { not_started: 1, in_progress: 2, done: 3 };
                  const currentWeight = precedence[serverTask.status] || 0;
                  const newWeight = precedence[newStatus] || 0;

                  if (newWeight > currentWeight) {
                    updatedTasks[taskId] = {
                      ...serverTask,
                      status: newStatus,
                      updatedAt: action.timestamp,
                    };
                  }
                  // If weights are equal or new status has lower priority, server status wins (do nothing)
                }
                // If version < serverTask.version, server version is strictly newer (do nothing)
              }
              break;
            }

            case 'task_delete': {
              const { taskId, version } = action.payload;
              const serverTask = updatedTasks[taskId];

              if (serverTask) {
                if (version >= serverTask.version) {
                  updatedTasks[taskId] = {
                    ...serverTask,
                    deleted: true,
                    version: version,
                    updatedAt: action.timestamp,
                  };
                }
              }
              break;
            }
          }
        });

        // Recalculate final student state based on finalized canonical sessions
        const finalStudentState = recalculateStudentState(updatedSessions, today);

        // Update server store
        set((state) => ({
          tasks: updatedTasks,
          sessions: updatedSessions,
          studentState: finalStudentState,
          processedActionIds: updatedProcessedActionIds,
          n8nLogs: [...state.n8nLogs, ...newWebhookLogs],
        }));

        return {
          syncedActionIds,
          canonicalTasks: updatedTasks,
          canonicalSessions: updatedSessions,
          canonicalStudentState: finalStudentState,
        };
      },
    }),
    {
      name: 'alcovia-server-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
