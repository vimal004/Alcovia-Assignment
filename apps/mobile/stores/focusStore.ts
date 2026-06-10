import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FocusSession, StudentState } from '../../../packages/shared/types';
import { generateId, getTodayDate, getPartitionedStorageName } from '../utils/helpers';
import { useDeviceStore } from './deviceStore';
import { useSyncStore } from './syncStore';

interface FocusState {
  // Per-client data
  sessions: Record<string, FocusSession[]>;       // clientId -> sessions
  studentState: Record<string, StudentState>;      // clientId -> state

  // Actions
  startSession: (targetDuration: number) => string;
  completeSession: (sessionId: string) => void;
  failSession: (sessionId: string, reason: 'give_up' | 'app_switch') => void;
  updateHeartbeat: (sessionId: string) => void;
  getActiveSession: () => FocusSession | null;
  getCurrentState: () => StudentState;
  getSessions: () => FocusSession[];
  resetClient: (clientId: string) => void;
  // Extension 3: Crash recovery
  recoverStaleSessions: () => void;
}

const defaultStudentState = (): StudentState => ({
  studentId: 'student-001',
  coins: 0,
  streak: 0,
  lastStreakDate: null,
  todayFocusMinutes: 0,
  todayDate: getTodayDate(),
});

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      sessions: {},
      studentState: {},

      startSession: (targetDuration: number) => {
        const { clientId } = useDeviceStore.getState();
        const id = generateId();
        const session: FocusSession = {
          id,
          studentId: 'student-001',
          clientId,
          targetDuration,
          startedAt: new Date().toISOString(),
          endedAt: null,
          status: 'running',
          failReason: null,
          coinsEarned: 0,
          version: 1,
        };

        set((state) => {
          const clientSessions = [...(state.sessions[clientId] || []), session];
          return {
            sessions: { ...state.sessions, [clientId]: clientSessions },
          };
        });

        return id;
      },

      completeSession: (sessionId: string) => {
        const { clientId } = useDeviceStore.getState();
        const today = getTodayDate();

        set((state) => {
          const clientSessions = (state.sessions[clientId] || []).map((s) => {
            if (s.id === sessionId && s.status === 'running') {
              return {
                ...s,
                status: 'success' as const,
                endedAt: new Date().toISOString(),
                coinsEarned: s.targetDuration,
                version: s.version + 1,
              };
            }
            return s;
          });

          const session = clientSessions.find((s) => s.id === sessionId);
          if (!session || session.status !== 'success') {
            return { sessions: { ...state.sessions, [clientId]: clientSessions } };
          }

          // Update student state
          let ss = { ...(state.studentState[clientId] || defaultStudentState()) };

          // Reset daily totals if new day
          if (ss.todayDate !== today) {
            ss.todayFocusMinutes = 0;
            ss.todayDate = today;
          }

          // Add coins
          ss.coins += session.targetDuration;

          // Update streak
          if (ss.lastStreakDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (ss.lastStreakDate === yesterdayStr) {
              ss.streak += 1;
            } else if (ss.lastStreakDate !== today) {
              ss.streak = 1;
            }
            ss.lastStreakDate = today;
          }

          // Add to today's focus
          ss.todayFocusMinutes += session.targetDuration;

          // Queue sync action
          useSyncStore.getState().addAction({
            clientId,
            studentId: 'student-001',
            type: 'focus_session_complete',
            payload: { session: { ...session } },
          });

          return {
            sessions: { ...state.sessions, [clientId]: clientSessions },
            studentState: { ...state.studentState, [clientId]: ss },
          };
        });
      },

      failSession: (sessionId: string, reason: 'give_up' | 'app_switch') => {
        const { clientId } = useDeviceStore.getState();

        set((state) => {
          const clientSessions = (state.sessions[clientId] || []).map((s) => {
            if (s.id === sessionId && s.status === 'running') {
              return {
                ...s,
                status: 'failed' as const,
                endedAt: new Date().toISOString(),
                failReason: reason,
                version: s.version + 1,
              };
            }
            return s;
          });

          // Queue sync action
          const session = clientSessions.find((s) => s.id === sessionId);
          if (session && session.status === 'failed') {
            useSyncStore.getState().addAction({
              clientId,
              studentId: 'student-001',
              type: 'focus_session_fail',
              payload: { session: { ...session } },
            });
          }

          return {
            sessions: { ...state.sessions, [clientId]: clientSessions },
          };
        });
      },

      updateHeartbeat: (sessionId: string) => {
        const { clientId } = useDeviceStore.getState();

        set((state) => {
          const clientSessions = (state.sessions[clientId] || []).map((s) => {
            if (s.id === sessionId && s.status === 'running') {
              return {
                ...s,
                lastHeartbeatAt: new Date().toISOString(),
              };
            }
            return s;
          });

          return {
            sessions: { ...state.sessions, [clientId]: clientSessions },
          };
        });
      },

      getActiveSession: () => {
        const { clientId } = useDeviceStore.getState();
        const sessions = get().sessions[clientId] || [];
        return sessions.find((s) => s.status === 'running') || null;
      },

      getCurrentState: () => {
        const { clientId } = useDeviceStore.getState();
        const today = getTodayDate();
        const ss = get().studentState[clientId] || defaultStudentState();

        // Reset daily if new day
        if (ss.todayDate !== today) {
          return { ...ss, todayFocusMinutes: 0, todayDate: today };
        }
        return ss;
      },

      getSessions: () => {
        const { clientId } = useDeviceStore.getState();
        return get().sessions[clientId] || [];
      },

      resetClient: (clientId: string) => {
        set((state) => ({
          sessions: { ...state.sessions, [clientId]: [] },
          studentState: { ...state.studentState, [clientId]: defaultStudentState() },
        }));
      },

      // Extension 3: Crash Recovery
      // On app startup, detect any session stuck in 'running' state for >10 min
      // (caused by force-quit, tab reload, Expo Go crash). Auto-fail it so the
      // user doesn't see a phantom in-progress timer and no coins are silently lost.
      recoverStaleSessions: () => {
        const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
        const now = Date.now();
        const allClientIds = ['client-A', 'client-B', 'client-C'] as const;

        set((state) => {
          const updatedSessions = { ...state.sessions };

          allClientIds.forEach((clientId) => {
            const sessions = state.sessions[clientId] || [];
            const hasStaleSessions = sessions.some(
              (s) => s.status === 'running' && now - new Date(s.startedAt).getTime() > STALE_THRESHOLD_MS
            );

            if (!hasStaleSessions) return;

            updatedSessions[clientId] = sessions.map((s) => {
              if (s.status === 'running' && now - new Date(s.startedAt).getTime() > STALE_THRESHOLD_MS) {
                const recovered = {
                  ...s,
                  status: 'failed' as const,
                  endedAt: new Date().toISOString(),
                  failReason: 'app_switch' as const,
                  version: s.version + 1,
                };
                // Queue a fail action so this reconciles on next sync
                setTimeout(() => {
                  useSyncStore.getState().addAction({
                    clientId,
                    studentId: 'student-001',
                    type: 'focus_session_fail',
                    payload: { session: { ...recovered } },
                  });
                }, 0);
                console.log(`[CrashRecovery] Auto-failed stale session ${s.id} for ${clientId}`);
                return recovered;
              }
              return s;
            });
          });

          return { sessions: updatedSessions };
        });
      },
    }),
    {
      name: getPartitionedStorageName('alcovia-focus-store'),
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
