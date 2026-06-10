import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, TextInput } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useDeviceStore } from '../../stores/deviceStore';
import Animated, { FadeIn } from 'react-native-reanimated';
import { InteractivePressable } from '../../components/InteractivePressable';
import { useFocusStore } from '../../stores/focusStore';
import { useSyllabusStore } from '../../stores/syllabusStore';
import { useSyncStore } from '../../stores/syncStore';
import { useServerStore } from '../../stores/serverStore';
import { useM3Theme } from '../../constants/Theme';
import { DeviceCard } from '../../components/DeviceCard';
import { AppCard } from '../../components/AppCard';
import { generateId, showAlert, showConfirm } from '../../utils/helpers';
import type { ClientId, FocusSession, Task, Subject, Chapter } from '../../../../packages/shared/types';

const EMPTY_ARRAY: any[] = [];

export default function DevPanelScreen() {
  const { colors, shapes, typography, isDark } = useM3Theme();
  
  // Stores
  const { 
    clientId, 
    isOnline: isOnlineMap, 
    setClientId, 
    setOnline,
    toggleOnline, 
    latencyMs, 
    packetLoss, 
    setLatencyMs, 
    setPacketLoss 
  } = useDeviceStore();
  const syncActions = useSyncStore((state) => state.actions);
  const clearActions = useSyncStore((state) => state.clearActions);
  const sync = useSyncStore((state) => state.sync);

  // Server state
  const { 
    n8nWebhookUrl, 
    setN8nWebhookUrl, 
    n8nLogs, 
    clearWebhookLogs, 
    resetServer,
    tasks: serverTasks,
    sessions: serverSessions,
    studentState: serverStudentState
  } = useServerStore();

  const [inspectOpen, setInspectOpen] = useState(true);
  const [logsOpen, setLogsOpen] = useState(true);
  const [presetsOpen, setPresetsOpen] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string; type: 'success' | 'failure' } | null>(null);

  // Custom presets state configurator
  const [customDurationA, setCustomDurationA] = useState('25');
  const [customDurationB, setCustomDurationB] = useState('45');
  const [customTaskId, setCustomTaskId] = useState('task-m1-1');
  const [customStatusA, setCustomStatusA] = useState('done');
  const [customStatusB, setCustomStatusB] = useState('in_progress');

  // State overrides and metric injectors
  const [overrideCoinsA, setOverrideCoinsA] = useState('0');
  const [overrideStreakA, setOverrideStreakA] = useState('0');
  const [overrideCoinsB, setOverrideCoinsB] = useState('0');
  const [overrideStreakB, setOverrideStreakB] = useState('0');
  const [customVersionA, setCustomVersionA] = useState('1');
  const [customVersionB, setCustomVersionB] = useState('1');

  // Outage and Network Profile helpers
  const [outageSecondsLeft, setOutageSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (outageSecondsLeft !== null && outageSecondsLeft > 0) {
      interval = setInterval(() => {
        setOutageSecondsLeft((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(interval);
            setOnline('client-A', true);
            setOnline('client-B', true);
            sync('client-A');
            sync('client-B');
            setAlertModal({
              title: 'Outage Recovery Active',
              message: 'Outage period expired. Both Client A and Client B have automatically reconnected and run synchronization.',
              type: 'success',
            });
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [outageSecondsLeft]);

  const triggerOutageSimulation = (seconds: number) => {
    setOnline('client-A', false);
    setOnline('client-B', false);
    setOutageSecondsLeft(seconds);
  };

  const applyNetworkProfile = (lat: number, loss: boolean) => {
    setLatencyMs(lat);
    setPacketLoss(loss);
  };

  // Client states for comparison
  const clientAState = useFocusStore((state) => state.studentState['client-A']);
  const clientBState = useFocusStore((state) => state.studentState['client-B']);
  const clientASessions = useFocusStore((state) => state.sessions['client-A'] || EMPTY_ARRAY);
  const clientBSessions = useFocusStore((state) => state.sessions['client-B'] || EMPTY_ARRAY);
  const clientASubjects = useSyllabusStore((state) => state.subjects['client-A'] || EMPTY_ARRAY);
  const clientBSubjects = useSyllabusStore((state) => state.subjects['client-B'] || EMPTY_ARRAY);

  const today = new Date().toISOString().split('T')[0];

  const getClientStateDefaults = (state: any) => state || {
    studentId: 'student-001',
    coins: 0,
    streak: 0,
    lastStreakDate: null,
    todayFocusMinutes: 0,
    todayDate: today,
  };

  const cA = getClientStateDefaults(clientAState);
  const cB = getClientStateDefaults(clientBState);

  const handleClientChange = (newClient: ClientId) => {
    setClientId(newClient);
  };

  const handleToggleOnline = (cid: ClientId) => {
    const isCurrentlyOnline = isOnlineMap[cid];
    toggleOnline(cid);
    
    // If turning online, trigger sync
    if (!isCurrentlyOnline) {
      sync(cid);
    }
  };

  const handleResetAll = () => {
    setConfirmModal({
      title: 'Reset Database',
      message: 'Reset ALL clients and server data to default seed data? This cannot be undone.',
      onConfirm: () => {
        useFocusStore.getState().resetClient('client-A');
        useFocusStore.getState().resetClient('client-B');
        useSyllabusStore.getState().resetClient('client-A');
        useSyllabusStore.getState().resetClient('client-B');
        clearActions('client-A');
        clearActions('client-B');
        setLatencyMs(0);
        setPacketLoss(false);
        resetServer().then(() => {
          setConfirmModal(null);
          setAlertModal({
            title: 'Reset Successful',
            message: 'All client stores and the server database have been successfully reset to defaults.',
            type: 'success',
          });
        });
      },
    });
  };

  const handleOverrideA = () => {
    useFocusStore.setState((state) => {
      const ss = getClientStateDefaults(state.studentState['client-A']);
      ss.coins = parseInt(overrideCoinsA, 10) || 0;
      ss.streak = parseInt(overrideStreakA, 10) || 0;
      return {
        studentState: { ...state.studentState, 'client-A': ss }
      };
    });
    setAlertModal({
      title: 'State Overridden',
      message: `Manually set Client A to ${overrideCoinsA} coins and ${overrideStreakA} streak days.`,
      type: 'success'
    });
  };

  const handleOverrideB = () => {
    useFocusStore.setState((state) => {
      const ss = getClientStateDefaults(state.studentState['client-B']);
      ss.coins = parseInt(overrideCoinsB, 10) || 0;
      ss.streak = parseInt(overrideStreakB, 10) || 0;
      return {
        studentState: { ...state.studentState, 'client-B': ss }
      };
    });
    setAlertModal({
      title: 'State Overridden',
      message: `Manually set Client B to ${overrideCoinsB} coins and ${overrideStreakB} streak days.`,
      type: 'success'
    });
  };

  // Preset Conflict Scenarios
  const triggerFocusStreakConflict = () => {
    // 1. Take both offline
    useDeviceStore.getState().setOnline('client-A', false);
    useDeviceStore.getState().setOnline('client-B', false);

    const now = new Date();
    const durA = parseInt(customDurationA, 10) || 25;
    const durB = parseInt(customDurationB, 10) || 45;
    
    // 2. Client A completed focus session offline
    const sessionA: FocusSession = {
      id: 'session-' + generateId().slice(0, 8),
      studentId: 'student-001',
      clientId: 'client-A',
      targetDuration: durA,
      startedAt: now.toISOString(),
      endedAt: new Date(now.getTime() + durA * 60 * 1000).toISOString(),
      status: 'success',
      failReason: null,
      coinsEarned: durA,
      version: 2,
    };

    useFocusStore.setState((state) => {
      const clientSessions = [...(state.sessions['client-A'] || []), sessionA];
      const ss = getClientStateDefaults(state.studentState['client-A']);
      ss.coins += durA;
      ss.streak = 1;
      ss.lastStreakDate = today;
      ss.todayFocusMinutes += durA;
      return {
        sessions: { ...state.sessions, 'client-A': clientSessions },
        studentState: { ...state.studentState, 'client-A': ss }
      };
    });

    useSyncStore.getState().addAction({
      clientId: 'client-A',
      studentId: 'student-001',
      type: 'focus_session_complete',
      payload: { session: sessionA }
    });

    // 3. Client B completed focus session offline
    const sessionB: FocusSession = {
      id: 'session-' + generateId().slice(0, 8),
      studentId: 'student-001',
      clientId: 'client-B',
      targetDuration: durB,
      startedAt: now.toISOString(),
      endedAt: new Date(now.getTime() + durB * 60 * 1000).toISOString(),
      status: 'success',
      failReason: null,
      coinsEarned: durB,
      version: 2,
    };

    useFocusStore.setState((state) => {
      const clientSessions = [...(state.sessions['client-B'] || []), sessionB];
      const ss = getClientStateDefaults(state.studentState['client-B']);
      ss.coins += durB;
      ss.streak = 1;
      ss.lastStreakDate = today;
      ss.todayFocusMinutes += durB;
      return {
        sessions: { ...state.sessions, 'client-B': clientSessions },
        studentState: { ...state.studentState, 'client-B': ss }
      };
    });

    useSyncStore.getState().addAction({
      clientId: 'client-B',
      studentId: 'student-001',
      type: 'focus_session_complete',
      payload: { session: sessionB }
    });

    setAlertModal({
      title: 'Preset Created',
      message: `Both devices are now OFFLINE. Client A has +${durA} coins pending, Client B has +${durB} coins pending.\n\nToggle them ONLINE to watch the server reconcile them to a total of +${durA + durB} coins with a correct streak projection, and trigger webhooks exactly once.`,
      type: 'success'
    });
  };

  const triggerTaskPrecedenceConflict = () => {
    // 1. Take both offline
    useDeviceStore.getState().setOnline('client-A', false);
    useDeviceStore.getState().setOnline('client-B', false);

    const taskId = customTaskId;
    const updatedAt = new Date().toISOString();

    const getTaskTitle = (tid: string) => {
      const allTasks = clientASubjects.flatMap((s: any) => s.chapters.flatMap((c: any) => c.tasks));
      const task = allTasks.find((t: any) => t.id === tid);
      return task ? task.title : 'Custom Task';
    };
    const taskTitle = getTaskTitle(taskId);

    // Client A sets task status to customStatusA
    useSyllabusStore.setState((state) => {
      const subjects = (state.subjects['client-A'] || []).map((sub: Subject) => ({
        ...sub,
        chapters: sub.chapters.map((ch: Chapter) => ({
          ...ch,
          tasks: ch.tasks.map((t: Task) => 
            t.id === taskId ? { ...t, status: customStatusA as any, version: t.version + 1, updatedAt } : t
          )
        }))
      }));
      return { subjects: { ...state.subjects, 'client-A': subjects } };
    });

    useSyncStore.getState().addAction({
      clientId: 'client-A',
      studentId: 'student-001',
      type: 'task_status_change',
      payload: { taskId, newStatus: customStatusA, version: 1 }
    });

    // Client B sets same task status to customStatusB
    useSyllabusStore.setState((state) => {
      const subjects = (state.subjects['client-B'] || []).map((sub: Subject) => ({
        ...sub,
        chapters: sub.chapters.map((ch: Chapter) => ({
          ...ch,
          tasks: ch.tasks.map((t: Task) => 
            t.id === taskId ? { ...t, status: customStatusB as any, version: t.version + 1, updatedAt } : t
          )
        }))
      }));
      return { subjects: { ...state.subjects, 'client-B': subjects } };
    });

    useSyncStore.getState().addAction({
      clientId: 'client-B',
      studentId: 'student-001',
      type: 'task_status_change',
      payload: { taskId, newStatus: customStatusB, version: 1 }
    });

    setAlertModal({
      title: 'Preset Created',
      message: `Both devices are now OFFLINE.\nClient A set "${taskTitle}" to "${customStatusA}".\nClient B set it to "${customStatusB}".\n\nToggle them ONLINE. The server precedence rule will determine the converged state deterministically.`,
      type: 'success'
    });
  };

  const triggerTaskDeleteConflict = () => {
    // 1. Take both offline
    useDeviceStore.getState().setOnline('client-A', false);
    useDeviceStore.getState().setOnline('client-B', false);

    const taskId = 'task-m1-2'; // Mathematics -> Algebra -> Quadratic Equations
    const updatedAt = new Date().toISOString();

    // Client A deletes task
    useSyllabusStore.setState((state) => {
      const subjects = (state.subjects['client-A'] || []).map((sub: Subject) => ({
        ...sub,
        chapters: sub.chapters.map((ch: Chapter) => ({
          ...ch,
          tasks: ch.tasks.map((t: Task) => 
            t.id === taskId ? { ...t, deleted: true, version: t.version + 1, updatedAt } : t
          )
        }))
      }));
      return { subjects: { ...state.subjects, 'client-A': subjects } };
    });

    useSyncStore.getState().addAction({
      clientId: 'client-A',
      studentId: 'student-001',
      type: 'task_delete',
      payload: { taskId, version: 1 }
    });

    // Client B edits status to "done"
    useSyllabusStore.setState((state) => {
      const subjects = (state.subjects['client-B'] || []).map((sub: Subject) => ({
        ...sub,
        chapters: sub.chapters.map((ch: Chapter) => ({
          ...ch,
          tasks: ch.tasks.map((t: Task) => 
            t.id === taskId ? { ...t, status: 'done' as const, version: t.version + 1, updatedAt } : t
          )
        }))
      }));
      return { subjects: { ...state.subjects, 'client-B': subjects } };
    });

    useSyncStore.getState().addAction({
      clientId: 'client-B',
      studentId: 'student-001',
      type: 'task_status_change',
      payload: { taskId, newStatus: 'done', version: 1 }
    });

    setAlertModal({
      title: 'Preset Created',
      message: 'Both devices are now OFFLINE.\nClient A deleted "Quadratic Equations".\nClient B marked it "Done".\n\nToggle them ONLINE. The soft delete rule will ensure that the delete wins and the task remains deleted on both devices.',
      type: 'success'
    });
  };

  const triggerReplayConflict = () => {
    // Take Client A offline
    useDeviceStore.getState().setOnline('client-A', false);

    const now = new Date();
    const dur = parseInt(customDurationA, 10) || 25;
    const sessionId = 'session-' + generateId().slice(0, 8);

    const session: FocusSession = {
      id: sessionId,
      studentId: 'student-001',
      clientId: 'client-A',
      targetDuration: dur,
      startedAt: now.toISOString(),
      endedAt: new Date(now.getTime() + dur * 60 * 1000).toISOString(),
      status: 'success',
      failReason: null,
      coinsEarned: dur,
      version: 2,
    };

    // Complete session on Client A
    useFocusStore.setState((state) => {
      const clientSessions = [...(state.sessions['client-A'] || []), session];
      const ss = getClientStateDefaults(state.studentState['client-A']);
      ss.coins += dur;
      ss.streak = 1;
      ss.lastStreakDate = today;
      ss.todayFocusMinutes += dur;
      return {
        sessions: { ...state.sessions, 'client-A': clientSessions },
        studentState: { ...state.studentState, 'client-A': ss }
      };
    });

    // Enqueue the identical complete action TWICE to simulate sync retry/replay
    useSyncStore.getState().addAction({
      clientId: 'client-A',
      studentId: 'student-001',
      type: 'focus_session_complete',
      payload: { session }
    });

    useSyncStore.setState((state) => {
      const duplicateAction = {
        id: generateId(),
        clientId: 'client-A',
        studentId: 'student-001',
        type: 'focus_session_complete' as const,
        payload: { session },
        timestamp: new Date().toISOString(),
        version: 1,
        synced: false,
      };
      return { actions: [...state.actions, duplicateAction] };
    });

    setAlertModal({
      title: 'Replay Preset Created',
      message: `Device A is now OFFLINE.\n\nWe completed a focus session and queued **TWO identical completion events** in the action log. When you toggle Device A ONLINE, the server will process the first event (firing n8n notification) and automatically discard the second duplicate event.`,
      type: 'success'
    });
  };

  const triggerOutOfOrderConflict = () => {
    // Take both offline
    useDeviceStore.getState().setOnline('client-A', false);
    useDeviceStore.getState().setOnline('client-B', false);

    const taskId = customTaskId;
    const tOlder = new Date(Date.now() - 10000).toISOString(); // 10s ago
    const tNewer = new Date().toISOString(); // now

    const getTaskTitle = (tid: string) => {
      const allTasks = clientASubjects.flatMap((s: any) => s.chapters.flatMap((c: any) => c.tasks));
      const task = allTasks.find((t: any) => t.id === tid);
      return task ? task.title : 'Custom Task';
    };
    const taskTitle = getTaskTitle(taskId);

    // Device A sets task status to in_progress at tOlder (version 1)
    useSyncStore.getState().addAction({
      clientId: 'client-A',
      studentId: 'student-001',
      type: 'task_status_change',
      payload: { taskId, newStatus: 'in_progress', version: 1 }
    });
    useSyncStore.setState((state) => ({
      actions: state.actions.map(a => 
        a.clientId === 'client-A' && a.payload.taskId === taskId ? { ...a, timestamp: tOlder } : a
      )
    }));

    // Device B sets same task status to done at tNewer (version 2)
    useSyncStore.getState().addAction({
      clientId: 'client-B',
      studentId: 'student-001',
      type: 'task_status_change',
      payload: { taskId, newStatus: 'done', version: 2 }
    });
    useSyncStore.setState((state) => ({
      actions: state.actions.map(a => 
        a.clientId === 'client-B' && a.payload.taskId === taskId ? { ...a, timestamp: tNewer } : a
      )
    }));

    setAlertModal({
      title: 'Out-of-Order Preset Created',
      message: `Both devices are now OFFLINE.\n\nWe simulated out-of-order logs for "${taskTitle}":\n- Device A updated to "In Progress" at an older timestamp.\n- Device B updated to "Done" with a higher version at a newer timestamp.\n\nReconnecting will sort actions chronologically and converge state correctly using version checks.`,
      type: 'success'
    });
  };

  const triggerNetworkDropConflict = () => {
    // 1. Enable packet loss
    setPacketLoss(true);
    // Take Client A offline
    setOnline('client-A', false);

    const now = new Date();
    const dur = parseInt(customDurationA, 10) || 25;
    const session: FocusSession = {
      id: 'session-' + generateId().slice(0, 8),
      studentId: 'student-001',
      clientId: 'client-A',
      targetDuration: dur,
      startedAt: now.toISOString(),
      endedAt: new Date(now.getTime() + dur * 60 * 1000).toISOString(),
      status: 'success',
      failReason: null,
      coinsEarned: dur,
      version: 2,
    };

    useFocusStore.setState((state) => {
      const clientSessions = [...(state.sessions['client-A'] || []), session];
      const ss = getClientStateDefaults(state.studentState['client-A']);
      ss.coins += dur;
      ss.streak = 1;
      ss.lastStreakDate = today;
      ss.todayFocusMinutes += dur;
      return {
        sessions: { ...state.sessions, 'client-A': clientSessions },
        studentState: { ...state.studentState, 'client-A': ss }
      };
    });

    useSyncStore.getState().addAction({
      clientId: 'client-A',
      studentId: 'student-001',
      type: 'focus_session_complete',
      payload: { session }
    });

    setAlertModal({
      title: 'Network Drop Preset Created',
      message: `Device A is now OFFLINE and Simulated Packet Loss is ENABLED.\n\nDevice A completed a focus session offline. Toggle Device A ONLINE. You will see that the sync fails due to simulated packet loss. Disable Packet Loss under the simulator console to recover and sync successfully.`,
      type: 'success'
    });
  };

  const triggerVersionOverrideConflict = () => {
    // 1. Take both offline
    setOnline('client-A', false);
    setOnline('client-B', false);

    const taskId = customTaskId;
    const updatedAt = new Date().toISOString();
    const verA = parseInt(customVersionA, 10) || 5;
    const verB = parseInt(customVersionB, 10) || 2;

    const getTaskTitle = (tid: string) => {
      const allTasks = clientASubjects.flatMap((s: any) => s.chapters.flatMap((c: any) => c.tasks));
      const task = allTasks.find((t: any) => t.id === tid);
      return task ? task.title : 'Custom Task';
    };
    const taskTitle = getTaskTitle(taskId);

    // Client A sets task status to "in_progress" with version verA
    useSyllabusStore.setState((state) => {
      const subjects = (state.subjects['client-A'] || []).map((sub: Subject) => ({
        ...sub,
        chapters: sub.chapters.map((ch: Chapter) => ({
          ...ch,
          tasks: ch.tasks.map((t: Task) => 
            t.id === taskId ? { ...t, status: 'in_progress' as const, version: verA, updatedAt } : t
          )
        }))
      }));
      return { subjects: { ...state.subjects, 'client-A': subjects } };
    });

    useSyncStore.getState().addAction({
      clientId: 'client-A',
      studentId: 'student-001',
      type: 'task_status_change',
      payload: { taskId, newStatus: 'in_progress', version: verA }
    });

    // Client B sets same task status to "done" with version verB
    useSyllabusStore.setState((state) => {
      const subjects = (state.subjects['client-B'] || []).map((sub: Subject) => ({
        ...sub,
        chapters: sub.chapters.map((ch: Chapter) => ({
          ...ch,
          tasks: ch.tasks.map((t: Task) => 
            t.id === taskId ? { ...t, status: 'done' as const, version: verB, updatedAt } : t
          )
        }))
      }));
      return { subjects: { ...state.subjects, 'client-B': subjects } };
    });

    useSyncStore.getState().addAction({
      clientId: 'client-B',
      studentId: 'student-001',
      type: 'task_status_change',
      payload: { taskId, newStatus: 'done', version: verB }
    });

    setAlertModal({
      title: 'Version Override Preset Created',
      message: `Both devices are now OFFLINE.\n\n- Client A set "${taskTitle}" to "In Progress" (v${verA}).\n- Client B set it to "Done" (v${verB}).\n\nEven though "Done" has higher priority, Client A's version clock is higher (${verA} vs ${verB}). Toggling them ONLINE will resolve the state to "In Progress".`,
      type: 'success'
    });
  };

  const triggerCrossSubjectSyncConflict = () => {
    setOnline('client-A', false);
    setOnline('client-B', false);
    const updatedAt = new Date().toISOString();

    useSyllabusStore.setState((state) => {
      const subjects = (state.subjects['client-A'] || []).map((sub: Subject) => ({
        ...sub,
        chapters: sub.chapters.map((ch: Chapter) => ({
          ...ch,
          tasks: ch.tasks.map((t: Task) => 
            t.id === 'task-m1-1' ? { ...t, status: 'done' as const, version: t.version + 1, updatedAt } : t
          )
        }))
      }));
      return { subjects: { ...state.subjects, 'client-A': subjects } };
    });

    useSyncStore.getState().addAction({
      clientId: 'client-A',
      studentId: 'student-001',
      type: 'task_status_change',
      payload: { taskId: 'task-m1-1', newStatus: 'done', version: 2 }
    });

    useSyllabusStore.setState((state) => {
      const subjects = (state.subjects['client-B'] || []).map((sub: Subject) => ({
        ...sub,
        chapters: sub.chapters.map((ch: Chapter) => ({
          ...ch,
          tasks: ch.tasks.map((t: Task) => 
            t.id === 'task-p1-1' ? { ...t, status: 'done' as const, version: t.version + 1, updatedAt } : t
          )
        }))
      }));
      return { subjects: { ...state.subjects, 'client-B': subjects } };
    });

    useSyncStore.getState().addAction({
      clientId: 'client-B',
      studentId: 'student-001',
      type: 'task_status_change',
      payload: { taskId: 'task-p1-1', newStatus: 'done', version: 2 }
    });

    setAlertModal({
      title: 'Cross-Subject Preset Created',
      message: 'Both devices are now OFFLINE.\nDevice A completed Mathematics "Linear Equations" offline.\nDevice B completed Physics "Newton\'s Laws" offline.\n\nToggle them ONLINE. Both changes will merge and show updated overall study progress averages for both subjects on both devices.',
      type: 'success'
    });
  };

  const triggerOutOfOrderTaskCreationPreset = () => {
    setOnline('client-A', false);
    setOnline('client-B', false);
    const chapterId = 'ch-m1';
    const taskIdA = 'task-math-custom-1';
    const taskIdB = 'task-phys-custom-1';
    const updatedAt = new Date().toISOString();

    const newTaskA: Task = {
      id: taskIdA,
      chapterId,
      title: 'Calculus II',
      status: 'not_started',
      updatedAt,
      version: 1,
      deleted: false,
    };
    useSyllabusStore.setState((state) => {
      const subjects = (state.subjects['client-A'] || []).map((sub: Subject) => ({
        ...sub,
        chapters: sub.chapters.map((ch: Chapter) => 
          ch.id === chapterId ? { ...ch, tasks: [...ch.tasks, newTaskA] } : ch
        )
      }));
      return { subjects: { ...state.subjects, 'client-A': subjects } };
    });
    useSyncStore.getState().addAction({
      clientId: 'client-A',
      studentId: 'student-001',
      type: 'task_status_change',
      payload: { taskId: taskIdA, chapterId, title: 'Calculus II', newStatus: 'not_started', version: 1 }
    });

    const newTaskB: Task = {
      id: taskIdB,
      chapterId,
      title: 'Quantum Mechanics',
      status: 'not_started',
      updatedAt,
      version: 1,
      deleted: false,
    };
    useSyllabusStore.setState((state) => {
      const subjects = (state.subjects['client-B'] || []).map((sub: Subject) => ({
        ...sub,
        chapters: sub.chapters.map((ch: Chapter) => 
          ch.id === chapterId ? { ...ch, tasks: [...ch.tasks, newTaskB] } : ch
        )
      }));
      return { subjects: { ...state.subjects, 'client-B': subjects } };
    });
    useSyncStore.getState().addAction({
      clientId: 'client-B',
      studentId: 'student-001',
      type: 'task_status_change',
      payload: { taskId: taskIdB, chapterId, title: 'Quantum Mechanics', newStatus: 'not_started', version: 1 }
    });

    setAlertModal({
      title: 'Task Creation Preset Created',
      message: 'Both devices are now OFFLINE.\nDevice A added "Calculus II" offline.\nDevice B added "Quantum Mechanics" offline.\n\nToggle them ONLINE. Both tasks will merge and sync to the server database without loss.',
      type: 'success'
    });
  };

  const triggerDailyStreakReevaluationPreset = () => {
    setOnline('client-A', false);
    setOnline('client-B', false);
    useFocusStore.setState((state) => {
      const ssA = getClientStateDefaults(state.studentState['client-A']);
      ssA.streak = 2;
      const ssB = getClientStateDefaults(state.studentState['client-B']);
      ssB.streak = 1;
      return {
        studentState: {
          ...state.studentState,
          'client-A': ssA,
          'client-B': ssB,
        }
      };
    });

    setAlertModal({
      title: 'Streak Re-evaluation Preset Created',
      message: 'Both devices are now OFFLINE.\nClient A is set to a 2-day streak.\nClient B is set to a 1-day streak.\n\nWhen they go online, the server projects the canonical streak based on actual focus session completions in the database, updating both devices to the consistent correct value.',
      type: 'success'
    });
  };

  const ChevronIcon = ({ isOpen, color }: { isOpen: boolean; color: string }) => {
    return (
      <Svg
        width={10}
        height={10}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={3.5}
        style={{
          transform: [{ rotate: isOpen ? '90deg' : '0deg' }],
        }}
      >
        <Path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  };

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      style={{ flex: 1 }}
    >
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <Text style={[typography.headlineMedium, { color: colors.onBackground, fontWeight: '800' }]}>
        Developer Console
      </Text>
      <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: 4, marginBottom: 12, lineHeight: 20 }]}>
        Manage node configurations, trigger offline synchronization conflicts, and monitor active webhook logs.
      </Text>

      {/* Dual Device Simulation Grids */}
      <View style={styles.devicesGrid}>
        <DeviceCard
          clientId="client-A"
          activeClientId={clientId}
          isOnline={isOnlineMap['client-A']}
          onSelect={handleClientChange}
          onToggleOnline={() => handleToggleOnline('client-A')}
        />
        <DeviceCard
          clientId="client-B"
          activeClientId={clientId}
          isOnline={isOnlineMap['client-B']}
          onSelect={handleClientChange}
          onToggleOnline={() => handleToggleOnline('client-B')}
        />
      </View>

      {/* Preset Scenarios Panel */}
      <AppCard variant="elevated" elevation={1} padding={0} style={styles.sectionCard}>
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: colors.surface, borderBottomWidth: presetsOpen ? 1 : 0, borderBottomColor: colors.outlineVariant }]}
          onPress={() => setPresetsOpen(!presetsOpen)}
          activeOpacity={0.8}
        >
          <Text style={[typography.titleMedium, { color: colors.primary, fontWeight: '700' }]}>
            Conflict Simulation Presets
          </Text>
          <ChevronIcon isOpen={presetsOpen} color={colors.primary} />
        </TouchableOpacity>

        {presetsOpen && (
          <View style={styles.presetBody}>
            {/* Network Profile & Outage Simulator */}
            <View style={{ marginBottom: 12, padding: 12, backgroundColor: isDark ? '#26232A' : '#FAF6FF', borderRadius: shapes.m, borderWidth: 1, borderColor: colors.outlineVariant }}>
              <Text style={[typography.titleSmall, { color: colors.primary, fontWeight: '800', marginBottom: 8 }]}>
                Network Profile & Outage Simulator
              </Text>
              <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginBottom: 12, lineHeight: 16 }]}>
                Select a network profile to simulate network conditions, or trigger a temporary outage window.
              </Text>

              {/* Profiles Row */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {[
                  { name: 'Fiber', latency: 0, loss: false, label: 'Fiber (0ms / 0%)' },
                  { name: '4G LTE', latency: 150, loss: false, label: '4G (150ms)' },
                  { name: 'Slow 3G', latency: 800, loss: false, label: '3G (800ms)' },
                  { name: 'Transit', latency: 2000, loss: true, label: 'Subway (2s / Loss)' },
                  { name: 'Blackout', latency: 0, loss: true, label: 'Blackout (Offline)' },
                ].map((prof) => {
                  const isActive = latencyMs === prof.latency && packetLoss === prof.loss;
                  return (
                    <TouchableOpacity
                      key={prof.name}
                      onPress={() => applyNetworkProfile(prof.latency, prof.loss)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderRadius: shapes.s,
                        borderWidth: 1.5,
                        borderColor: isActive ? colors.primary : colors.outlineVariant,
                        backgroundColor: isActive ? colors.primaryContainer : colors.surface,
                      }}
                    >
                      <Text style={{ color: isActive ? colors.onPrimaryContainer : colors.onSurfaceVariant, fontSize: 11, fontWeight: '700' }}>
                        {prof.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Outage Simulation Trigger Row */}
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.surface, padding: 10, borderRadius: shapes.s, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.labelMedium, { color: colors.onSurface, fontWeight: '700' }]}>
                    Temporary Outage Window
                  </Text>
                  {outageSecondsLeft !== null ? (
                    <Text style={[typography.bodySmall, { color: colors.error, fontWeight: '800', marginTop: 2 }]}>
                      Auto-reconnecting in {outageSecondsLeft}s...
                    </Text>
                  ) : (
                    <Text style={[typography.bodySmall, { color: colors.outline, marginTop: 2 }]}>
                      Simulate network dropping and auto-reconnecting.
                    </Text>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => triggerOutageSimulation(10)}
                    disabled={outageSecondsLeft !== null}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: shapes.s,
                      backgroundColor: outageSecondsLeft !== null ? colors.surfaceVariant : colors.error,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: outageSecondsLeft !== null ? colors.outline : colors.onError, fontSize: 11, fontWeight: '700' }}>
                      10s Drop
                    </Text>
                  </TouchableOpacity>
                  
                  {outageSecondsLeft !== null && (
                    <TouchableOpacity
                      onPress={() => setOutageSecondsLeft(null)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: shapes.s,
                        backgroundColor: colors.surfaceVariant,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: colors.onSurfaceVariant, fontSize: 11, fontWeight: '700' }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Raw Simulator Params (Advanced overrides collapsible/inline) */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 10, flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1.5 }}>
                  <Text style={[typography.labelMedium, { color: colors.outline, marginBottom: 4 }]}>Raw Latency Override</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[0, 1000, 3000].map((lat) => (
                      <TouchableOpacity
                        key={lat}
                        onPress={() => setLatencyMs(lat)}
                        style={{
                          flex: 1,
                          paddingVertical: 6,
                          borderRadius: shapes.xs,
                          alignItems: 'center',
                          backgroundColor: latencyMs === lat ? colors.primary : colors.surfaceVariant,
                        }}
                      >
                        <Text style={{ color: latencyMs === lat ? colors.onPrimary : colors.onSurfaceVariant, fontSize: 10, fontWeight: '700' }}>
                          {lat === 0 ? '0ms' : `${lat / 1000}s`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[typography.labelMedium, { color: colors.outline, marginBottom: 4 }]}>Raw Packet Loss</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[false, true].map((val) => (
                      <TouchableOpacity
                        key={String(val)}
                        onPress={() => setPacketLoss(val)}
                        style={{
                          flex: 1,
                          paddingVertical: 6,
                          borderRadius: shapes.xs,
                          alignItems: 'center',
                          backgroundColor: packetLoss === val ? colors.primary : colors.surfaceVariant,
                        }}
                      >
                        <Text style={{ color: packetLoss === val ? colors.onPrimary : colors.onSurfaceVariant, fontSize: 10, fontWeight: '700' }}>
                          {val ? 'On' : 'Off'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* State & Metrics Overrides Panel */}
            <View style={{ marginBottom: 12, padding: 12, backgroundColor: isDark ? '#26232A' : '#FAF6FF', borderRadius: shapes.m, borderWidth: 1, borderColor: colors.outlineVariant }}>
              <Text style={[typography.titleSmall, { color: colors.primary, fontWeight: '800', marginBottom: 12 }]}>
                Student Metrics Injector (State Overrides)
              </Text>
              
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={[typography.labelMedium, { color: colors.onSurface }]}>Device A Override</Text>
                  <TextInput
                    style={[styles.webhookInput, { height: 34, borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface, borderRadius: shapes.s }]}
                    placeholder="Coins"
                    keyboardType="numeric"
                    value={overrideCoinsA}
                    onChangeText={setOverrideCoinsA}
                  />
                  <TextInput
                    style={[styles.webhookInput, { height: 34, borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface, borderRadius: shapes.s }]}
                    placeholder="Streak Days"
                    keyboardType="numeric"
                    value={overrideStreakA}
                    onChangeText={setOverrideStreakA}
                  />
                  <TouchableOpacity
                    onPress={handleOverrideA}
                    style={{
                      paddingVertical: 8,
                      borderRadius: shapes.s,
                      backgroundColor: colors.primaryContainer,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.onPrimaryContainer, fontWeight: '700', fontSize: 11 }}>Inject Device A</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={[typography.labelMedium, { color: colors.onSurface }]}>Device B Override</Text>
                  <TextInput
                    style={[styles.webhookInput, { height: 34, borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface, borderRadius: shapes.s }]}
                    placeholder="Coins"
                    keyboardType="numeric"
                    value={overrideCoinsB}
                    onChangeText={setOverrideCoinsB}
                  />
                  <TextInput
                    style={[styles.webhookInput, { height: 34, borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface, borderRadius: shapes.s }]}
                    placeholder="Streak Days"
                    keyboardType="numeric"
                    value={overrideStreakB}
                    onChangeText={setOverrideStreakB}
                  />
                  <TouchableOpacity
                    onPress={handleOverrideB}
                    style={{
                      paddingVertical: 8,
                      borderRadius: shapes.s,
                      backgroundColor: colors.primaryContainer,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.onPrimaryContainer, fontWeight: '700', fontSize: 11 }}>Inject Device B</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Custom Values Customization Panel */}
            <View style={{ marginBottom: 12, padding: 12, backgroundColor: isDark ? '#26232A' : '#FAF6FF', borderRadius: shapes.m, borderWidth: 1, borderColor: colors.outlineVariant }}>
              <Text style={[typography.titleSmall, { color: colors.primary, fontWeight: '800', marginBottom: 12 }]}>
                Conflict Scenario Configurator
              </Text>
              
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.labelMedium, { color: colors.onSurface, marginBottom: 4 }]}>Device A Focus Min</Text>
                  <TextInput
                    style={[styles.webhookInput, { height: 36, borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface, borderRadius: shapes.s }]}
                    keyboardType="numeric"
                    value={customDurationA}
                    onChangeText={setCustomDurationA}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.labelMedium, { color: colors.onSurface, marginBottom: 4 }]}>Device B Focus Min</Text>
                  <TextInput
                    style={[styles.webhookInput, { height: 36, borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface, borderRadius: shapes.s }]}
                    keyboardType="numeric"
                    value={customDurationB}
                    onChangeText={setCustomDurationB}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1.5 }}>
                  <Text style={[typography.labelMedium, { color: colors.onSurface, marginBottom: 4 }]}>Select Conflict Task</Text>
                  <View style={{ height: 36, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: shapes.s, backgroundColor: colors.surface, justifyContent: 'center', paddingHorizontal: 8 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
                      {[
                        { id: 'task-m1-1', label: 'Linear Eq.' },
                        { id: 'task-m1-2', label: 'Quad. Eq.' },
                        { id: 'task-p1-1', label: 'Newton\'s' },
                        { id: 'task-c1-1', label: 'Hydrocarb.' }
                      ].map((taskOpt) => (
                        <TouchableOpacity
                          key={taskOpt.id}
                          onPress={() => setCustomTaskId(taskOpt.id)}
                          style={{
                            paddingVertical: 3,
                            paddingHorizontal: 8,
                            borderRadius: 12,
                            backgroundColor: customTaskId === taskOpt.id ? colors.primary : colors.surfaceVariant,
                          }}
                        >
                          <Text style={{ color: customTaskId === taskOpt.id ? colors.onPrimary : colors.onSurfaceVariant, fontSize: 10, fontWeight: '700' }}>
                            {taskOpt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={[typography.labelMedium, { color: colors.onSurface, marginBottom: 4 }]}>Dev A Status</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, alignItems: 'center', height: 36 }}>
                    {['done', 'in_progress', 'not_started'].map((statusOpt) => (
                      <TouchableOpacity
                        key={statusOpt}
                        onPress={() => setCustomStatusA(statusOpt as any)}
                        style={{
                          paddingVertical: 3,
                          paddingHorizontal: 6,
                          borderRadius: 12,
                          backgroundColor: customStatusA === statusOpt ? colors.primary : colors.surfaceVariant,
                        }}
                      >
                        <Text style={{ color: customStatusA === statusOpt ? colors.onPrimary : colors.onSurfaceVariant, fontSize: 8, fontWeight: '700' }}>
                          {statusOpt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[typography.labelMedium, { color: colors.onSurface, marginBottom: 4 }]}>Dev B Status</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, alignItems: 'center', height: 36 }}>
                    {['done', 'in_progress', 'not_started'].map((statusOpt) => (
                      <TouchableOpacity
                        key={statusOpt}
                        onPress={() => setCustomStatusB(statusOpt as any)}
                        style={{
                          paddingVertical: 3,
                          paddingHorizontal: 6,
                          borderRadius: 12,
                          backgroundColor: customStatusB === statusOpt ? colors.primary : colors.surfaceVariant,
                        }}
                      >
                        <Text style={{ color: customStatusB === statusOpt ? colors.onPrimary : colors.onSurfaceVariant, fontSize: 8, fontWeight: '700' }}>
                          {statusOpt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.labelMedium, { color: colors.onSurface, marginBottom: 4 }]}>Dev A Version Clock</Text>
                  <TextInput
                    style={[styles.webhookInput, { height: 36, borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface, borderRadius: shapes.s }]}
                    keyboardType="numeric"
                    value={customVersionA}
                    onChangeText={setCustomVersionA}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.labelMedium, { color: colors.onSurface, marginBottom: 4 }]}>Dev B Version Clock</Text>
                  <TextInput
                    style={[styles.webhookInput, { height: 36, borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface, borderRadius: shapes.s }]}
                    keyboardType="numeric"
                    value={customVersionB}
                    onChangeText={setCustomVersionB}
                  />
                </View>
              </View>
            </View>

            {/* Custom Presets Section */}
            <Text style={[typography.titleSmall, { color: colors.primary, fontWeight: '800', marginBottom: 2 }]}>
              Custom Presets
            </Text>
            <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginBottom: 12, lineHeight: 16 }]}>
              Execute simulation runs using your current configurator values.
            </Text>

            <View style={styles.presetRow}>
              <View style={styles.presetInfo}>
                <Text style={[typography.titleSmall, { color: colors.onSurface }]}>Custom Focus Conflict Scenario</Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  Simulate Device A (+{customDurationA}m) and Device B (+{customDurationB}m) focus blocks offline. Merging sums up coins and projects correct streak.
                </Text>
              </View>
              <InteractivePressable style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer }]} onPress={triggerFocusStreakConflict}>
                <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700', fontSize: 12 }}>Run Custom Focus</Text>
              </InteractivePressable>
            </View>

            <View style={styles.presetRow}>
              <View style={styles.presetInfo}>
                <Text style={[typography.titleSmall, { color: colors.onSurface }]}>Custom Task Edit Conflict Scenario</Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  Simulate concurrent edits setting the selected task to "{customStatusA}" on Dev A and "{customStatusB}" on Dev B offline.
                </Text>
              </View>
              <InteractivePressable style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer }]} onPress={triggerTaskPrecedenceConflict}>
                <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700', fontSize: 12 }}>Run Custom Task</Text>
              </InteractivePressable>
            </View>

            <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginVertical: 12 }} />

            {/* Pre-made Presets Section */}
            <Text style={[typography.titleSmall, { color: colors.primary, fontWeight: '800', marginBottom: 2 }]}>
              Pre-made Presets
            </Text>
            <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginBottom: 12, lineHeight: 16 }]}>
              Standard conflict edge cases with predefined values to quickly check convergence, soft-deletes, and retries.
            </Text>

            <View style={styles.presetRow}>
              <View style={styles.presetInfo}>
                <Text style={[typography.titleSmall, { color: colors.onSurface }]}>Task Delete vs Edit Conflict Preset</Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  Device A deletes "Quadratic Equations" and Device B marks it "Done" offline. Soft delete wins on merge.
                </Text>
              </View>
              <InteractivePressable style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer }]} onPress={triggerTaskDeleteConflict}>
                <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700', fontSize: 12 }}>Trigger Scenario</Text>
              </InteractivePressable>
            </View>

            <View style={styles.presetRow}>
              <View style={styles.presetInfo}>
                <Text style={[typography.titleSmall, { color: colors.onSurface }]}>Replay Sync / Retries (Idempotency Audit)</Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  Queues duplicate focus completes in client logs to demonstrate backend and n8n webhook deduplication filters.
                </Text>
              </View>
              <InteractivePressable style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer }]} onPress={triggerReplayConflict}>
                <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700', fontSize: 12 }}>Trigger Scenario</Text>
              </InteractivePressable>
            </View>

            <View style={styles.presetRow}>
              <View style={styles.presetInfo}>
                <Text style={[typography.titleSmall, { color: colors.onSurface }]}>Out-of-Order Timestamp Sync Preset</Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  Replays a newer change and older change out-of-order, verifying version clocks merge chronologically.
                </Text>
              </View>
              <InteractivePressable style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer }]} onPress={triggerOutOfOrderConflict}>
                <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700', fontSize: 12 }}>Trigger Scenario</Text>
              </InteractivePressable>
            </View>

            <View style={styles.presetRow}>
              <View style={styles.presetInfo}>
                <Text style={[typography.titleSmall, { color: colors.onSurface }]}>Network Drop Sync Recovery Preset</Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  Enables packet loss, triggers focus complete offline, fails to sync, and recovers when packet loss is toggled off.
                </Text>
              </View>
              <InteractivePressable style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer }]} onPress={triggerNetworkDropConflict}>
                <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700', fontSize: 12 }}>Trigger Scenario</Text>
              </InteractivePressable>
            </View>

            <View style={styles.presetRow}>
              <View style={styles.presetInfo}>
                <Text style={[typography.titleSmall, { color: colors.onSurface }]}>Clock Version Override Preset</Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  Client A updates task to "In Progress" (v5), Client B updates to "Done" (v2). Reconnect shows v5 wins on merge.
                </Text>
              </View>
              <InteractivePressable style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer }]} onPress={triggerVersionOverrideConflict}>
                <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700', fontSize: 12 }}>Trigger Scenario</Text>
              </InteractivePressable>
            </View>

            <View style={styles.presetRow}>
              <View style={styles.presetInfo}>
                <Text style={[typography.titleSmall, { color: colors.onSurface }]}>Cross-Subject Concurrent Progress Sync Conflict</Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  Client A completes Math task offline, Client B completes Physics task offline. Restoring connection merges both concurrently and updates overall syllabus progress averages.
                </Text>
              </View>
              <InteractivePressable style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer }]} onPress={triggerCrossSubjectSyncConflict}>
                <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700', fontSize: 12 }}>Trigger Scenario</Text>
              </InteractivePressable>
            </View>

            <View style={styles.presetRow}>
              <View style={styles.presetInfo}>
                <Text style={[typography.titleSmall, { color: colors.onSurface }]}>Concurrent Task Creation Sync Preset</Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  Client A adds task "Calculus II" offline, Client B adds task "Quantum Mechanics" offline. Verification checks if both tasks merge sequentially without conflicts.
                </Text>
              </View>
              <InteractivePressable style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer }]} onPress={triggerOutOfOrderTaskCreationPreset}>
                <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700', fontSize: 12 }}>Trigger Scenario</Text>
              </InteractivePressable>
            </View>

            <View style={styles.presetRow}>
              <View style={styles.presetInfo}>
                <Text style={[typography.titleSmall, { color: colors.onSurface }]}>Daily Streak Re-evaluation & Normalization</Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  Simulate Client A (2 days streak) and Client B (1 day streak) concurrently online. The server projections resolve their streak dates, merging to 2 days streak correctly.
                </Text>
              </View>
              <InteractivePressable style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer }]} onPress={triggerDailyStreakReevaluationPreset}>
                <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700', fontSize: 12 }}>Trigger Scenario</Text>
              </InteractivePressable>
            </View>
          </View>
        )}
      </AppCard>

      {/* Side-by-Side State Inspector Grid */}
      <AppCard variant="elevated" elevation={1} padding={0} style={styles.sectionCard}>
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: colors.surface, borderBottomWidth: inspectOpen ? 1 : 0, borderBottomColor: colors.outlineVariant }]}
          onPress={() => setInspectOpen(!inspectOpen)}
          activeOpacity={0.8}
        >
          <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: '700' }]}>
            Real-time Synchronization Grid
          </Text>
          <ChevronIcon isOpen={inspectOpen} color={colors.onSurface} />
        </TouchableOpacity>

        {inspectOpen && (
          <View style={styles.gridTable}>
            {/* Table Header */}
            <View style={[styles.gridRow, styles.gridHeaderRow, { borderBottomColor: colors.outlineVariant }]}>
              <Text style={[styles.gridColHeader, { flex: 1.2, color: colors.onSurfaceVariant }]}>Metric</Text>
              <Text style={[styles.gridColHeader, { color: colors.onSurfaceVariant }]}>Device A</Text>
              <Text style={[styles.gridColHeader, { color: colors.onSurfaceVariant }]}>Device B</Text>
              <Text style={[styles.gridColHeader, { color: colors.onSurfaceVariant }]}>Server</Text>
            </View>
            {/* Table Rows */}
            <View style={[styles.gridRow, { borderBottomColor: colors.outlineVariant }]}>
              <Text style={[styles.gridColLabel, { flex: 1.2, color: colors.onSurface }]}>Streak</Text>
              <Text style={[styles.gridColValue, { color: colors.primary }]}>{cA.streak} Days</Text>
              <Text style={[styles.gridColValue, { color: colors.primary }]}>{cB.streak} Days</Text>
              <Text style={[styles.gridColValue, { color: colors.success, fontWeight: '800' }]}>{serverStudentState.streak} Days</Text>
            </View>

            <View style={[styles.gridRow, { borderBottomColor: colors.outlineVariant }]}>
              <Text style={[styles.gridColLabel, { flex: 1.2, color: colors.onSurface }]}>Coins</Text>
              <Text style={[styles.gridColValue, { color: colors.primary }]}>{cA.coins} Coins</Text>
              <Text style={[styles.gridColValue, { color: colors.primary }]}>{cB.coins} Coins</Text>
              <Text style={[styles.gridColValue, { color: colors.success, fontWeight: '800' }]}>{serverStudentState.coins} Coins</Text>
            </View>

            <View style={[styles.gridRow, { borderBottomColor: colors.outlineVariant }]}>
              <Text style={[styles.gridColLabel, { flex: 1.2, color: colors.onSurface }]}>Focus Today</Text>
              <Text style={[styles.gridColValue, { color: colors.primary }]}>{cA.todayDate === today ? cA.todayFocusMinutes : 0}m</Text>
              <Text style={[styles.gridColValue, { color: colors.primary }]}>{cB.todayDate === today ? cB.todayFocusMinutes : 0}m</Text>
              <Text style={[styles.gridColValue, { color: colors.success, fontWeight: '800' }]}>{serverStudentState.todayFocusMinutes}m</Text>
            </View>

            <View style={[styles.gridRow, { borderBottomColor: colors.outlineVariant }]}>
              <Text style={[styles.gridColLabel, { flex: 1.2, color: colors.onSurface }]}>Success Sessions</Text>
              <Text style={[styles.gridColValue, { color: colors.primary }]}>{clientASessions.filter(s => s.status === 'success').length}</Text>
              <Text style={[styles.gridColValue, { color: colors.primary }]}>{clientBSessions.filter(s => s.status === 'success').length}</Text>
              <Text style={[styles.gridColValue, { color: colors.success, fontWeight: '800' }]}>{serverSessions.filter(s => s.status === 'success').length}</Text>
            </View>

            <View style={[styles.gridRow, { borderBottomColor: colors.outlineVariant }]}>
              <Text style={[styles.gridColLabel, { flex: 1.2, color: colors.onSurface }]}>Pending Sync Actions</Text>
              <Text style={[styles.gridColValue, { color: colors.error, fontWeight: '700' }]}>
                {syncActions.filter(a => a.clientId === 'client-A' && !a.synced).length}
              </Text>
              <Text style={[styles.gridColValue, { color: colors.error, fontWeight: '700' }]}>
                {syncActions.filter(a => a.clientId === 'client-B' && !a.synced).length}
              </Text>
              <Text style={[styles.gridColValue, { color: colors.outline }]}>-</Text>
            </View>
          </View>
        )}
      </AppCard>

      {/* Webhook Logs console (n8n simulator) */}
      <AppCard variant="elevated" elevation={1} padding={16} style={styles.sectionCard}>
        <TouchableOpacity
          style={[styles.logsHeader, { borderBottomWidth: logsOpen ? 1 : 0, borderBottomColor: colors.outlineVariant, paddingBottom: logsOpen ? 12 : 0 }]}
          onPress={() => setLogsOpen(!logsOpen)}
          activeOpacity={0.8}
        >
          <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: '700' }]}>
            n8n Automation Console
          </Text>
          <ChevronIcon isOpen={logsOpen} color={colors.onSurface} />
        </TouchableOpacity>

        {logsOpen && (
          <View style={styles.logsBody}>
            <Text style={[typography.bodySmall, { color: colors.outline, lineHeight: 18, marginBottom: 12 }]}>
              Enter a real n8n Webhook URL to send a POST payload when focus succeeds, or inspect simulated idempotency logs below.
            </Text>
            
            {/* Input for n8n Webhook URL */}
            <View style={styles.urlInputRow}>
              <TextInput
                style={[styles.webhookInput, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: isDark ? '#26232A' : '#FAF6FF', borderRadius: shapes.s }]}
                placeholder="http://localhost:5678/webhook-test/focus-complete"
                placeholderTextColor={colors.outline}
                value={n8nWebhookUrl}
                onChangeText={setN8nWebhookUrl}
              />
              {n8nLogs.length > 0 && (
                <TouchableOpacity onPress={clearWebhookLogs} style={styles.clearLogsBtn}>
                  <Text style={{ color: colors.error, fontWeight: '700', fontSize: 12 }}>Clear Logs</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.logList}>
              {n8nLogs.length === 0 ? (
                <Text style={[typography.bodyMedium, styles.emptyText, { color: colors.outline }]}>
                  No webhook dispatches logged yet.
                </Text>
              ) : (
                [...n8nLogs].reverse().map((log) => (
                  <View key={log.id} style={[styles.logItem, { backgroundColor: isDark ? '#211E26' : '#F7F4FA', borderColor: colors.outlineVariant }]}>
                    <View style={styles.logHeader}>
                      <Text style={[typography.labelMedium, { color: log.status === 'success' ? colors.success : colors.warning, fontWeight: '800' }]}>
                        {log.status === 'success' ? 'WEBHOOK FIRED' : 'WEBHOOK DEDUPLICATED'}
                      </Text>
                      <Text style={[typography.bodySmall, { color: colors.outline }]}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                    {log.reason && (
                      <Text style={[typography.bodySmall, { color: colors.warning, marginTop: 4, fontStyle: 'italic', fontWeight: '600' }]}>
                        Reason: {log.reason}
                      </Text>
                    )}
                    <Text style={[styles.logPayload, { color: colors.onSurface }]}>
                      {JSON.stringify(log.payload, null, 2)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </AppCard>

      {/* Danger Zone resets */}
      <View style={styles.dangerDeck}>
        <InteractivePressable
          style={[
            styles.dangerBtn,
            {
              backgroundColor: 'transparent',
              borderColor: isDark ? '#FFFFFF' : '#BA1A1A',
              borderWidth: 1.5,
              borderRadius: shapes.xl,
            },
          ]}
          onPress={handleResetAll}
        >
          <Text style={[typography.labelLarge, { color: isDark ? '#FFFFFF' : '#BA1A1A', fontWeight: '800' }]}>
            Reset Simulation Database
          </Text>
        </InteractivePressable>
      </View>
    </ScrollView>
      {/* Styled custom confirm modal overlay */}
      {confirmModal && (
        <View style={styles.modalOverlay}>
          <AppCard variant="elevated" elevation={4} padding={24} style={styles.modalCard}>
            <Text style={[typography.titleLarge, { color: colors.error, fontWeight: '800', textAlign: 'center' }]}>
              {confirmModal.title}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.onSurface, marginTop: 14, textAlign: 'center', lineHeight: 22 }]}>
              {confirmModal.message}
            </Text>
            <View style={styles.modalButtonsRow}>
              <InteractivePressable
                style={[
                  styles.modalCancelButton,
                  {
                    borderColor: colors.outlineVariant,
                    borderWidth: 1,
                    borderRadius: shapes.l,
                  },
                ]}
                onPress={() => setConfirmModal(null)}
                scaleTo={0.95}
              >
                <Text style={[typography.labelLarge, { color: colors.onSurfaceVariant, fontWeight: '800' }]}>
                  Cancel
                </Text>
              </InteractivePressable>
              
              <InteractivePressable
                style={[
                  styles.modalConfirmButton,
                  {
                    backgroundColor: colors.error,
                    borderRadius: shapes.l,
                  },
                ]}
                onPress={confirmModal.onConfirm}
                scaleTo={0.95}
              >
                <Text style={[typography.labelLarge, { color: colors.onPrimary, fontWeight: '800' }]}>
                  Reset
                </Text>
              </InteractivePressable>
            </View>
          </AppCard>
        </View>
      )}

      {/* Styled custom alert modal overlay */}
      {alertModal && (
        <View style={styles.modalOverlay}>
          <AppCard variant="elevated" elevation={4} padding={24} style={styles.modalCard}>
            <Text style={[typography.titleLarge, { color: alertModal.type === 'success' ? colors.success : colors.error, fontWeight: '800', textAlign: 'center' }]}>
              {alertModal.title}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.onSurface, marginTop: 14, textAlign: 'center', lineHeight: 22 }]}>
              {alertModal.message}
            </Text>
            <InteractivePressable
              style={[
                styles.modalButton,
                {
                  backgroundColor: alertModal.type === 'success' ? colors.success : colors.error,
                  borderRadius: shapes.l,
                },
              ]}
              onPress={() => setAlertModal(null)}
              scaleTo={0.95}
            >
              <Text style={[typography.labelLarge, { color: colors.onPrimary, fontWeight: '800' }]}>
                Acknowledge
              </Text>
            </InteractivePressable>
          </AppCard>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 16,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  devicesGrid: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  sectionCard: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  collapseIcon: {
    fontSize: 12,
  },
  presetBody: {
    padding: 16,
    gap: 16,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  presetInfo: {
    flex: 1,
  },
  presetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  gridTable: {
    padding: 12,
  },
  gridRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  gridHeaderRow: {
    borderBottomWidth: 2,
  },
  gridColHeader: {
    flex: 1,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  gridColLabel: {
    fontWeight: '700',
    fontSize: 13,
  },
  gridColValue: {
    flex: 1,
    fontSize: 13,
    textAlign: 'center',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logsBody: {
    marginTop: 12,
  },
  urlInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  webhookInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  clearLogsBtn: {
    paddingHorizontal: 8,
  },
  logList: {
    maxHeight: 280,
    gap: 10,
    overflow: 'scroll',
  },
  emptyText: {
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 24,
  },
  logItem: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logPayload: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 8,
    lineHeight: 16,
  },
  dangerDeck: {
    marginTop: 8,
  },
  dangerBtn: {
    borderWidth: 1,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 999,
  },
  modalCard: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
