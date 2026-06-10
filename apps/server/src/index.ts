import express from 'express';
import cors from 'cors';
import { Database, WebhookLog } from './db';
import type { FocusSession, Task, StudentState, SyncAction } from '../../../packages/shared/types';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper logic for yesterday check (matching client implementation)
function isYesterday(dateStr: string, compareDateStr: string): boolean {
  const d1 = new Date(dateStr);
  const d2 = new Date(compareDateStr);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

// Formats a date into YYYY-MM-DD in the specified timezone
function getLocalDateString(dateStr: string | Date, timeZone: string): string {
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch (e) {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toISOString().split('T')[0];
  }
}

// Recalculates coins, focus minutes, and streaks based on canonical successful focus sessions
export function recalculateStudentState(
  sessions: FocusSession[],
  today: string,
  timeZone: string = 'UTC'
): StudentState {
  const successSessions = sessions.filter((s) => s.status === 'success');

  // 1. Calculate coins
  const coins = successSessions.reduce((sum, s) => sum + s.targetDuration, 0);

  // 2. Calculate today's focus minutes
  const todayFocusMinutes = successSessions
    .filter((s) => s.endedAt && getLocalDateString(s.endedAt, timeZone) === today)
    .reduce((sum, s) => sum + s.targetDuration, 0);

  // 3. Calculate streak (consecutive focus days going backwards from latest success date)
  const dates = Array.from(
    new Set(
      successSessions
        .map((s) => (s.endedAt ? getLocalDateString(s.endedAt, timeZone) : null))
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

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Reset Database to Seed Values
app.post('/api/reset', async (_req, res) => {
  try {
    const freshState = await Database.reset();
    res.json({ status: 'ok', message: 'Database reset successfully', state: freshState });
  } catch (error) {
    console.error('Reset database failed:', error);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// Get Configuration Webhook URL
app.get('/api/webhook-url', async (_req, res) => {
  try {
    const state = await Database.read();
    res.json({ url: state.n8nWebhookUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read database' });
  }
});

// Set Configuration Webhook URL
app.post('/api/webhook-url', async (req, res) => {
  try {
    const { url } = req.body;
    const state = await Database.read();
    state.n8nWebhookUrl = url;
    await Database.write(state);
    res.json({ status: 'ok', url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to write database' });
  }
});

// Get Webhook Execution Logs
app.get('/api/webhook-logs', async (_req, res) => {
  try {
    const state = await Database.read();
    res.json({ logs: state.n8nLogs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// Clear Webhook Execution Logs
app.delete('/api/webhook-logs', async (_req, res) => {
  try {
    const state = await Database.read();
    state.n8nLogs = [];
    await Database.write(state);
    res.json({ status: 'ok', message: 'Logs cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// Mock Webhook Notification Sink (Fired by n8n to log/demonstrate automation message outputs)
app.post('/api/notification-sink', async (req, res) => {
  console.log('📬 [Notification Sink Received]:', JSON.stringify(req.body, null, 2));
  res.json({ status: 'received' });
});

// Synchronize Client Actions & Conflicts Reconciler
app.post('/api/sync', async (req, res) => {
  try {
    const { clientId, clientActions, clientTasks, timezone } = req.body;
    const clientTimezone = timezone || 'UTC';
    const today = getLocalDateString(new Date(), clientTimezone);

    // Read current database state
    const state = await Database.read();

    const updatedTasks = { ...state.tasks };
    let updatedSessions = [...state.sessions];
    const updatedProcessedActionIds = { ...state.processedActionIds };
    const newWebhookLogs: WebhookLog[] = [];
    const syncedActionIds: string[] = [];

    // Order actions chronologically by creation timestamp to process updates in correct timeline sequence
    const actionsToProcess = (clientActions as SyncAction[]).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const action of actionsToProcess) {
      // Idempotency: Skip processing if the action's unique ID is already processed
      if (updatedProcessedActionIds[action.id]) {
        syncedActionIds.push(action.id);
        continue;
      }

      updatedProcessedActionIds[action.id] = true;
      syncedActionIds.push(action.id);

      switch (action.type) {
        case 'focus_session_complete': {
          const { session } = action.payload;
          const exists = updatedSessions.some((s) => s.id === session.id);

          if (!exists) {
            updatedSessions.push({ ...session, synced: true });

            // Temporarily calculate student state metrics for webhook
            const tempState = recalculateStudentState(updatedSessions, today, clientTimezone);

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

            const targetUrl = state.n8nWebhookUrl || 'http://localhost:5678/webhook-test/focus-complete';

            const logEntry: WebhookLog = {
              id: Math.random().toString(36).substring(7),
              timestamp: new Date().toISOString(),
              url: targetUrl,
              payload: webhookPayload,
              status: 'success',
            };

            newWebhookLogs.push(logEntry);

            // Fire real n8n Webhook asynchronously (non-blocking)
            if (state.n8nWebhookUrl) {
              fetch(state.n8nWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookPayload),
              }).catch((err) => {
                console.warn('⚠️ Webhook dispatch connection error:', err.message);
              });
            }
          } else {
            // Log Deduplication to demonstrate correct server-side idempotency
            const logEntry: WebhookLog = {
              id: Math.random().toString(36).substring(7),
              timestamp: new Date().toISOString(),
              url: state.n8nWebhookUrl || 'http://localhost:5678/webhook-test/focus-complete',
              payload: { sessionId: session.id },
              status: 'ignored',
              reason: 'Idempotency Block: Session ID already registered.',
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
          const dbTask = updatedTasks[taskId];

          if (dbTask) {
            if (version > dbTask.version) {
              // Newer client change: accept
              updatedTasks[taskId] = {
                ...dbTask,
                status: newStatus,
                version: version,
                updatedAt: action.timestamp,
              };
            } else if (version === dbTask.version) {
              // Concurrent clock conflict: precedence done > in_progress > not_started
              const precedence: Record<string, number> = { not_started: 1, in_progress: 2, done: 3 };
              const currentWeight = precedence[dbTask.status] || 0;
              const newWeight = precedence[newStatus] || 0;

              if (newWeight > currentWeight) {
                updatedTasks[taskId] = {
                  ...dbTask,
                  status: newStatus,
                  updatedAt: action.timestamp,
                };
              }
            }
          } else {
            // Task added on client while offline: create task on server
            updatedTasks[taskId] = {
              id: taskId,
              chapterId: action.payload.chapterId || 'unknown',
              title: action.payload.title || 'Custom Task',
              status: newStatus,
              updatedAt: action.timestamp,
              version: version,
              deleted: false,
            };
          }
          break;
        }

        case 'task_delete': {
          const { taskId, version } = action.payload;
          const dbTask = updatedTasks[taskId];

          if (dbTask) {
            if (version >= dbTask.version) {
              updatedTasks[taskId] = {
                ...dbTask,
                deleted: true,
                version: version,
                updatedAt: action.timestamp,
              };
            }
          }
          break;
        }
      }
    }

    // Seed any new/deleted tasks directly from client state that might not have actions
    if (clientTasks && Array.isArray(clientTasks)) {
      clientTasks.forEach((sub: any) => {
        sub.chapters?.forEach((ch: any) => {
          ch.tasks?.forEach((t: Task) => {
            if (!updatedTasks[t.id]) {
              updatedTasks[t.id] = { ...t };
            }
          });
        });
      });
    }

    // Finalize state calculations
    const finalStudentState = recalculateStudentState(updatedSessions, today, clientTimezone);

    // Save back to DB
    state.tasks = updatedTasks;
    state.sessions = updatedSessions;
    state.studentState = finalStudentState;
    state.processedActionIds = updatedProcessedActionIds;
    state.n8nLogs = [...state.n8nLogs, ...newWebhookLogs];

    await Database.write(state);

    res.json({
      syncedActionIds,
      canonicalTasks: updatedTasks,
      canonicalSessions: updatedSessions,
      canonicalStudentState: finalStudentState,
    });
  } catch (error) {
    console.error('Reconciliation sync error:', error);
    res.status(500).json({ error: 'Synchronization engine failed' });
  }
});

// Extension: Optional Two-Way Loop Webhook (Allowing WhatsApp notifications to hit the backend to snooze or complete tasks)
app.post('/api/webhook/whatsapp-reply', async (req, res) => {
  try {
    const { taskId, replyText } = req.body;
    if (!taskId || !replyText) {
      return res.status(400).json({ error: 'Missing taskId or replyText' });
    }

    const state = await Database.read();
    const dbTask = state.tasks[taskId];

    if (!dbTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const command = replyText.trim().toLowerCase();
    let updated = false;

    if (command === 'done' || command === 'complete') {
      dbTask.status = 'done';
      dbTask.version += 1;
      dbTask.updatedAt = new Date().toISOString();
      updated = true;
    } else if (command === 'snooze') {
      dbTask.status = 'in_progress';
      dbTask.version += 1;
      dbTask.updatedAt = new Date().toISOString();
      updated = true;
    }

    if (updated) {
      await Database.write(state);
      console.log(`💬 [Two-Way Loop Event]: Modified task ${taskId} via webhook payload to ${dbTask.status}`);
      return res.json({ status: 'ok', message: `Task status updated to ${dbTask.status}`, task: dbTask });
    }

    res.json({ status: 'ignored', message: 'Reply command unhandled' });
  } catch (error) {
    res.status(500).json({ error: 'Two-way loop engine failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Alcovia server running on http://localhost:${PORT}`);
});
