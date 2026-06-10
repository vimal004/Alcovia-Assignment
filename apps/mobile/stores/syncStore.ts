import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncAction, SyncActionType, ClientId, Subject, Chapter, Task } from '../../../packages/shared/types';
import { generateId, getPartitionedStorageName } from '../utils/helpers';
import { useDeviceStore } from './deviceStore';
import { useServerStore } from './serverStore';
import { Platform } from 'react-native';

interface SyncState {
  actions: SyncAction[];

  addAction: (params: {
    clientId: string;
    studentId: string;
    type: SyncActionType;
    payload: any;
  }) => void;
  getClientActions: (clientId: string) => SyncAction[];
  getPendingActions: (clientId: string) => SyncAction[];
  markSynced: (actionId: string) => void;
  clearActions: (clientId: string) => void;
  pruneSyncedActions: () => void;
  sync: (clientId: ClientId) => Promise<void>;
  // Extension 1: Two-way loop — poll server for out-of-band mutations
  pollPendingMutations: (clientId: ClientId) => Promise<void>;
}

const SERVER_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';

// Extension 5: Retry backoff state (per-client, not persisted — reset on app restart)
const retryTimeouts: Partial<Record<ClientId, ReturnType<typeof setTimeout>>> = {};
const RETRY_DELAYS_MS = [2000, 4000, 8000]; // exponential backoff delays
const retryAttempts: Partial<Record<ClientId, number>> = {};


export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      actions: [],

      addAction: ({ clientId, studentId, type, payload }) => {
        const action: SyncAction = {
          id: generateId(),
          clientId,
          studentId,
          type,
          payload,
          timestamp: new Date().toISOString(),
          version: 1,
          synced: false,
        };

        set((state) => ({
          actions: [...state.actions, action],
        }));

        const { isOnline } = useDeviceStore.getState();
        if (isOnline[clientId as ClientId]) {
          get().sync(clientId as ClientId);
        }
      },

      getClientActions: (clientId: string) => {
        return get().actions.filter((a) => a.clientId === clientId);
      },

      getPendingActions: (clientId: string) => {
        return get().actions.filter((a) => a.clientId === clientId && !a.synced);
      },

      markSynced: (actionId: string) => {
        set((state) => ({
          actions: state.actions.map((a) =>
            a.id === actionId ? { ...a, synced: true } : a
          ),
        }));
      },

      clearActions: (clientId: string) => {
        set((state) => ({
          actions: state.actions.filter((a) => a.clientId !== clientId),
        }));
      },

      pruneSyncedActions: () => {
        const threshold = new Date();
        threshold.setHours(threshold.getHours() - 24); // Keep synced actions for 24 hours for debug logs in devpanel

        set((state) => ({
          actions: state.actions.filter(
            (a) => !a.synced || new Date(a.timestamp).getTime() > threshold.getTime()
          ),
        }));
      },

      sync: async (clientId: ClientId) => {
        const { useFocusStore } = require('./focusStore');
        const { useSyllabusStore } = require('./syllabusStore');

        const { isOnline, packetLoss, latencyMs, lastSyncedAt, setLastSyncedAt } = useDeviceStore.getState();
        if (!isOnline[clientId]) return;

        // Extension 5: Cancel any pending retry for this client (manual sync supersedes)
        if (retryTimeouts[clientId]) {
          clearTimeout(retryTimeouts[clientId]);
          delete retryTimeouts[clientId];
        }

        const pendingActions = get().getPendingActions(clientId);
        const clientTasks = useSyllabusStore.getState().subjects[clientId] || [];

        let timezone = 'UTC';
        try {
          timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        } catch (e) {
          // ignore timezone resolution failure
        }

        try {
          if (packetLoss) {
            throw new Error('Simulated network packet loss - connection failed.');
          }

          if (latencyMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, latencyMs));
          }

          // Extension 6: Delta sync — send lastSyncedAt so server returns only changed tasks
          const clientLastSyncedAt = lastSyncedAt?.[clientId] ?? null;

          // Send actions to Express API
          const response = await fetch(`${SERVER_URL}/api/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId,
              clientActions: pendingActions,
              clientTasks,
              timezone,
              lastSyncedAt: clientLastSyncedAt, // Extension 6: delta sync
            }),
          });

          if (!response.ok) {
            throw new Error(`Sync failed with status code ${response.status}`);
          }

          const result = await response.json();

          // Extension 5: Successful sync — reset retry counter
          delete retryAttempts[clientId];

          // Extension 6: Record successful sync timestamp for delta sync on next call
          setLastSyncedAt(clientId, new Date().toISOString());

          // Mark local actions as synced based on what the server processed successfully
          result.syncedActionIds.forEach((id: string) => {
            get().markSynced(id);
          });

          // Prune old synced actions from local storage to prevent memory bloat
          get().pruneSyncedActions();

          // 1. Sync Focus Sessions & Student State on client
          useFocusStore.setState((state: any) => ({
            sessions: {
              ...state.sessions,
              [clientId]: result.canonicalSessions,
            },
            studentState: {
              ...state.studentState,
              [clientId]: result.canonicalStudentState,
            },
          }));

          // 2. Extension 6: Merge delta task changes instead of replacing full state
          useSyllabusStore.setState((state: any) => {
            const clientSubjects = state.subjects[clientId] || [];
            // changedTasks contains only tasks modified since lastSyncedAt (delta)
            // canonicalTasks is full set (fallback on first sync)
            const taskPatch: Record<string, Task> = result.changedTasks || result.canonicalTasks || {};
            const updatedSubjects = clientSubjects.map((sub: Subject) => ({
              ...sub,
              chapters: sub.chapters.map((ch: Chapter) => ({
                ...ch,
                tasks: ch.tasks.map((t: Task) => {
                  const canonicalTask = taskPatch[t.id];
                  return canonicalTask ? { ...canonicalTask } : t;
                }),
              })),
            }));

            return {
              subjects: {
                ...state.subjects,
                [clientId]: updatedSubjects,
              },
            };
          });

          // 3. Update local copy of Server State Cache for Dev Panel Grid render
          useServerStore.setState({
            tasks: result.canonicalTasks,
            sessions: result.canonicalSessions,
            studentState: result.canonicalStudentState,
          });

          // Refresh log console
          await useServerStore.getState().fetchServerState();

          // If the other device is online, trigger a sync for it as well to pull down latest merged state
          const otherClientId: ClientId = clientId === 'client-A' ? 'client-B' : 'client-A';
          if (isOnline[otherClientId]) {
            const otherPending = get().getPendingActions(otherClientId);
            const otherTasks = useSyllabusStore.getState().subjects[otherClientId] || [];

            const otherResponse = await fetch(`${SERVER_URL}/api/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientId: otherClientId,
                clientActions: otherPending,
                clientTasks: otherTasks,
                timezone,
              }),
            });

            if (otherResponse.ok) {
              const otherResult = await otherResponse.json();

              otherResult.syncedActionIds.forEach((id: string) => {
                get().markSynced(id);
              });

              // Prune actions on the other client as well
              get().pruneSyncedActions();

              useFocusStore.setState((state: any) => ({
                sessions: {
                  ...state.sessions,
                  [otherClientId]: otherResult.canonicalSessions,
                },
                studentState: {
                  ...state.studentState,
                  [otherClientId]: otherResult.canonicalStudentState,
                },
              }));

              useSyllabusStore.setState((state: any) => {
                const otherSubjects = state.subjects[otherClientId] || [];
                const updatedOtherSubjects = otherSubjects.map((sub: Subject) => ({
                  ...sub,
                  chapters: sub.chapters.map((ch: Chapter) => ({
                    ...ch,
                    tasks: ch.tasks.map((t: Task) => {
                      const canonicalTask = otherResult.canonicalTasks[t.id];
                      return canonicalTask ? { ...canonicalTask } : t;
                    }),
                  })),
                }));

                return {
                  subjects: {
                    ...state.subjects,
                    [otherClientId]: updatedOtherSubjects,
                  },
                };
              });
            }
          }
        } catch (error) {
          console.warn(`Sync failed for ${clientId} (Offline/Network Error). Resumes safely later:`, error);

          // Extension 5: Exponential backoff retry
          // Schedule a retry at 2s -> 4s -> 8s. After 3 attempts, stop and wait
          // for user action (next online toggle or explicit sync call).
          const attempt = retryAttempts[clientId] ?? 0;
          if (attempt < RETRY_DELAYS_MS.length) {
            const delay = RETRY_DELAYS_MS[attempt];
            retryAttempts[clientId] = attempt + 1;
            console.log(`[RetryBackoff] Scheduling retry ${attempt + 1}/${RETRY_DELAYS_MS.length} for ${clientId} in ${delay}ms`);
            retryTimeouts[clientId] = setTimeout(() => {
              const { isOnline } = useDeviceStore.getState();
              if (isOnline[clientId]) {
                get().sync(clientId);
              }
            }, delay);
          } else {
            console.warn(`[RetryBackoff] Max retries reached for ${clientId}. Will retry on next manual sync.`);
            delete retryAttempts[clientId];
          }
        }
      },

      // Extension 1: Two-Way Loop — Poll for Server-Initiated Mutations
      // When a WhatsApp reply (or any out-of-band event) triggers the
      // /api/webhook/whatsapp-reply endpoint, the server mutates task state
      // directly in the DB. Clients won’t see these changes unless they either
      // run a full sync or poll this lightweight endpoint.
      //
      // This is a pull-based approach to the two-way loop:
      // Instead of SSE (which requires persistent connections), clients poll
      // /api/pending-mutations every 30s while online and trigger a sync if
      // any tasks have changed since their last sync. Lightweight and offline-safe.
      pollPendingMutations: async (clientId: ClientId) => {
        const { isOnline, lastSyncedAt } = useDeviceStore.getState();
        if (!isOnline[clientId]) return;

        try {
          const since = lastSyncedAt?.[clientId];
          const url = since
            ? `${SERVER_URL}/api/pending-mutations?since=${encodeURIComponent(since)}`
            : `${SERVER_URL}/api/pending-mutations`;

          const response = await fetch(url);
          if (!response.ok) return;

          const { hasMutations, mutatedTasks } = await response.json();

          if (hasMutations || (mutatedTasks && mutatedTasks.length > 0)) {
            // Server has new mutations not yet seen by this client — trigger a sync
            console.log(`[TwoWayLoop] Detected server-side state mutation for ${clientId}. Triggering sync.`);
            get().sync(clientId);
          }
        } catch (err) {
          // Polling errors are non-fatal — next poll will retry
          console.warn('[TwoWayLoop] Poll failed (non-fatal):', err);
        }
      },
    }),
    {
      name: getPartitionedStorageName('alcovia-sync-store'),
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
