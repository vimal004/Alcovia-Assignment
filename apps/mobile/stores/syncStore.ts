import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncAction, SyncActionType, ClientId, Subject, Chapter, Task } from '../../../packages/shared/types';
import { generateId } from '../utils/helpers';
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
}

const SERVER_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';

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

        const { isOnline } = useDeviceStore.getState();
        if (!isOnline[clientId]) return;

        const pendingActions = get().getPendingActions(clientId);
        const clientTasks = useSyllabusStore.getState().subjects[clientId] || [];

        let timezone = 'UTC';
        try {
          timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        } catch (e) {
          // ignore timezone resolution failure
        }

        try {
          // Send actions to Express API
          const response = await fetch(`${SERVER_URL}/api/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId,
              clientActions: pendingActions,
              clientTasks,
              timezone,
            }),
          });

          if (!response.ok) {
            throw new Error(`Sync failed with status code ${response.status}`);
          }

          const result = await response.json();

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

          // 2. Sync Syllabus Tasks on client
          useSyllabusStore.setState((state: any) => {
            const clientSubjects = state.subjects[clientId] || [];
            const updatedSubjects = clientSubjects.map((sub: Subject) => ({
              ...sub,
              chapters: sub.chapters.map((ch: Chapter) => ({
                ...ch,
                tasks: ch.tasks.map((t: Task) => {
                  const canonicalTask = result.canonicalTasks[t.id];
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
        }
      },
    }),
    {
      name: 'alcovia-sync-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
