import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppCard } from './AppCard';
import { ProgressBar } from './ProgressBar';
import { useM3Theme } from '../constants/Theme';

interface ProgressCardProps {
  title: string;
  subtitle?: string;
  progress: number; // 0 to 1
  color?: string;
  icon?: string;
}

export function ProgressCard({
  title,
  subtitle,
  progress,
  color,
  icon,
}: ProgressCardProps) {
  const { colors, typography } = useM3Theme();
  const themeColor = color || colors.primary;

  return (
    <AppCard variant="elevated" elevation={1} padding={20} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[typography.titleLarge, { color: colors.onSurface }]}>{title}</Text>
          {subtitle && (
            <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
              {subtitle}
            </Text>
          )}
        </View>
        {icon && <Text style={styles.icon}>{icon}</Text>}
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={[typography.labelMedium, { color: colors.onSurfaceVariant }]}>
            Completion
          </Text>
          <Text style={[typography.titleLarge, { color: themeColor, fontWeight: '700' }]}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
        <ProgressBar progress={progress} color={themeColor} height={10} showLabel={false} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  icon: {
    fontSize: 24,
    marginLeft: 12,
  },
  progressSection: {
    gap: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
});
