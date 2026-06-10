import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FocusSession, Task, StudentState, SyncAction, ClientId, Subject } from '../../../packages/shared/types';

export interface WebhookLog {
  id: string;
  timestamp: string;
  url: string;
  payload: any;
  status: 'success' | 'ignored';
  reason?: string;
}

interface ServerState {
  // Local cache of server state for the Dev Panel Simulation Grid
  tasks: Record<string, Task>;
  sessions: FocusSession[];
  studentState: StudentState;
  n8nWebhookUrl: string;
  n8nLogs: WebhookLog[];

  // Actions connecting to Express API
  fetchServerState: () => Promise<void>;
  setN8nWebhookUrl: (url: string) => Promise<void>;
  clearWebhookLogs: () => Promise<void>;
  resetServer: () => Promise<void>;
}

const SERVER_URL = 'http://localhost:3001';

const defaultStudentState = (): StudentState => ({
  studentId: 'student-001',
  coins: 0,
  streak: 0,
  lastStreakDate: null,
  todayFocusMinutes: 0,
  todayDate: new Date().toISOString().split('T')[0],
});

export const useServerStore = create<ServerState>()(
  persist(
    (set, get) => ({
      tasks: {},
      sessions: [],
      studentState: defaultStudentState(),
      n8nWebhookUrl: '',
      n8nLogs: [],

      fetchServerState: async () => {
        try {
          const resLogs = await fetch(`${SERVER_URL}/api/webhook-logs`);
          const logsData = await resLogs.json();
          
          const resUrl = await fetch(`${SERVER_URL}/api/webhook-url`);
          const urlData = await resUrl.json();

          // We also get the current server state details during sync, but we fetch logs and config url here
          set({
            n8nLogs: logsData.logs || [],
            n8nWebhookUrl: urlData.url || '',
          });
        } catch (error) {
          console.warn('Failed to fetch server state:', error);
        }
      },

      setN8nWebhookUrl: async (url) => {
        try {
          await fetch(`${SERVER_URL}/api/webhook-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          set({ n8nWebhookUrl: url });
        } catch (error) {
          console.error('Failed to set webhook URL:', error);
        }
      },

      clearWebhookLogs: async () => {
        try {
          await fetch(`${SERVER_URL}/api/webhook-logs`, {
            method: 'DELETE',
          });
          set({ n8nLogs: [] });
        } catch (error) {
          console.error('Failed to clear webhook logs:', error);
        }
      },

      resetServer: async () => {
        try {
          const res = await fetch(`${SERVER_URL}/api/reset`, {
            method: 'POST',
          });
          const data = await res.json();
          if (data.state) {
            set({
              tasks: data.state.tasks,
              sessions: data.state.sessions,
              studentState: data.state.studentState,
              n8nLogs: data.state.n8nLogs || [],
              n8nWebhookUrl: data.state.n8nWebhookUrl || '',
            });
          }
        } catch (error) {
          console.error('Failed to reset server database:', error);
        }
      },
    }),
    {
      name: 'alcovia-server-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
