import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { Timer } from '../../components/Timer';
import { useFocusStore } from '../../stores/focusStore';
import { formatMinutes } from '../../utils/helpers';

const PRESETS = [1, 25, 45, 60, 90, 120]; // 1 min for easy testing!

export default function FocusScreen() {
  const { startSession, completeSession, failSession, getActiveSession } = useFocusStore();

  const [selectedDuration, setSelectedDuration] = useState(25);
  const [runningSessionId, setRunningSessionId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);
  const GRACE_PERIOD_MS = 5000; // 5 seconds

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
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSuccess();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [runningSessionId, remainingSeconds]);

  // App state listener (grace period for backgrounding)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (!runningSessionId) return;

      if (
        appState.current === 'active' &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        // App went to background, record timestamp
        backgroundTimeRef.current = Date.now();
      } else if (
        (appState.current === 'inactive' || appState.current === 'background') &&
        nextAppState === 'active'
      ) {
        // App returned to foreground, check if grace period exceeded
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
      alert(`🎉 Session completed successfully! You earned ${selectedDuration} coins.`);
      resetTimerState();
    }
  };

  const handleFailure = (reason: 'give_up' | 'app_switch') => {
    if (runningSessionId) {
      failSession(runningSessionId, reason);
      const msg =
        reason === 'give_up'
          ? 'You gave up this session.'
          : 'Session failed: You left the app for more than 5 seconds.';
      alert(`⚠️ ${msg}`);
      resetTimerState();
    }
  };

  const resetTimerState = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunningSessionId(null);
    setRemainingSeconds(0);
    setTotalSeconds(0);
  };

  if (runningSessionId) {
    return (
      <View style={styles.container}>
        <Text style={styles.runningTitle}>Focusing...</Text>
        <Timer
          remainingSeconds={remainingSeconds}
          totalSeconds={totalSeconds}
          isRunning={true}
        />
        <TouchableOpacity style={styles.giveUpButton} onPress={handleGiveUp}>
          <Text style={styles.giveUpButtonText}>Give Up 🏳️</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Start a Focus Session</Text>
      <Text style={styles.subtitle}>Choose your target focus duration:</Text>

      <View style={styles.presetsGrid}>
        {PRESETS.map((duration) => (
          <TouchableOpacity
            key={duration}
            style={[
              styles.presetCard,
              selectedDuration === duration && styles.presetCardActive,
            ]}
            onPress={() => setSelectedDuration(duration)}
          >
            <Text
              style={[
                styles.presetText,
                selectedDuration === duration && styles.presetTextActive,
              ]}
            >
              {formatMinutes(duration)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.startButton} onPress={handleStart}>
        <Text style={styles.startButtonText}>Start Session 🚀</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#78909C',
    marginBottom: 24,
    textAlign: 'center',
  },
  runningTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 32,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    maxWidth: 320,
    marginBottom: 40,
  },
  presetCard: {
    width: 80,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  presetCardActive: {
    backgroundColor: '#1A237E',
    borderColor: '#1A237E',
  },
  presetText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#37474F',
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  startButton: {
    backgroundColor: '#1A237E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    shadowColor: '#1A237E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  giveUpButton: {
    backgroundColor: '#FF8A80',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 40,
  },
  giveUpButtonText: {
    color: '#D50000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
