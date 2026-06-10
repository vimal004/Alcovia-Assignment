import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusStore } from '../../stores/focusStore';
import { useSyllabusStore } from '../../stores/syllabusStore';
import { useDeviceStore } from '../../stores/deviceStore';
import { calculateSubjectProgress } from '../../utils/helpers';

export default function DashboardScreen() {
  const router = useRouter();
  const clientId = useDeviceStore((state) => state.clientId);
  const isOnline = useDeviceStore((state) => state.isOnline);
  const clientState = useFocusStore((state) => state.studentState[clientId]);
  const subjects = useSyllabusStore((state) => state.getSubjects());
  const initializeSyllabus = useSyllabusStore((state) => state.initializeIfNeeded);

  // Initialize syllabus seed data if not present
  useEffect(() => {
    initializeSyllabus();
  }, [clientId]);

  const today = new Date().toISOString().split('T')[0];
  const studentState = clientState || {
    studentId: 'student-001',
    coins: 0,
    streak: 0,
    lastStreakDate: null,
    todayFocusMinutes: 0,
    todayDate: today,
  };
  const todayFocusMinutes = studentState.todayDate === today ? studentState.todayFocusMinutes : 0;

  const totalProgress = subjects.length > 0 ? calculateSubjectProgress(subjects.flatMap(s => s.chapters)) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Device Header Status */}
      <View style={[styles.deviceHeader, isOnline ? styles.onlineBg : styles.offlineBg]}>
        <Text style={styles.deviceText}>
          Active Device: <Text style={styles.bold}>{clientId}</Text> | Status: <Text style={styles.bold}>{isOnline ? 'Online 🟢' : 'Offline 🔴'}</Text>
        </Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.card}>
          <Text style={styles.cardEmoji}>🔥</Text>
          <Text style={styles.cardValue}>{studentState.streak} Days</Text>
          <Text style={styles.cardLabel}>Current Streak</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEmoji}>🪙</Text>
          <Text style={styles.cardValue}>{studentState.coins}</Text>
          <Text style={styles.cardLabel}>Coins Earned</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEmoji}>⏱️</Text>
          <Text style={styles.cardValue}>{todayFocusMinutes}m</Text>
          <Text style={styles.cardLabel}>Today's Focus</Text>
        </View>
      </View>

      {/* Syllabus Progress Overview */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Syllabus Progress</Text>
        <View style={styles.progressContainer}>
          <Text style={styles.progressPercentage}>
            {Math.round(totalProgress * 100)}%
          </Text>
          <Text style={styles.progressSubtext}>Completed of all subjects</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${totalProgress * 100}%` }]} />
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => router.push('/focus')}
      >
        <Text style={styles.actionButtonText}>Start Focus Session ⏱️</Text>
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
  deviceHeader: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  onlineBg: {
    backgroundColor: '#E8F5E9',
  },
  offlineBg: {
    backgroundColor: '#FFEBEE',
  },
  deviceText: {
    fontSize: 14,
    color: '#37474F',
  },
  bold: {
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  cardEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    textAlign: 'center',
  },
  cardLabel: {
    fontSize: 12,
    color: '#78909C',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#37474F',
    marginBottom: 16,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  progressPercentage: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressSubtext: {
    fontSize: 14,
    color: '#78909C',
    marginTop: 4,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#ECEFF1',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  actionButton: {
    backgroundColor: '#1A237E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#1A237E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
