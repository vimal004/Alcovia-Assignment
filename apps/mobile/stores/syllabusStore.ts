import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Subject, TaskStatus } from '../../packages/shared/types';
import { generateSeedData } from '../utils/seedData';
import { useDeviceStore } from './deviceStore';
import { useSyncStore } from './syncStore';

interface SyllabusState {
  // Per-client data
  subjects: Record<string, Subject[]>; // clientId -> subjects

  // Actions
  getSubjects: () => Subject[];
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  deleteTask: (taskId: string) => void;
  initializeIfNeeded: () => void;
  resetClient: (clientId: string) => void;
}

export const useSyllabusStore = create<SyllabusState>()(
  persist(
    (set, get) => ({
      subjects: {},

      getSubjects: () => {
        const { clientId } = useDeviceStore.getState();
        return get().subjects[clientId] || [];
      },

      initializeIfNeeded: () => {
        const { clientId } = useDeviceStore.getState();
        const existing = get().subjects[clientId];
        if (!existing || existing.length === 0) {
          set((state) => ({
            subjects: { ...state.subjects, [clientId]: generateSeedData() },
          }));
        }
      },

      updateTaskStatus: (taskId: string, newStatus: TaskStatus) => {
        const { clientId } = useDeviceStore.getState();

        set((state) => {
          const subjects = (state.subjects[clientId] || []).map((subject) => ({
            ...subject,
            chapters: subject.chapters.map((chapter) => ({
              ...chapter,
              tasks: chapter.tasks.map((task) => {
                if (task.id === taskId) {
                  const updated = {
                    ...task,
                    status: newStatus,
                    updatedAt: new Date().toISOString(),
                    version: task.version + 1,
                  };

                  // Queue sync action
                  useSyncStore.getState().addAction({
                    clientId,
                    studentId: 'student-001',
                    type: 'task_status_change',
                    payload: {
                      taskId: task.id,
                      previousStatus: task.status,
                      newStatus,
                      version: updated.version,
                    },
                  });

                  return updated;
                }
                return task;
              }),
            })),
          }));

          return { subjects: { ...state.subjects, [clientId]: subjects } };
        });
      },

      deleteTask: (taskId: string) => {
        const { clientId } = useDeviceStore.getState();

        set((state) => {
          const subjects = (state.subjects[clientId] || []).map((subject) => ({
            ...subject,
            chapters: subject.chapters.map((chapter) => ({
              ...chapter,
              tasks: chapter.tasks.map((task) => {
                if (task.id === taskId) {
                  const updated = {
                    ...task,
                    deleted: true,
                    updatedAt: new Date().toISOString(),
                    version: task.version + 1,
                  };

                  // Queue sync action
                  useSyncStore.getState().addAction({
                    clientId,
                    studentId: 'student-001',
                    type: 'task_delete',
                    payload: {
                      taskId: task.id,
                      version: updated.version,
                    },
                  });

                  return updated;
                }
                return task;
              }),
            })),
          }));

          return { subjects: { ...state.subjects, [clientId]: subjects } };
        });
      },

      resetClient: (clientId: string) => {
        set((state) => ({
          subjects: { ...state.subjects, [clientId]: generateSeedData() },
        }));
      },
    }),
    {
      name: 'alcovia-syllabus-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
