import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusStore } from '../../stores/focusStore';
import { useSyllabusStore } from '../../stores/syllabusStore';
import { useDeviceStore } from '../../stores/deviceStore';
import { useSyncStore } from '../../stores/syncStore';
import { calculateSubjectProgress, getShadowStyle } from '../../utils/helpers';
import { useM3Theme } from '../../constants/Theme';
import { AchievementCard } from '../../components/AchievementCard';
import { ProgressCard } from '../../components/ProgressCard';
import { SyncIndicator } from '../../components/SyncIndicator';
import { InteractivePressable } from '../../components/InteractivePressable';
import type { Subject } from '../../../../packages/shared/types';
import Animated, { FadeIn } from 'react-native-reanimated';

const EMPTY_ARRAY: Subject[] = [];

export default function DashboardScreen() {
  const router = useRouter();
  const { colors, shapes, typography, isDark } = useM3Theme();
  const clientId = useDeviceStore((state) => state.clientId);
  const isOnline = useDeviceStore((state) => state.isOnline[clientId]);
  const clientState = useFocusStore((state) => state.studentState[clientId]);
  const subjects = useSyllabusStore((state) => state.subjects[clientId] || EMPTY_ARRAY);
  const initializeSyllabus = useSyllabusStore((state) => state.initializeIfNeeded);

  // Initialize syllabus seed data if not present and trigger sync
  useEffect(() => {
    initializeSyllabus();
    if (isOnline) {
      useSyncStore.getState().sync(clientId);
    }
  }, [clientId, isOnline]);

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

  const pendingCount = useSyncStore((state) =>
    state.actions.filter((a) => a.clientId === clientId && !a.synced).length
  );

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      style={{ flex: 1 }}
    >
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>

      {/* Connection / Sync Indicator */}
      <SyncIndicator isOnline={isOnline} pendingCount={pendingCount} />

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <AchievementCard
          symbol="▲"
          value={`${studentState.streak} Days`}
          label="Streak"
          variant="primary"
        />
        <AchievementCard
          symbol="◆"
          value={studentState.coins}
          label="Coins"
          variant="secondary"
        />
        <AchievementCard
          symbol="●"
          value={`${todayFocusMinutes}m`}
          label="Focus Today"
          variant="tertiary"
        />
      </View>

      {/* Syllabus Progress Overview */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.titleMedium, { color: colors.onBackground, fontWeight: '700' }]}>
          Progress Tracker
        </Text>
      </View>

      <ProgressCard
        title="Overall Study Progress"
        subtitle="Weighted average across mathematics, physics, and chemistry"
        progress={totalProgress}
        color={colors.primary}
      />

      {/* Action Button */}
      <InteractivePressable
        style={[
          styles.actionButton,
          {
            backgroundColor: colors.primary,
            borderRadius: shapes.xl,
            ...getShadowStyle(colors.shadow, 0, 4, 0.15, 8, 4),
          },
        ]}
        onPress={() => router.push('/focus')}
      >
        <Text style={[typography.labelLarge, styles.actionButtonText, { color: colors.onPrimary }]}>
          Start Focus Session
        </Text>
      </InteractivePressable>
    </ScrollView>
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
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: -4,
  },
  actionButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
