import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useM3Theme } from '../constants/Theme';
import { AppCard } from './AppCard';

interface SyncIndicatorProps {
  isOnline: boolean;
  pendingCount: number;
}

export function SyncIndicator({ isOnline, pendingCount }: SyncIndicatorProps) {
  const { colors, shapes, typography } = useM3Theme();

  const statusBg = isOnline ? colors.successContainer : colors.errorContainer;
  const statusColor = isOnline ? colors.success : colors.error;

  return (
    <AppCard variant="filled" padding={12} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.statusSection}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[typography.titleSmall, { color: colors.onSurface }]}>
            {isOnline ? 'Connected' : 'Offline Mode'}
          </Text>
        </View>

        <View style={[styles.badge, { backgroundColor: pendingCount > 0 ? colors.tertiaryContainer : colors.surfaceVariant }]}>
          <Text style={[typography.labelMedium, { color: pendingCount > 0 ? colors.onTertiaryContainer : colors.onSurfaceVariant, fontWeight: '700' }]}>
            {pendingCount === 0 ? 'Synced' : `${pendingCount} Pending`}
          </Text>
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
