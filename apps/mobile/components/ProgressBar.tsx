import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useM3Theme } from '../constants/Theme';

interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export function ProgressBar({
  progress,
  color,
  height = 8,
  showLabel = true,
}: ProgressBarProps) {
  const { colors, shapes, typography } = useM3Theme();

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percentage = Math.round(clampedProgress * 100);
  const themeColor = color || colors.primary;

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height, backgroundColor: colors.surfaceVariant, borderRadius: shapes.full }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: themeColor,
              height,
              borderRadius: shapes.full,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={[typography.labelMedium, styles.label, { color: themeColor }]}>
          {percentage}%
        </Text>
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
    overflow: 'hidden',
  },
  fill: {
    // animated or styled
  },
  label: {
    minWidth: 36,
    textAlign: 'right',
    fontWeight: '700',
  },
});
