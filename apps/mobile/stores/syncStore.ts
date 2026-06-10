import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncAction, SyncActionType, ClientId, Subject, Chapter, Task } from '../../../packages/shared/types';
import { generateId } from '../utils/helpers';
import { useDeviceStore } from './deviceStore';
import { useServerStore } from './serverStore';

interface SyncState {
  // All sync actions across all clients
  actions: SyncAction[];

  // Actions
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
  sync: (clientId: ClientId) => Promise<void>;
}

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

        // Trigger automatic sync if online
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

      sync: async (clientId: ClientId) => {
        const { useFocusStore } = require('./focusStore');
        const { useSyllabusStore } = require('./syllabusStore');

        const { isOnline } = useDeviceStore.getState();
        if (!isOnline[clientId]) return;

        const pendingActions = get().getPendingActions(clientId);
        const clientTasks = useSyllabusStore.getState().subjects[clientId] || [];

        // Call server sync engine
        const result = useServerStore.getState().syncClient(clientId, pendingActions, clientTasks);

        // Mark local actions as synced
        result.syncedActionIds.forEach((id) => {
          get().markSynced(id);
        });

        // 1. Sync Focus Sessions & Student State
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

        // 2. Sync Syllabus Tasks
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

        // If the other device is online, sync it too to pull the latest state
        const otherClientId: ClientId = clientId === 'client-A' ? 'client-B' : 'client-A';
        if (isOnline[otherClientId]) {
          const otherPending = get().getPendingActions(otherClientId);
          const otherTasks = useSyllabusStore.getState().subjects[otherClientId] || [];

          const otherResult = useServerStore.getState().syncClient(otherClientId, otherPending, otherTasks);

          otherResult.syncedActionIds.forEach((id) => {
            get().markSynced(id);
          });

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
      },
    }),
    {
      name: 'alcovia-sync-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

