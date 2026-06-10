import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export function ProgressBar({
  progress,
  color = '#4CAF50',
  height = 8,
  showLabel = true,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percentage = Math.round(clampedProgress * 100);

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: color,
              height,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color }]}>{percentage}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
});
