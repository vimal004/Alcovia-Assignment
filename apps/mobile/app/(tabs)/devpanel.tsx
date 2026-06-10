import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, TextInput } from 'react-native';
import { useDeviceStore } from '../../stores/deviceStore';
import { useFocusStore } from '../../stores/focusStore';
import { useSyllabusStore } from '../../stores/syllabusStore';
import { useSyncStore } from '../../stores/syncStore';
import { useServerStore } from '../../stores/serverStore';
import { useM3Theme } from '../../constants/Theme';
import { DeviceCard } from '../../components/DeviceCard';
import { AppCard } from '../../components/AppCard';
import { generateId } from '../../utils/helpers';
import type { ClientId, FocusSession, Task, Subject, Chapter } from '../../../../packages/shared/types';

const EMPTY_ARRAY: any[] = [];

export default function DevPanelScreen() {
  const { colors, shapes, typography, isDark } = useM3Theme();
  
  // Stores
  const { clientId, isOnline: isOnlineMap, setClientId, toggleOnline } = useDeviceStore();
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
    if (confirm('Reset ALL clients and server data to default seed data?')) {
      useFocusStore.getState().resetClient('client-A');
      useFocusStore.getState().resetClient('client-B');
      useSyllabusStore.getState().resetClient('client-A');
      useSyllabusStore.getState().resetClient('client-B');
      clearActions('client-A');
      clearActions('client-B');
      resetServer();
      alert('All client and server states have been reset!');
    }
  };

  // Preset Conflict Scenarios
  const triggerFocusStreakConflict = () => {
    // 1. Take both offline
    useDeviceStore.getState().setOnline('client-A', false);
    useDeviceStore.getState().setOnline('client-B', false);

    const now = new Date();
    
    // 2. Client A completed 25 min focus session offline
    const sessionA: FocusSession = {
      id: 'session-' + generateId().slice(0, 8),
      studentId: 'student-001',
      clientId: 'client-A',
      targetDuration: 25,
      startedAt: now.toISOString(),
      endedAt: new Date(now.getTime() + 25 * 60 * 1000).toISOString(),
      status: 'success',
      failReason: null,
      coinsEarned: 25,
      version: 2,
    };

    useFocusStore.setState((state) => {
      const clientSessions = [...(state.sessions['client-A'] || []), sessionA];
      const ss = getClientStateDefaults(state.studentState['client-A']);
      ss.coins += 25;
      ss.streak = 1;
      ss.lastStreakDate = today;
      ss.todayFocusMinutes += 25;
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

    // 3. Client B completed 45 min focus session offline
    const sessionB: FocusSession = {
      id: 'session-' + generateId().slice(0, 8),
      studentId: 'student-001',
      clientId: 'client-B',
      targetDuration: 45,
      startedAt: now.toISOString(),
      endedAt: new Date(now.getTime() + 45 * 60 * 1000).toISOString(),
      status: 'success',
      failReason: null,
      coinsEarned: 45,
      version: 2,
    };

    useFocusStore.setState((state) => {
      const clientSessions = [...(state.sessions['client-B'] || []), sessionB];
      const ss = getClientStateDefaults(state.studentState['client-B']);
      ss.coins += 45;
      ss.streak = 1;
      ss.lastStreakDate = today;
      ss.todayFocusMinutes += 45;
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

    alert('Preset Created!\n\nBoth devices are now OFFLINE. Client A has +25 coins pending, Client B has +45 coins pending.\n\nToggle them ONLINE to watch the server reconcile them to a total of +70 coins with a correct streak projection, and trigger webhooks exactly once.');
  };

  const triggerTaskPrecedenceConflict = () => {
    // 1. Take both offline
    useDeviceStore.getState().setOnline('client-A', false);
    useDeviceStore.getState().setOnline('client-B', false);

    const taskId = 'task-m1-1'; // Mathematics -> Algebra -> Linear Equations
    const updatedAt = new Date().toISOString();

    // Client A sets task status to "done"
    useSyllabusStore.setState((state) => {
      const subjects = (state.subjects['client-A'] || []).map((sub: Subject) => ({
        ...sub,
        chapters: sub.chapters.map((ch: Chapter) => ({
          ...ch,
          tasks: ch.tasks.map((t: Task) => 
            t.id === taskId ? { ...t, status: 'done' as const, version: t.version + 1, updatedAt } : t
          )
        }))
      }));
      return { subjects: { ...state.subjects, 'client-A': subjects } };
    });

    useSyncStore.getState().addAction({
      clientId: 'client-A',
      studentId: 'student-001',
      type: 'task_status_change',
      payload: { taskId, newStatus: 'done', version: 1 }
    });

    // Client B sets same task status to "in_progress"
    useSyllabusStore.setState((state) => {
      const subjects = (state.subjects['client-B'] || []).map((sub: Subject) => ({
        ...sub,
        chapters: sub.chapters.map((ch: Chapter) => ({
          ...ch,
          tasks: ch.tasks.map((t: Task) => 
            t.id === taskId ? { ...t, status: 'in_progress' as const, version: t.version + 1, updatedAt } : t
          )
        }))
      }));
      return { subjects: { ...state.subjects, 'client-B': subjects } };
    });

    useSyncStore.getState().addAction({
      clientId: 'client-B',
      studentId: 'student-001',
      type: 'task_status_change',
      payload: { taskId, newStatus: 'in_progress', version: 1 }
    });

    alert('Preset Created!\n\nBoth devices are now OFFLINE.\nClient A set "Linear Equations" to "Done".\nClient B set it to "In Progress".\n\nToggle them ONLINE. The server precedence rule will determine "Done" as the converged state.');
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

    alert('Preset Created!\n\nBoth devices are now OFFLINE.\nClient A deleted "Quadratic Equations".\nClient B marked it "Done".\n\nToggle them ONLINE. The soft delete rule will ensure that the delete wins and the task remains deleted on both devices.');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <Text style={[typography.headlineMedium, { color: colors.onBackground, fontWeight: '800' }]}>
        Simulation Control Deck ⚙️
      </Text>
      <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: 4, marginBottom: 12, lineHeight: 20 }]}>
        Toggle client online statuses independently, run predefined conflict scenarios, and inspect server webhook logs.
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
          <Text style={[styles.collapseIcon, { color: colors.outline }]}>
            {presetsOpen ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {presetsOpen && (
          <View style={styles.presetBody}>
            <View style={styles.presetRow}>
              <View style={styles.presetInfo}>
                <Text style={[typography.titleSmall, { color: colors.onSurface }]}>1. Focus Session & Streak Merge</Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  Simulate Device A and Device B completing different focus sessions offline. Merging sums up coins and projects the correct streak.
                </Text>
              </View>
              <TouchableOpacity style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer }]} onPress={triggerFocusStreakConflict}>
                <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700', fontSize: 12 }}>Trigger Scenario</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.presetRow}>
              <View style={styles.presetInfo}>
                <Text style={[typography.titleSmall, { color: colors.onSurface }]}>2. Task Edit Conflict (Precedence)</Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  Simulate Device A marking a task "Done" and Device B marking it "In Progress" offline. Merging resolves to "Done".
                </Text>
              </View>
              <TouchableOpacity style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer }]} onPress={triggerTaskPrecedenceConflict}>
                <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700', fontSize: 12 }}>Trigger Scenario</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.presetRow}>
              <View style={styles.presetInfo}>
                <Text style={[typography.titleSmall, { color: colors.onSurface }]}>3. Task Delete vs Edit Conflict</Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                  Simulate Device A deleting a task and Device B editing it offline. Merging resolves to Deleted (Soft delete wins).
                </Text>
              </View>
              <TouchableOpacity style={[styles.presetBtn, { backgroundColor: colors.secondaryContainer }]} onPress={triggerTaskDeleteConflict}>
                <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700', fontSize: 12 }}>Trigger Scenario</Text>
              </TouchableOpacity>
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
          <Text style={[styles.collapseIcon, { color: colors.outline }]}>
            {inspectOpen ? '▼' : '▶'}
          </Text>
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
              <Text style={[styles.gridColValue, { color: colors.primary }]}>{cA.coins} 🪙</Text>
              <Text style={[styles.gridColValue, { color: colors.primary }]}>{cB.coins} 🪙</Text>
              <Text style={[styles.gridColValue, { color: colors.success, fontWeight: '800' }]}>{serverStudentState.coins} 🪙</Text>
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
          <Text style={[styles.collapseIcon, { color: colors.outline }]}>
            {logsOpen ? '▼' : '▶'}
          </Text>
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
                        {log.status === 'success' ? '🚀 DISPATCHED (ONCE)' : '⚠️ DEDUPLICATED'}
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
        <TouchableOpacity
          style={[styles.dangerBtn, { backgroundColor: colors.errorContainer, borderColor: colors.error, borderRadius: shapes.xl }]}
          onPress={handleResetAll}
          activeOpacity={0.8}
        >
          <Text style={[typography.labelLarge, { color: colors.onErrorContainer, fontWeight: '800' }]}>
            Reset Entire Simulation DB 🚨
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
});
