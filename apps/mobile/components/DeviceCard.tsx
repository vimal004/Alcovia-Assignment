import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppCard } from './AppCard';
import { useM3Theme } from '../constants/Theme';
import { InteractivePressable } from './InteractivePressable';

interface DeviceCardProps {
  clientId: 'client-A' | 'client-B' | 'client-C';
  activeClientId: 'client-A' | 'client-B' | 'client-C';
  isOnline: boolean;
  onSelect: (id: 'client-A' | 'client-B' | 'client-C') => void;
  onToggleOnline: () => void;
}

export function DeviceCard({
  clientId,
  activeClientId,
  isOnline,
  onSelect,
  onToggleOnline,
}: DeviceCardProps) {
  const { colors, shapes, typography } = useM3Theme();

  const isActive = clientId === activeClientId;
  const cardBorderColor = isActive ? colors.primary : colors.outlineVariant;
  const statusColor = isOnline ? colors.success : colors.error;
  const statusContainerColor = isOnline ? colors.successContainer : colors.errorContainer;

  return (
    <AppCard
      variant={isActive ? 'elevated' : 'outlined'}
      elevation={isActive ? 3 : 0}
      padding={16}
      style={[
        styles.card,
        {
          borderColor: cardBorderColor,
          borderWidth: isActive ? 2 : 1,
        },
      ]}
    >
      <InteractivePressable onPress={() => onSelect(clientId)} style={styles.content} scaleTo={0.98}>
        <View style={styles.headerRow}>
          <Text style={[typography.titleMedium, { color: colors.onSurface }]}>
            Device {clientId === 'client-A' ? 'A' : clientId === 'client-B' ? 'B' : 'C'}
          </Text>
          {isActive && (
            <View style={[styles.activePill, { backgroundColor: colors.primary }]}>
              <Text style={[typography.labelMedium, { color: colors.onPrimary }]}>Active</Text>
            </View>
          )}
        </View>

        <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
          Namespace: {clientId}
        </Text>

        <View style={styles.divider} />

        {isActive ? (
          <InteractivePressable
            style={[styles.statusToggle, { backgroundColor: statusContainerColor }]}
            onPress={onToggleOnline}
            scaleTo={0.93}
          >
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[typography.labelLarge, { color: statusColor, fontWeight: '700' }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </InteractivePressable>
        ) : (
          <View style={styles.inactivePlaceholder}>
            <Text style={[typography.bodySmall, { color: colors.outline }]}>
              Tap to switch to this device
            </Text>
          </View>
        )}
      </InteractivePressable>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  content: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#ECEFF1',
    marginVertical: 12,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inactivePlaceholder: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
