import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncAction, SyncActionType } from '../../packages/shared/types';
import { generateId } from '../utils/helpers';

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
    }),
    {
      name: 'alcovia-sync-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
