import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { formatTime } from '../utils/helpers';
import { useM3Theme } from '../constants/Theme';

interface TimerProps {
  remainingSeconds: number;
  totalSeconds: number;
  isRunning: boolean;
}

export function Timer({ remainingSeconds, totalSeconds, isRunning }: TimerProps) {
  const { colors, typography } = useM3Theme();

  const progress = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;
  const size = 260;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const getTimerColors = () => {
    if (!isRunning) {
      return {
        stroke: colors.outlineVariant,
        gradientStart: colors.surfaceVariant,
        gradientEnd: colors.surfaceVariant,
      };
    }
    if (remainingSeconds <= 60) {
      return {
        stroke: colors.error,
        gradientStart: '#FF8A80',
        gradientEnd: colors.error,
      }; // Urgent - Last minute red
    }
    if (remainingSeconds <= 300) {
      return {
        stroke: colors.warning,
        gradientStart: '#FFD180',
        gradientEnd: colors.warning,
      }; // Warning - orange
    }
    // Default focus colors
    return {
      stroke: colors.primary,
      gradientStart: colors.primary,
      gradientEnd: colors.tertiary,
    };
  };

  const timerStyle = getTimerColors();

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={timerStyle.gradientStart} />
            <Stop offset="100%" stopColor={timerStyle.gradientEnd} />
          </LinearGradient>
        </Defs>
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceVariant}
          strokeWidth={strokeWidth - 2}
          fill="none"
        />
        {/* Glowing/Progress Ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.timeContainer}>
        <Text style={[typography.displayLarge, styles.time, { color: isRunning ? colors.onBackground : colors.outline }]}>
          {formatTime(remainingSeconds)}
        </Text>
        <Text style={[typography.labelMedium, styles.label, { color: isRunning ? colors.primary : colors.outline, fontWeight: '700' }]}>
          {isRunning ? 'STAY FOCUSED' : remainingSeconds === totalSeconds ? 'READY TO START' : 'PAUSED'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  timeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  label: {
    marginTop: 6,
    letterSpacing: 2,
  },
});
