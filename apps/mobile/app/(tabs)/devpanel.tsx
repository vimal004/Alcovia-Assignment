import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useDeviceStore } from '../../stores/deviceStore';
import { useFocusStore } from '../../stores/focusStore';
import { useSyllabusStore } from '../../stores/syllabusStore';
import { useSyncStore } from '../../stores/syncStore';

export default function DevPanelScreen() {
  const { clientId, isOnline, setClientId, toggleOnline } = useDeviceStore();

  const actions = useSyncStore((state) => state.actions);
  const syncActions = actions.filter((a) => a.clientId === clientId);
  const pendingActions = syncActions.filter((a) => !a.synced);
  const clearActions = useSyncStore((state) => state.clearActions);

  const clientState = useFocusStore((state) => state.studentState[clientId]);
  const sessions = useFocusStore((state) => state.sessions[clientId] || []);
  const resetFocusClient = useFocusStore((state) => state.resetClient);
  const resetSyllabusClient = useSyllabusStore((state) => state.resetClient);

  const today = new Date().toISOString().split('T')[0];
  const currentStudentState = clientState || {
    studentId: 'student-001',
    coins: 0,
    streak: 0,
    lastStreakDate: null,
    todayFocusMinutes: 0,
    todayDate: today,
  };
  const todayFocusMinutes = currentStudentState.todayDate === today ? currentStudentState.todayFocusMinutes : 0;

  const handleClientChange = (newClient: 'client-A' | 'client-B') => {
    setClientId(newClient);
  };

  const handleResetCurrentClient = () => {
    if (confirm(`Reset all local data for ${clientId}?`)) {
      resetFocusClient(clientId);
      resetSyllabusClient(clientId);
      clearActions(clientId);
      alert(`${clientId} reset completed!`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Developer Simulation Panel</Text>
      <Text style={styles.subtitle}>
        Simulate multiple devices, network disconnection, and sync behavior.
      </Text>

      {/* Device Config */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Client Selection & Network</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, clientId === 'client-A' ? styles.btnActive : styles.btnInactive]}
            onPress={() => handleClientChange('client-A')}
          >
            <Text style={[styles.btnText, clientId === 'client-A' && styles.btnTextActive]}>
              Device A (client-A)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, clientId === 'client-B' ? styles.btnActive : styles.btnInactive]}
            onPress={() => handleClientChange('client-B')}
          >
            <Text style={[styles.btnText, clientId === 'client-B' && styles.btnTextActive]}>
              Device B (client-B)
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.fullWidthBtn, isOnline ? styles.btnOnline : styles.btnOffline]}
          onPress={toggleOnline}
        >
          <Text style={styles.fullWidthBtnText}>
            Simulate Connection: {isOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'} (Tap to Toggle)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Device State Info */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>State Inspector ({clientId})</Text>
        <View style={styles.stateInspector}>
          <Text style={styles.stateText}><Text style={styles.bold}>Coins:</Text> {currentStudentState.coins}</Text>
          <Text style={styles.stateText}><Text style={styles.bold}>Streak:</Text> {currentStudentState.streak} Days</Text>
          <Text style={styles.stateText}><Text style={styles.bold}>Today's Focus:</Text> {todayFocusMinutes} minutes</Text>
          <Text style={styles.stateText}><Text style={styles.bold}>Total Sessions Count:</Text> {sessions.length}</Text>
        </View>
      </View>

      {/* Sync Queue */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Pending Sync Actions Queue ({pendingActions.length})</Text>
        <View style={styles.actionQueue}>
          {syncActions.length === 0 ? (
            <Text style={styles.emptyText}>No actions queued for this device.</Text>
          ) : (
            [...syncActions].reverse().map((act) => (
              <View key={act.id} style={styles.actionItem}>
                <View style={styles.actionHeader}>
                  <Text style={styles.actionType}>{act.type}</Text>
                  <Text style={[styles.statusBadge, act.synced ? styles.syncedBg : styles.pendingBg]}>
                    {act.synced ? 'Synced' : 'Pending'}
                  </Text>
                </View>
                <Text style={styles.actionTime}>{new Date(act.timestamp).toLocaleTimeString()}</Text>
                <Text style={styles.actionPayload}>Payload: {JSON.stringify(act.payload)}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Utility buttons */}
      <TouchableOpacity style={styles.dangerBtn} onPress={handleResetCurrentClient}>
        <Text style={styles.dangerBtnText}>Reset Current Client Data 🚨</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  subtitle: {
    fontSize: 13,
    color: '#78909C',
    marginBottom: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#37474F',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnActive: {
    backgroundColor: '#1A237E',
    borderColor: '#1A237E',
  },
  btnInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#ECEFF1',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#37474F',
  },
  btnTextActive: {
    color: '#FFFFFF',
  },
  fullWidthBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnOnline: {
    backgroundColor: '#E8F5E9',
  },
  btnOffline: {
    backgroundColor: '#FFEBEE',
  },
  fullWidthBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37474F',
  },
  stateInspector: {
    gap: 6,
  },
  stateText: {
    fontSize: 14,
    color: '#455A64',
  },
  bold: {
    fontWeight: 'bold',
  },
  actionQueue: {
    maxHeight: 300,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#90A4AE',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  actionItem: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionType: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#37474F',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  syncedBg: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  pendingBg: {
    backgroundColor: '#FFF3E0',
    color: '#E65100',
  },
  actionTime: {
    fontSize: 11,
    color: '#90A4AE',
    marginTop: 2,
  },
  actionPayload: {
    fontSize: 12,
    color: '#546E7A',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dangerBtn: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerBtnText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
