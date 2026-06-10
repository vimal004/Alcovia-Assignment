import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { formatTime } from '../utils/helpers';

interface TimerProps {
  remainingSeconds: number;
  totalSeconds: number;
  isRunning: boolean;
}

export function Timer({ remainingSeconds, totalSeconds, isRunning }: TimerProps) {
  const progress = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;
  const size = 240;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const getColor = () => {
    if (!isRunning) return '#BDBDBD';
    if (remainingSeconds <= 60) return '#FF5722'; // Last minute - urgent
    if (remainingSeconds <= 300) return '#FF9800'; // Last 5 min - warning
    return '#4CAF50'; // Normal - green
  };

  const color = getColor();

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E8E8E8"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.timeContainer}>
        <Text style={[styles.time, { color }]}>{formatTime(remainingSeconds)}</Text>
        <Text style={styles.label}>
          {isRunning ? 'Remaining' : remainingSeconds === totalSeconds ? 'Ready' : 'Paused'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  timeContainer: {
    alignItems: 'center',
  },
  time: {
    fontSize: 48,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 4,
  },
});
