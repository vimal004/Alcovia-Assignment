import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, AppState, AppStateStatus, ScrollView, Platform } from 'react-native';
import { Timer } from '../../components/Timer';
import { useFocusStore } from '../../stores/focusStore';
import { formatMinutes, getShadowStyle } from '../../utils/helpers';
import { useM3Theme } from '../../constants/Theme';
import { StatusChip } from '../../components/StatusChip';
import { AppCard } from '../../components/AppCard';
import Animated, { FadeIn } from 'react-native-reanimated';

const PRESETS = [1, 25, 45, 60, 90, 120];

interface AlertModalState {
  title: string;
  message: string;
  type: 'success' | 'failure';
}

export default function FocusScreen() {
  const { colors, shapes, typography } = useM3Theme();
  const { startSession, completeSession, failSession, getActiveSession } = useFocusStore();

  const [selectedDuration, setSelectedDuration] = useState(25);
  const [runningSessionId, setRunningSessionId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);

  // Custom alert modal state
  const [alertState, setAlertState] = useState<AlertModalState | null>(null);

  const timerRef = useRef<any>(null);
  const appState = useRef(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);
  const GRACE_PERIOD_MS = 5000;

  // Sync state with store on mount / active session check
  useEffect(() => {
    const active = getActiveSession();
    if (active) {
      setRunningSessionId(active.id);
      const elapsed = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000);
      const targetSecs = active.targetDuration * 60;
      const remaining = Math.max(0, targetSecs - elapsed);
      setRemainingSeconds(remaining);
      setTotalSeconds(targetSecs);
    }
  }, []);

  // Timer loop
  useEffect(() => {
    if (runningSessionId && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [runningSessionId, remainingSeconds]);

  // Track timer completion to avoid side-effects inside state updater callback
  useEffect(() => {
    if (runningSessionId && remainingSeconds === 0) {
      handleSuccess();
    }
  }, [remainingSeconds, runningSessionId]);

  // App state listener (grace period for backgrounding on Native)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (!runningSessionId) return;

      if (
        appState.current === 'active' &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        backgroundTimeRef.current = Date.now();
      } else if (
        (appState.current === 'inactive' || appState.current === 'background') &&
        nextAppState === 'active'
      ) {
        if (backgroundTimeRef.current) {
          const elapsedBackgroundMs = Date.now() - backgroundTimeRef.current;
          if (elapsedBackgroundMs > GRACE_PERIOD_MS) {
            handleFailure('app_switch');
          }
          backgroundTimeRef.current = null;
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [runningSessionId]);

  // Tab switching / Visibility change listener (Web support)
  useEffect(() => {
    if (Platform.OS !== 'web' || !runningSessionId) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden
        backgroundTimeRef.current = Date.now();
      } else {
        // Tab active again
        if (backgroundTimeRef.current) {
          const elapsedMs = Date.now() - backgroundTimeRef.current;
          if (elapsedMs > GRACE_PERIOD_MS) {
            handleFailure('app_switch');
          }
          backgroundTimeRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [runningSessionId]);

  const handleStart = () => {
    const id = startSession(selectedDuration);
    setRunningSessionId(id);
    setRemainingSeconds(selectedDuration * 60);
    setTotalSeconds(selectedDuration * 60);
  };

  const handleGiveUp = () => {
    handleFailure('give_up');
  };

  const handleSuccess = () => {
    if (runningSessionId) {
      completeSession(runningSessionId);
      setAlertState({
        title: 'Session Completed',
        message: `Focus session completed successfully. You focused for ${selectedDuration}m and earned ${selectedDuration} coins!`,
        type: 'success',
      });
      resetTimerState();
    }
  };

  const handleFailure = (reason: 'give_up' | 'app_switch') => {
    if (runningSessionId) {
      failSession(runningSessionId, reason);
      const msg =
        reason === 'give_up'
          ? 'You chose to end this focus session early.'
          : 'Focus session interrupted because you left the app or switched tabs for more than 5 seconds.';
      setAlertState({
        title: 'Session Interrupted',
        message: msg,
        type: 'failure',
      });
      resetTimerState();
    }
  };

  const resetTimerState = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunningSessionId(null);
    setRemainingSeconds(0);
    setTotalSeconds(0);
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1 }}>
      <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      {runningSessionId ? (
        <View style={styles.runningContainer}>
          <View style={styles.runningHeader}>
            <Text style={[typography.headlineMedium, { color: colors.success, fontWeight: '800' }]}>
              Focus Session Active
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: 8, textAlign: 'center', lineHeight: 20 }]}>
              Keep focusing. Leaving the app or switching tabs for more than 5 seconds will cancel the session.
            </Text>
          </View>

          <Timer
            remainingSeconds={remainingSeconds}
            totalSeconds={totalSeconds}
            isRunning={true}
          />

          <TouchableOpacity
            style={[styles.giveUpButton, { backgroundColor: colors.errorContainer, borderRadius: shapes.xl }]}
            onPress={handleGiveUp}
            activeOpacity={0.8}
          >
            <Text style={[typography.labelLarge, { color: colors.onErrorContainer, fontWeight: '800' }]}>
              Cancel Session
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[typography.headlineMedium, { color: colors.onBackground, fontWeight: '800', textAlign: 'center' }]}>
            Focus Workspace
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: 8, textAlign: 'center', marginBottom: 24, lineHeight: 20 }]}>
            Select a study duration preset and start focusing. Finishing earns you coins and builds your streak!
          </Text>

          {/* Big Card containing Presets and Timer Preview */}
          <AppCard variant="elevated" elevation={2} padding={24} style={styles.presetCard}>
            <View style={styles.timerPreview}>
              <Timer
                remainingSeconds={selectedDuration * 60}
                totalSeconds={selectedDuration * 60}
                isRunning={false}
              />
            </View>

            <Text style={[typography.titleMedium, { color: colors.onSurface, marginBottom: 16, marginTop: 24, fontWeight: '700' }]}>
              Select Focus Duration
            </Text>

            <View style={styles.presetsGrid}>
              {PRESETS.map((duration) => (
                <StatusChip
                  key={duration}
                  label={formatMinutes(duration)}
                  selected={selectedDuration === duration}
                  onPress={() => setSelectedDuration(duration)}
                />
              ))}
            </View>
          </AppCard>

          <TouchableOpacity
            style={[
              styles.startButton,
              {
                backgroundColor: colors.primary,
                borderRadius: shapes.xl,
                ...getShadowStyle(colors.shadow, 0, 4, 0.15, 8, 4),
              },
            ]}
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <Text style={[typography.labelLarge, { color: colors.onPrimary, fontWeight: '800', fontSize: 16 }]}>
              Start Focus Block
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Styled custom modal overlay */}
      {alertState && (
        <View style={styles.modalOverlay}>
          <AppCard variant="elevated" elevation={4} padding={24} style={styles.modalCard}>
            <Text style={[typography.titleLarge, { color: alertState.type === 'success' ? colors.success : colors.error, fontWeight: '800', textAlign: 'center' }]}>
              {alertState.title}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.onSurface, marginTop: 14, textAlign: 'center', lineHeight: 22 }]}>
              {alertState.message}
            </Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: alertState.type === 'success' ? colors.success : colors.error,
                  borderRadius: shapes.l,
                },
              ]}
              onPress={() => setAlertState(null)}
              activeOpacity={0.8}
            >
              <Text style={[typography.labelLarge, { color: colors.onPrimary, fontWeight: '800' }]}>
                Acknowledge
              </Text>
            </TouchableOpacity>
          </AppCard>
        </View>
      )}
    </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  runningContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  runningHeader: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  presetCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  timerPreview: {
    alignItems: 'center',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
  },
  startButton: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  giveUpButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    width: '60%',
    maxWidth: 240,
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
  modalButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
